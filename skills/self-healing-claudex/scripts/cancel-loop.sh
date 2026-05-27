#!/usr/bin/env bash
# cancel-loop.sh — force the active loop to phase=cancelled.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./state-helpers.sh
source "${SCRIPT_DIR}/state-helpers.sh"

LATEST=$(shc_find_active_loop) || {
  echo "no active loop"
  exit 0
}

REVIEW_ID=$(basename "$LATEST" .state)
PHASE=$(shc_state_read_field "$LATEST" phase)

case "$PHASE" in
  done|cancelled|errored)
    echo "loop ${REVIEW_ID} already in terminal phase ($PHASE), nothing to cancel"
    exit 0
    ;;
esac

# Force-set phase regardless of current value (cancel is privileged).
shc_state_set_field "$LATEST" phase cancelled
rm -f "${SHC_STATE_DIR}/${REVIEW_ID}.lock"
shc_log "${REVIEW_ID} cancelled (was: ${PHASE})"
echo "loop ${REVIEW_ID} cancelled (was: ${PHASE}). State file kept for audit at ${LATEST}."
