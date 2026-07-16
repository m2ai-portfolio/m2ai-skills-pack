#!/usr/bin/env bash
# status.sh — print state of the most-recent loop. Read-only.

set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./state-helpers.sh
source "${SCRIPT_DIR}/state-helpers.sh"
# shellcheck source=./personas.sh
source "${SCRIPT_DIR}/personas.sh"

LATEST=$(shc_find_active_loop)
if [[ -z "$LATEST" ]]; then
  echo "no loops in ${SHC_STATE_DIR}"
  exit 0
fi

REVIEW_ID=$(basename "$LATEST" .state)
PHASE=$(shc_state_read_field "$LATEST" phase)
ROUND=$(shc_state_read_field "$LATEST" round)
MAX_ROUNDS=$(shc_state_read_field "$LATEST" max_rounds)
TOPIC=$(shc_state_read_field "$LATEST" topic)
TARGET=$(shc_state_read_field "$LATEST" target_dir)
SIGNAL=$(shc_state_read_field "$LATEST" decision_signal)
STARTED=$(shc_state_read_field "$LATEST" started_at)
STARTED_EPOCH=$(shc_state_read_field "$LATEST" started_at_epoch)
NOW_EPOCH=$(shc_epoch)
ELAPSED=$((NOW_EPOCH - STARTED_EPOCH))
ELAPSED_MIN=$((ELAPSED / 60))
ELAPSED_SEC=$((ELAPSED % 60))

# Cap displayed round at max_rounds (the internal counter may overshoot).
DISPLAY_ROUND="$ROUND"
if [[ "$DISPLAY_ROUND" -gt "$MAX_ROUNDS" ]]; then
  DISPLAY_ROUND="$MAX_ROUNDS"
fi

case "$PHASE" in
  done) ACTIVITY="complete" ;;
  cancelled) ACTIVITY="cancelled" ;;
  errored) ACTIVITY="errored" ;;
  *) ACTIVITY="active" ;;
esac

cat <<EOF
review_id:       ${REVIEW_ID}
phase:           ${PHASE}
activity:        ${ACTIVITY}
round:           ${DISPLAY_ROUND} of ${MAX_ROUNDS}
topic:           ${TOPIC}
target_dir:      ${TARGET}
started_at:      ${STARTED}
elapsed:         ${ELAPSED_MIN}m ${ELAPSED_SEC}s
decision_signal: ${SIGNAL}

EOF

# Print findings counts per round, if any.
SUBDIR="${SHC_STATE_DIR}/${REVIEW_ID}"
if [[ -d "$SUBDIR" ]]; then
  for f in "$SUBDIR"/findings-round-*.md; do
    [[ -f "$f" ]] || continue
    R=$(basename "$f" | sed -E 's/findings-round-([0-9]+)\.md/\1/')
    COUNTS=$(shc_findings_severity_counts "$f")
    LABEL=$(shc_persona_label_for_round "$R")
    printf 'round %s (%s): %s\n' "$R" "$LABEL" "$COUNTS"
  done
fi
