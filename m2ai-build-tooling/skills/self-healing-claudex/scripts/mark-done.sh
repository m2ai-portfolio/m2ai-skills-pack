#!/usr/bin/env bash
# mark-done.sh — sets decision_signal=no-material-findings on a review.
#
# Called by the orchestrator when Codex's findings file says "No substantive findings."
# Does NOT set phase=done. The next orchestration step transitions reviewing->summarizing.
#
# Usage: mark-done.sh <review_id>

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./state-helpers.sh
source "${SCRIPT_DIR}/state-helpers.sh"

REVIEW_ID="$1"
if [[ -z "$REVIEW_ID" ]]; then
  echo "ERROR: usage: mark-done.sh <review_id>" >&2
  exit 2
fi

if ! shc_validate_review_id "$REVIEW_ID"; then
  echo "ERROR: invalid review_id format: $REVIEW_ID" >&2
  exit 2
fi

STATE_FILE="${SHC_STATE_DIR}/${REVIEW_ID}.state"
if [[ ! -f "$STATE_FILE" ]]; then
  echo "ERROR: state file not found: $STATE_FILE" >&2
  exit 3
fi

shc_state_set_field "$STATE_FILE" decision_signal no-material-findings
shc_log "${REVIEW_ID} marked no-material-findings"
echo "Loop ${REVIEW_ID} flagged as converged. Orchestrator will surface the summary on next step."
