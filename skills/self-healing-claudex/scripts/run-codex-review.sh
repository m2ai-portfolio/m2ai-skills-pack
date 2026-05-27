#!/usr/bin/env bash
# run-codex-review.sh — invoke `codex exec` for one adversarial review round.
#
# Usage: run-codex-review.sh <review_id> <round> <target_dir> <topic>
#
# Behavior:
#   - Sources personas.sh and prepends the round's persona stanza.
#   - Builds a prompt that asks Codex to review the implementation in <target_dir>
#     and write findings to a strict format at .self-healing-claudex/<id>/findings-round-N.md.
#   - Pipes the prompt to `codex exec --dangerously-bypass-approvals-and-sandbox -`
#     via a single-quoted heredoc to prevent shell expansion of prompt content.
#   - Writes the full transcript to .self-healing-claudex/<id>/codex-stdout-N.log.
#   - Returns 0 on success, non-zero on Codex failure.
#
# IMPORTANT: This script does NOT mutate the state file. The caller (orchestrator
# in SKILL.md) reads findings-round-N.md, decides next phase, and applies CAS.

set -e

REVIEW_ID="$1"
ROUND="$2"
TARGET_DIR="$3"
TOPIC="$4"

if [[ -z "$REVIEW_ID" || -z "$ROUND" || -z "$TARGET_DIR" || -z "$TOPIC" ]]; then
  echo "ERROR: usage: run-codex-review.sh <review_id> <round> <target_dir> <topic>" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHC_STATE_DIR="${SHC_STATE_DIR:-.self-healing-claudex}"

# shellcheck source=./state-helpers.sh
source "${SCRIPT_DIR}/state-helpers.sh"
# shellcheck source=./personas.sh
source "${SCRIPT_DIR}/personas.sh"

REVIEW_SUBDIR="${SHC_STATE_DIR}/${REVIEW_ID}"
FINDINGS_PATH="${REVIEW_SUBDIR}/findings-round-${ROUND}.md"
TRANSCRIPT_PATH="${REVIEW_SUBDIR}/codex-stdout-${ROUND}.log"

mkdir -p "$REVIEW_SUBDIR"

PERSONA_LABEL=$(shc_persona_label_for_round "$ROUND")
PERSONA_STANZA=$(shc_persona_for_round "$ROUND")

shc_log "round ${ROUND} (${PERSONA_LABEL}) starting; target=${TARGET_DIR}"

# Build prompt. Use a process substitution + cat to keep prompt content out of
# shell-interpolation territory while still allowing controlled variable insertion.
PROMPT_FILE=$(mktemp)
trap 'rm -f "$PROMPT_FILE"' EXIT

