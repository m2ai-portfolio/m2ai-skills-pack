#!/usr/bin/env bash
# start-loop.sh — initialize a new self-healing-claudex loop.
#
# Usage: start-loop.sh [--rounds N] [--target-dir PATH] <topic-string>
#
# Behavior:
#   - Sweeps stale state files first.
#   - Refuses if any non-terminal loop already exists.
#   - Generates review_id, writes state file atomically, writes lockfile.
#   - Prints initial "next step" instructions to stdout.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./state-helpers.sh
source "${SCRIPT_DIR}/state-helpers.sh"

ROUNDS="${SHC_MAX_ROUNDS:-3}"
TARGET_DIR="."

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rounds)
      ROUNDS="$2"
      if ! [[ "$ROUNDS" =~ ^[1-9][0-9]*$ ]]; then
        echo "ERROR: --rounds must be a positive integer (got '$ROUNDS')" >&2
        exit 2
      fi
      shift 2
      ;;
    --target-dir)
      TARGET_DIR="$2"
      shift 2
      ;;
    --*)
      echo "ERROR: unknown flag $1" >&2
      exit 2
      ;;
    *)
      break
      ;;
  esac
done

TOPIC="$*"
if [[ -z "$TOPIC" ]]; then
  echo "ERROR: missing topic. Usage: start-loop.sh [--rounds N] [--target-dir PATH] <topic-string>" >&2
  exit 2
fi
TOPIC_SINGLE_LINE=$(echo "$TOPIC" | tr '\n' ' ' | sed 's/  */ /g')

mkdir -p "$SHC_STATE_DIR"

REMOVED=$(shc_sweep_stale)
if [[ "$REMOVED" -gt 0 ]]; then
  shc_log "swept $REMOVED stale loop(s)"
fi

if ! CONFLICT=$(shc_check_no_active_loops 2>/dev/null); then
  echo "ERROR: an active loop already exists: ${CONFLICT}" >&2
  echo "Run /self-healing-claudex:status to inspect or /self-healing-claudex:cancel to terminate." >&2
  exit 4
fi

REVIEW_ID=$(shc_new_review_id)
STATE_FILE="${SHC_STATE_DIR}/${REVIEW_ID}.state"
LOCK_FILE="${SHC_STATE_DIR}/${REVIEW_ID}.lock"
NOW_ISO=$(shc_iso8601_utc)
NOW_EPOCH=$(shc_epoch)
REPO_ROOT=$(pwd)

shc_state_write "$STATE_FILE" "phase: planning
round: 1
max_rounds: ${ROUNDS}
builder_retries_used: 0
review_id: ${REVIEW_ID}
repo_root: ${REPO_ROOT}
target_dir: ${TARGET_DIR}
topic: \"${TOPIC_SINGLE_LINE}\"
started_at: ${NOW_ISO}
started_at_epoch: ${NOW_EPOCH}
last_updated_at: ${NOW_ISO}
decision_signal: none
"

shc_lock_write "$LOCK_FILE"
mkdir -p "${SHC_STATE_DIR}/${REVIEW_ID}"

shc_log "loop ${REVIEW_ID} started; topic=${TOPIC_SINGLE_LINE}; rounds=${ROUNDS}; target=${TARGET_DIR}"

cat <<EOF
SHC_REVIEW_ID=${REVIEW_ID}
SHC_STATE_FILE=${STATE_FILE}
SHC_TARGET_DIR=${TARGET_DIR}
SHC_MAX_ROUNDS=${ROUNDS}
SHC_TOPIC=${TOPIC_SINGLE_LINE}
EOF
