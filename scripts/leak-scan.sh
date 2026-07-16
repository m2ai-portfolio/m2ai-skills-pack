#!/usr/bin/env bash
# Scan TRACKED files under skills/ for personal / internal / infrastructure references
# before this pack is published.
#
#   bash scripts/leak-scan.sh          # exit 0 = clean, 1 = leaks found
#
# CRITICAL: do NOT add -I to these git greps. -I skips binary files, and the leak that
# triggered this gate (a tracked .pyc with /home/<user>/... compiled into it) is invisible
# to `git grep -I` while being plainly visible to `git grep`. A scan that reports clean
# because its pattern is blind is worse than no scan.
#
# Scope: tracked files under skills/ ONLY. Author attribution in package metadata
# (.claude-plugin/marketplace.json) is legitimate for an MIT repo and is deliberately
# NOT scanned here.

set -uo pipefail
cd "$(dirname "$0")/.."

status=0

# scan <label> <pattern> [nocase]
#   Case sensitivity is per-pattern on purpose. Blanket -i produced a false positive:
#   the macOS home-path pattern /Users/<name> matched the REST endpoint "/users/me" in a
#   demo fixture. A pattern that flags legitimate content erodes the gate just as surely
#   as one that misses a leak, so /Users/ stays case-sensitive while names do not.
# scan <label> <pattern> [nocase|perl] [allow_path_regex]
scan() {
  local label="$1" pattern="$2" mode="${3:-}" allow="${4:-}"
  local hits flags=(-n)
  case "$mode" in
    nocase) flags+=(-E -i) ;;
    perl)   flags+=(-P) ;;   # -P for negative lookahead (placeholder allowlist)
    *)      flags+=(-E) ;;
  esac
  # no -I: binary files must be caught.
  hits=$(git grep "${flags[@]}" "$pattern" -- skills/ 2>/dev/null || true)
  if [ -n "$allow" ] && [ -n "$hits" ]; then
    hits=$(printf '%s\n' "$hits" | grep -v -E "^$allow" || true)
  fi
  if [ -n "$hits" ]; then
    echo "LEAK [$label]"
    echo "$hits" | cut -c1-200 | sed 's/^/    /'
    status=1
  fi
}

# C-27 / C-28: personal names, any case, possessive with ASCII or smart apostrophe (U+2019)
scan "personal-name"    "matthew|snow2|matthew(’|')s" nocase
# C-29: home paths and the bare username token (case-sensitive: see note above).
# `/home/user` and `/home/<user>` are the sanitized PLACEHOLDERS this pack uses on purpose and are
# allowed; any other concrete username under /home is a real leak. Verified 2026-07-16: the only
# /home/ match in the whole pack is /home/user.
scan "home-path-unix"   "/home/(?!user\b|<)[a-z0-9._-]+|/Users/(?!<)[A-Za-z0-9._-]+" perl
scan "home-path-user"   "apexaipc" nocase
# C-31: internal agent / product / project names
scan "internal-name"    "claudeclaw|ccos|ravage|soundwave|starscream|teletraan|metroplex|sky-lynx|ideaforge|st.metro|perceptor|bunker" nocase
# C-32: private network addresses and personal device names
scan "lan-and-device"   "10\.0\.0\.[0-9]+|192\.168\.[0-9]+\.[0-9]+|surface tablet|probook|alienpc|gaming-pc" nocase
# credentials that should never ship
scan "credential"       "sk-[a-zA-Z0-9]{16,}|ghp_[a-zA-Z0-9]{16,}|AIza[a-zA-Z0-9_-]{20,}|xox[baprs]-"
# personal email. The silver-platter examples are a SYNTHETIC demo fixture (fictional personas
# "Marco"/slabhaus); its jrh@gmail.com is invented sample data, not anyone's real inbox --
# verified 2026-07-16. It is allowlisted by PATH so the check stays live for every other file
# rather than being deleted outright. The owner's real address is caught by "personal-name"
# (snow2) independently of this scan.
ALLOW_EMAIL_PATHS='skills/silver-platter/examples/'
scan "email"            "[a-z0-9._%+-]+@(gmail|outlook|hotmail|yahoo)\.com" nocase "$ALLOW_EMAIL_PATHS"

if [ "$status" -eq 0 ]; then
  echo "OK: no leaks in tracked files under skills/ ($(git ls-files skills/ | wc -l) files scanned)"
else
  echo ""
  echo "Leaks found. This pack is not safe to publish."
fi
exit "$status"
