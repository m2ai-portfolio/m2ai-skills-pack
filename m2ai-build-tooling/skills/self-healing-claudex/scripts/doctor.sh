#!/usr/bin/env bash
# doctor.sh — health check. Exits 1 on any required check failure.

set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

GREEN=$'\033[32m'
RED=$'\033[31m'
YELLOW=$'\033[33m'
RESET=$'\033[0m'

PASS=0
FAIL=0
WARN=0

ok()   { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$*"; PASS=$((PASS + 1)); }
fail() { printf '  %s✗%s %s\n' "$RED" "$RESET" "$*"; FAIL=$((FAIL + 1)); }
warn() { printf '  %s!%s %s\n' "$YELLOW" "$RESET" "$*"; WARN=$((WARN + 1)); }

section() { printf '\n%s\n' "$*"; }

section "Shell"
if command -v bash >/dev/null 2>&1; then
  ok "bash present ($(bash --version | head -1))"
else
  fail "bash not found"
fi
BASH_MAJOR="${BASH_VERSINFO[0]}"
if [[ "$BASH_MAJOR" -ge 4 ]]; then
  ok "bash 4+ ($BASH_MAJOR)"
else
  warn "bash $BASH_MAJOR (4+ recommended)"
fi

section "Codex CLI"
if command -v codex >/dev/null 2>&1; then
  ok "codex in PATH ($(command -v codex))"
  ok "version: $(codex --version 2>/dev/null | head -1)"
  if codex login status 2>&1 | grep -q "Logged in"; then
    ok "codex authed"
  else
    fail "codex not authed (run: source ~/.env.shared && printenv OPENAI_API_KEY | codex login --with-api-key)"
  fi
else
  fail "codex CLI not found"
fi

section "Skill files"
EXPECTED=(
  "${SKILL_ROOT}/SKILL.md"
  "${SKILL_ROOT}/SPEC.md"
  "${SKILL_ROOT}/scripts/state-helpers.sh"
  "${SKILL_ROOT}/scripts/personas.sh"
  "${SKILL_ROOT}/scripts/start-loop.sh"
  "${SKILL_ROOT}/scripts/run-codex-review.sh"
  "${SKILL_ROOT}/scripts/mark-done.sh"
  "${SKILL_ROOT}/scripts/summarize.sh"
  "${SKILL_ROOT}/scripts/status.sh"
  "${SKILL_ROOT}/scripts/doctor.sh"
  "${SKILL_ROOT}/scripts/cancel-loop.sh"
)
MISSING=()
for f in "${EXPECTED[@]}"; do
  [[ -f "$f" ]] || MISSING+=("$f")
done
if [[ ${#MISSING[@]} -eq 0 ]]; then
  ok "all ${#EXPECTED[@]} skill files present"
else
  for m in "${MISSING[@]}"; do fail "missing: $m"; done
fi

section "Helpers smoke"
# shellcheck source=./state-helpers.sh
if source "${SKILL_ROOT}/scripts/state-helpers.sh" 2>/dev/null; then
  ok "state-helpers.sh sources cleanly"
else
  fail "state-helpers.sh failed to source"
fi
# shellcheck source=./personas.sh
if source "${SKILL_ROOT}/scripts/personas.sh" 2>/dev/null; then
  ok "personas.sh sources cleanly"
  P1=$(shc_persona_for_round 1)
  P2=$(shc_persona_for_round 2)
  P3=$(shc_persona_for_round 3)
  if [[ -n "$P1" && -n "$P2" && -n "$P3" && "$P1" != "$P2" && "$P2" != "$P3" ]]; then
    ok "round 1/2/3 personas non-empty and distinct"
  else
    fail "personas missing or duplicated across rounds"
  fi
else
  fail "personas.sh failed to source"
fi

section "Loop hygiene"
if [[ -d ".self-healing-claudex" ]]; then
  COUNT=$(find .self-healing-claudex -maxdepth 1 -name "*.state" 2>/dev/null | wc -l)
  if [[ "$COUNT" -eq 0 ]]; then
    ok "no loops on disk"
  else
    warn "$COUNT loop(s) on disk; run /self-healing-claudex:status for details"
  fi
else
  ok "state directory does not exist (no prior runs)"
fi

printf '\nResult: %s%d passed%s, %s%d failed%s, %s%d warnings%s\n' \
  "$GREEN" "$PASS" "$RESET" "$RED" "$FAIL" "$RESET" "$YELLOW" "$WARN" "$RESET"

[[ "$FAIL" -eq 0 ]]
