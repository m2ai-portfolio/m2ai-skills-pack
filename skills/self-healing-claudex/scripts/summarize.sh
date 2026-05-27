#!/usr/bin/env bash
# summarize.sh — build a visible landing summary for the orchestrator to print.
#
# Usage: summarize.sh <review_id>
#
# Output: a markdown block with rounds table (severity counts per round), elapsed
# time, decision_signal interpretation. Caller prints to chat.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./state-helpers.sh
source "${SCRIPT_DIR}/state-helpers.sh"
# shellcheck source=./personas.sh
source "${SCRIPT_DIR}/personas.sh"

REVIEW_ID="$1"
if [[ -z "$REVIEW_ID" ]]; then
  echo "ERROR: usage: summarize.sh <review_id>" >&2
  exit 2
fi

STATE_FILE="${SHC_STATE_DIR}/${REVIEW_ID}.state"
if [[ ! -f "$STATE_FILE" ]]; then
  echo "ERROR: state file not found: $STATE_FILE" >&2
  exit 3
fi

ROUND=$(shc_state_read_field "$STATE_FILE" round)
MAX_ROUNDS=$(shc_state_read_field "$STATE_FILE" max_rounds)
TOPIC=$(shc_state_read_field "$STATE_FILE" topic)
TARGET=$(shc_state_read_field "$STATE_FILE" target_dir)
SIGNAL=$(shc_state_read_field "$STATE_FILE" decision_signal)
STARTED_EPOCH=$(shc_state_read_field "$STATE_FILE" started_at_epoch)
NOW_EPOCH=$(shc_epoch)
ELAPSED=$((NOW_EPOCH - STARTED_EPOCH))
ELAPSED_MIN=$((ELAPSED / 60))
ELAPSED_SEC=$((ELAPSED % 60))

# Final round count: when no-material-findings, ROUND is the round that converged.
# When max-reached, ROUND equals MAX_ROUNDS.
FINAL_ROUND="$ROUND"

# Build rounds table.
ROUNDS_TABLE=""
for r in $(seq 1 "$FINAL_ROUND"); do
  FINDINGS_FILE="${SHC_STATE_DIR}/${REVIEW_ID}/findings-round-${r}.md"
  LABEL=$(shc_persona_label_for_round "$r")
  if [[ -f "$FINDINGS_FILE" ]]; then
    COUNTS=$(shc_findings_severity_counts "$FINDINGS_FILE")
    ROUNDS_TABLE="${ROUNDS_TABLE}- Round ${r} (${LABEL}): ${COUNTS}"$'\n'
  else
    ROUNDS_TABLE="${ROUNDS_TABLE}- Round ${r} (${LABEL}): no findings file"$'\n'
  fi
done

case "$SIGNAL" in
  no-material-findings)
    HEADER="### self-healing-claudex loop complete ✓"
    VERDICT="Codex round ${FINAL_ROUND} produced no substantive findings."
    ;;
  max-reached)
    HEADER="### self-healing-claudex stopped at max rounds (round ${FINAL_ROUND} of ${MAX_ROUNDS})"
    VERDICT="Codex still has open findings after ${FINAL_ROUND} rounds. Three options:
1. Revise manually based on findings-round-${FINAL_ROUND}.md
2. Re-run with --rounds N for more iterations
3. Accept as known-incomplete"
    ;;
  *)
    HEADER="### self-healing-claudex loop ended"
    VERDICT="Decision signal: ${SIGNAL}"
    ;;
esac

cat <<EOF
${HEADER}

**Topic:** ${TOPIC}
**Target:** ${TARGET}
**Rounds run:** ${FINAL_ROUND} of ${MAX_ROUNDS}
**Elapsed:** ${ELAPSED_MIN}m ${ELAPSED_SEC}s

**Findings by round:**

${ROUNDS_TABLE}
${VERDICT}

Findings files: \`${SHC_STATE_DIR}/${REVIEW_ID}/findings-round-*.md\`
Transcripts: \`${SHC_STATE_DIR}/${REVIEW_ID}/codex-stdout-*.log\`
EOF