{
  echo "$PERSONA_STANZA"
  echo
  echo "## Topic"
  echo "$TOPIC"
  echo
  echo "## What to review"
  echo "Review the implementation under: ${TARGET_DIR}"
  echo "Read every file in that directory recursively. Pay attention to recent"
  echo "changes if a git history is present (\`git log --oneline -20\` and \`git diff HEAD~5\`)."
  echo
  echo "## Spec-claim contract (truth source)"
  echo "Before reviewing the implementation, read:"
  echo "  ${REVIEW_SUBDIR}/spec-claims.md  (the Planner's extracted claims;"
  echo "                                    each row is one verifiable promise)"
  echo "  ${REVIEW_SUBDIR}/PLAN.md         (test contract; every test cites a claim id)"
  echo "If either file is missing, that is itself a HIGH finding — the Planner"
  echo "skipped Stage 2A or 2B."
  echo
  echo "Treat spec-claims.md as the truth contract, not the implementation. A test"
  echo "that passes against the implementation but does not faithfully probe the"
  echo "spec claim it cites is fake coverage."
  echo
  if [[ "$ROUND" -gt 1 ]]; then
    PREV_ROUND=$((ROUND - 1))
    PREV_FINDINGS="${REVIEW_SUBDIR}/findings-round-${PREV_ROUND}.md"
    if [[ -f "$PREV_FINDINGS" ]]; then
      echo "## Previous round findings"
      echo "Round ${PREV_ROUND} produced the findings in: ${PREV_FINDINGS}"
      echo "Read that file. For each finding the Builder claims to have addressed,"
      echo "verify the fix actually closes the failure mode. Do not re-raise items"
      echo "that have been adequately fixed."
      echo
    fi
  fi
  echo "## Spec-claim coverage check (MANDATORY before listing findings)"
  echo "Before writing any severity-bucketed findings, perform this coverage check"
  echo "and write the result into the findings file as a dedicated section:"
  echo
  echo "1. For every row in spec-claims.md, confirm PLAN.md cites that claim id"
  echo "   at least once. List uncovered claim ids."
  echo "2. For every test in PLAN.md, confirm it cites a claim id that actually"
  echo "   exists in spec-claims.md. List orphan tests."
  echo "3. For each [SAFETY] and [FAILURE] claim, sanity-check the cited test:"
  echo "   does the test input actually probe the failure mode the claim"
  echo "   describes, or is it the canonical/happy-path form? If a [USER-VOICE]"
  echo "   claim is cited only by tests that use literal canonical strings, the"
  echo "   coverage is fake."
  echo "4. The Planner may declare a claim out-of-test-scope ONLY if the row in"
  echo "   spec-claims.md is explicitly marked [OUT-OF-SCOPE]. Anything else"
  echo "   uncovered is a Planner failure, not a Builder failure."
  echo
  echo "If ALL spec claims have non-tautological coverage and there are no orphan"
  echo "tests, the Coverage gaps section in the findings file MUST contain exactly"
  echo "the word \"None.\" on its own line. If any gap exists, list each gap as a"
  echo "bullet under the Coverage gaps section."
  echo
  echo "## Output requirements"
  echo "1. Produce your full reasoning in stdout (this transcript will be saved)."
  echo "2. CRITICAL: After your full analysis, write a clean summary to the file:"
  echo "      ${FINDINGS_PATH}"
  echo "   Use this exact format:"
  echo "      # Round ${ROUND} findings"
  echo
  echo "      ## Coverage gaps"
  echo "      None.    # or a bulleted list of gaps (uncovered claim id, orphan test, fake coverage)"
  echo
  echo "      ## High"
  echo "      - <description> (<recommendation>)"
  echo "      - ..."
  echo "      ## Medium"
  echo "      - ..."
  echo "      ## Low"
  echo "      - ..."
  echo "3. If there are no material findings AND no coverage gaps on this round,"
  echo "   the file MUST contain exactly:"
  echo "      # Round ${ROUND} findings"
  echo
  echo "      ## Coverage gaps"
  echo "      None."
  echo
  echo "      No substantive findings."
  echo "4. Write the file BEFORE exiting. The orchestrator reads it to decide"
  echo "   whether to advance the loop. The Coverage gaps section is load-bearing —"
  echo "   any non-\"None.\" content there routes the build to errored (because"
  echo "   the test contract is immutable post-planning and Builder cannot fix"
  echo "   coverage problems)."
  echo
  echo "## Output discipline"
  echo "- Only describe real failure modes, not stylistic objections."
  echo "- One bullet per finding. Keep each bullet under 200 characters."
  echo "- Severity discipline: HIGH = data loss / security / wrong correctness."
  echo "  MEDIUM = degraded behavior under realistic conditions. LOW = minor."
  echo "- Coverage gaps are NOT severity-tiered; they live in their own section"
  echo "  because their remediation path differs (Planner re-run vs Builder fix)."
} > "$PROMPT_FILE"

# Use single-quoted heredoc when piping to codex to prevent shell expansion of
# any unintended content. Codex reads from stdin when prompt arg is `-`.
CODEX_FLAGS=(--dangerously-bypass-approvals-and-sandbox)
if [[ -n "${SHC_CODEX_MODEL:-}" ]]; then
  CODEX_FLAGS+=(--model "$SHC_CODEX_MODEL")
fi

set +e
codex exec "${CODEX_FLAGS[@]}" - < "$PROMPT_FILE" > "$TRANSCRIPT_PATH" 2>&1
CODEX_EXIT=$?
set -e

if [[ $CODEX_EXIT -ne 0 ]]; then
  shc_log "round ${ROUND} codex exec failed with exit ${CODEX_EXIT}; see ${TRANSCRIPT_PATH}"
  echo "ERROR: codex exec returned ${CODEX_EXIT}; transcript at ${TRANSCRIPT_PATH}" >&2
  exit "$CODEX_EXIT"
fi

if [[ ! -f "$FINDINGS_PATH" ]]; then
  shc_log "round ${ROUND} codex did not write findings file at ${FINDINGS_PATH}"
  echo "ERROR: Codex did not write the findings file at ${FINDINGS_PATH}." >&2
  echo "Transcript: ${TRANSCRIPT_PATH}" >&2
  exit 3
fi

COUNTS=$(shc_findings_severity_counts "$FINDINGS_PATH")
shc_log "round ${ROUND} done; ${COUNTS}; findings=${FINDINGS_PATH}"

# Echo the location to stdout so the orchestrator can capture it.
echo "FINDINGS_FILE=${FINDINGS_PATH}"
echo "TRANSCRIPT_FILE=${TRANSCRIPT_PATH}"
echo "COUNTS=${COUNTS}"
