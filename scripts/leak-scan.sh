#!/usr/bin/env bash
# Scan TRACKED skill files for personal / internal / infrastructure references
# before this pack is published.
#
#   bash scripts/leak-scan.sh          # exit 0 = clean, 1 = leaks found
#
# CRITICAL: do NOT add -I to these git greps. -I skips binary files, and the leak that
# triggered this gate (a tracked .pyc with /home/<user>/... compiled into it) is invisible
# to `git grep -I` while being plainly visible to `git grep`. A scan that reports clean
# because its pattern is blind is worse than no scan.
#
# Scope: tracked files under the PLUGIN skill dirs ONLY (<plugin>/skills/). Author attribution
# in package metadata (marketplace.json, <plugin>/.claude-plugin/plugin.json) is legitimate for
# an MIT repo and is deliberately NOT scanned.
#
# Q-20260716-0002 -- THE SCOPE-COLLAPSE HAZARD. This scan used to hardcode `-- skills/`, a dir
# that no longer exists after the themed-plugin split. `git grep` exits 1 for "no match" AND for
# "pathspec matched nothing" -- the two are INDISTINGUISHABLE from the caller. A stale pathspec
# would therefore have reported a clean, green, zero-leak scan while reading ZERO files. That is
# the C-22 false-pass class arriving through a new door: absence of a hit must mean absence of a
# leak, not absence of a scan. Two defenses, both required:
#   1. SCAN_PATHS is DERIVED from skills-manifest.json (the SSOT), never hardcoded and never
#      globbed -- so it cannot silently drift from the real layout.
#   2. The scanned-file count is asserted NON-ZERO below and fails CLOSED at zero.

set -uo pipefail
cd "$(dirname "$0")/.."

status=0

# C-40/C-41: derive the scan roots from the manifest, then PROVE they contain files.
if ! command -v node >/dev/null 2>&1; then
  echo "LEAK [scan-scope] node is required to derive the scan scope from skills-manifest.json; refusing to scan blind"
  exit 1
fi
mapfile -t SCAN_PATHS < <(node -e '
  const m = require("./skills-manifest.json");
  if (!Array.isArray(m.plugins) || !m.plugins.length) process.exit(2);
  for (const p of m.plugins) console.log(p.id + "/skills/");
' 2>/dev/null)
if [ "${#SCAN_PATHS[@]}" -eq 0 ]; then
  echo "LEAK [scan-scope] could not derive plugin skill dirs from skills-manifest.json; refusing to report clean"
  exit 1
fi

# The count is the load-bearing assertion: a pathspec that matches nothing is a BROKEN scan, not
# a clean one. Without this, renaming a plugin dir turns this whole gate into a no-op that
# still prints OK and exits 0.
#
# PER-PATH, not aggregate. An aggregate-only check was written first and its own control caught
# it: point ONE of the seven plugin dirs at a nonexistent name and the total merely drops
# 344 -> 300 while the scan still says "OK, clean". Six live dirs mask the seventh dead one, and
# 44 files go unscanned with a green light. Every scan root must independently prove it has files.
SCANNED=0
for _p in "${SCAN_PATHS[@]}"; do
  _n=$(git ls-files -- "$_p" | wc -l)
  if [ "$_n" -eq 0 ]; then
    echo "LEAK [scan-scope] scan root matched ZERO tracked files: $_p"
    echo "    A scan root that reads no files cannot report clean -- the other roots would mask it."
    echo "    Fix the layout or skills-manifest.json's \`plugins\` section."
    exit 1
  fi
  SCANNED=$((SCANNED + _n))
done

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
  hits=$(git grep "${flags[@]}" "$pattern" -- "${SCAN_PATHS[@]}" 2>&1); rc=$?
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

# C-48: resolve `id` by ABSOLUTE path, never through the caller's PATH. Reproduced: an `id` shim
# earlier in PATH that prints `user` triggers the C-42 placeholder skip above, and a real
# maintainer-username leak then ships with exit 0. Note this is the SAME mechanism T45 uses to
# simulate a broken `id`, so the path is demonstrably reachable, not theoretical.
#
# Honest threat model: a caller who fully controls PATH could equally replace `git` or edit this
# script, so this is NOT a security boundary against a determined attacker. It defends the
# REACHABLE accidental cases -- shims, wrappers, containers, a stray `id` earlier in PATH -- which
# is the realistic failure mode for a local pre-publish gate.
_resolve_runner_user() {
  local c
  for c in /usr/bin/id /bin/id; do
    if [ -x "$c" ]; then "$c" -un 2>/dev/null; return; fi
  done
  command -p id -un 2>/dev/null   # POSIX default PATH, not the caller's
}
RUNNER_USER="$(_resolve_runner_user || true)"
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
ALLOW_EMAIL_PATHS='m2ai-strategy-analysis/skills/silver-platter/examples/'
scan "email"            "[a-z0-9._%+-]+@(gmail|outlook|hotmail|yahoo)\.com" nocase "$ALLOW_EMAIL_PATHS"

if [ "$status" -eq 0 ]; then
  # Print the count that was ASSERTED non-zero above, not a fresh re-glob of a path that may no
  # longer exist -- the old form re-ran `git ls-files skills/` here and would have cheerfully
  # printed "OK: no leaks (0 files scanned)".
  echo "OK: no leaks in $SCANNED tracked files across ${#SCAN_PATHS[@]} plugin skill dirs"
else
  echo ""
  echo "Leaks found. This pack is not safe to publish."
fi
exit "$status"
