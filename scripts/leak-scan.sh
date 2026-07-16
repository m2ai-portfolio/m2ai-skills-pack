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
  local hits flags=(-n) rc
  case "$mode" in
    nocase) flags+=(-E -i) ;;
    perl)   flags+=(-P) ;;   # -P for negative lookahead (placeholder allowlist)
    *)      flags+=(-E) ;;
  esac
  # no -I: binary files must be caught.
  hits=$(git grep "${flags[@]}" "$pattern" -- skills/ 2>&1); rc=$?
  # git grep exit codes: 0 = matched, 1 = no match, >1 = ERROR (bad regex, PCRE not compiled in,
  # etc). The old `2>/dev/null || true` collapsed ALL of these to "clean" -- so a build of git
  # without -P support would silently disable the home-path scan and this gate would report a
  # green light while detecting nothing. That is the C-22 false-pass class: absence of a hit must
  # mean absence of a leak, not absence of a working scan. An erroring scan fails CLOSED.
  if [ "$rc" -gt 1 ]; then
    echo "LEAK [$label] SCAN ERROR (git grep exit $rc) -- refusing to report clean:"
    printf '%s\n' "$hits" | head -3 | sed 's/^/    /'
    status=1
    return
  fi
  [ "$rc" -eq 0 ] || hits=""   # rc==1 means no match; discard any stderr noise
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
# C-29: CONCRETE home paths. `/home/user` and `/home/<user>` are the sanitized PLACEHOLDERS this
# pack uses on purpose and are allowed (verified 2026-07-16: in active use in context-fork-guide,
# model-audit, viral-shorts-pipeline); any OTHER concrete username under /home is a real leak.
# C-44: the allowlist is exact-token (`user\b`), not a prefix -- /home/username123 still flags.
#
# NOT SCANNED, deliberately (C-39): `~/` and `$HOME` are the CORRECT, portable, already-sanitized
# way to reference a home dir -- they are this pack's sanctioned idiom, not a leak. `~/` appears in
# 58 tracked files as legitimate content (~/vault, ~/.claude/skills/...); `$HOME` appears 0 times.
# Adding them as patterns would flag 58 files of correct content and make this gate unusable.
# This is a recorded decision, not an oversight. tests/gate0.test.sh T39 enforces it.
scan "home-path-unix"   "/home/(?!user\b|<)[a-z0-9._-]+|/Users/(?!<)[A-Za-z0-9._-]+" perl

# C-37: the BARE username token. NEVER hardcode a concrete username here -- this file ships in a
# PUBLIC repo, so a literal username would make the leak detector itself the leak it exists to
# remove. Derive it at runtime instead; this also future-proofs the scan for any other runner.
# C-37a: the home-path-unix scan ABOVE is already generic and catches /home/<runner> for ANY
# runner. This adds only the BARE-token case, which an absolute-path pattern cannot cover.
# Word boundaries are safe: verified 2026-07-16 that \b still matches inside BINARY content, so
# the .pyc case (C-30) that triggered this gate is preserved.
scan_user_token() {  # <username> <label>
  local u="$1" label="$2" esc
  case "$u" in
    user|root)
      # C-42: a sanctioned placeholder or root is not a leak identity. If the runner IS named
      # `user`, scanning the bare token would self-flag every legitimate /home/user in the pack.
      echo "NOTE: username '$u' is a sanctioned placeholder or root; bare-token scan skipped (C-42)."
      return 0 ;;
  esac
  if printf '%s' "$u" | grep -qE '^[A-Za-z0-9._-]+$'; then
    # `.` passes the charset guard above but IS a regex metacharacter -- escape before use.
    esc=$(printf '%s' "$u" | sed 's/[.[\*^$()+?{|]/\\&/g')
    scan "$label" "\\b${esc}\\b" nocase
  else
    # C-43: a derived username is untrusted regex input. Fail-safe toward the human: refuse
    # loudly rather than silently scanning a corrupted pattern that matches nothing.
    echo "LEAK [$label] username is unscannable (regex metacharacters); refusing to scan blind"
    status=1
  fi
}

RUNNER_USER="$(id -un 2>/dev/null || true)"
if [ -z "$RUNNER_USER" ]; then
  # C-45: an UNKNOWN runner is a HARD FAILURE, not a silent skip. Deliberately NOT folded in with
  # the user|root placeholder case: `root` is a KNOWN identity we have decided not to scan, whereas
  # "" means the scan cannot determine who it is scanning for -- and a scan that does not know what
  # it is looking for cannot report clean. C-22 again.
  echo "LEAK [runner-user-unknown] could not determine the runner username (id -un failed); refusing to report clean"
  status=1
else
  scan_user_token "$RUNNER_USER" "home-path-runner-user"
fi

# ADDITIVE test seam (C-46). LEAK_SCAN_EXTRA_USERS adds tokens to scan IN ADDITION to the
# runtime-derived `id -un`; it can never replace or suppress it. This matters: the earlier
# replace-style seam (LEAK_SCAN_USER) was a REAL BYPASS -- `LEAK_SCAN_USER=zzbenign` pointed the
# scan at the wrong token and a genuine maintainer-username leak passed with exit 0. An additive
# seam is unconditionally safe because the worst a caller can do is scan for MORE things.
for _extra in ${LEAK_SCAN_EXTRA_USERS:-}; do
  scan_user_token "$_extra" "extra-user[$_extra]"
done

# C-31: internal agent / product / project names.
# NOT SCANNED, deliberately (C-31a): `Data` and `Kup`. Verified 2026-07-16 that no non-overmatching
# form exists -- even case-sensitive word-boundary `\bData\b` hits 47 files of legitimate content in
# a pack about data pipelines ("Data residency", "Data footprint"), and `\bKup\b` hits 0 while the
# `kup` substring hits 30 files of ordinary English (Pickup, markup, backup, lookup, mockup).
# They are unscannable by regex and are routed to HUMAN REVIEW instead. T31a enforces this.
# `st[- ]metro` (not `st.metro`): an unescaped `.` is a wildcard that would overmatch.
scan "internal-name"    "claudeclaw|ccos|ravage|soundwave|starscream|teletraan|metroplex|sky-lynx|ideaforge|st[- ]metro|perceptor|bunker" nocase
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
