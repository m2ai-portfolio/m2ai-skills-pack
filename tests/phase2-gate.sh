#!/usr/bin/env bash
# Phase 2 gate — card Q-20260716-0002. The REAL install proof, executable and re-runnable.
#
#   bash tests/phase2-gate.sh [plugin-name]     # default: m2ai-workflow-content
#
# WHY THIS FILE EXISTS: the gate was originally run by hand in a session. It genuinely passed,
# but a hand-run proof is unverifiable to anyone who was not watching -- Codex round 1 flagged
# exactly that ("no recorded real run ... coverage is non-verifiable"). An assertion that the
# JSON is well-formed is NOT the proof; neither is a human saying "I ran it". This script is the
# proof, and it can be re-run by anyone.
#
# WHAT IT PROVES (T16/T17/T18):
#   T16  `claude plugin marketplace add` + `claude plugin install` from the LOCAL path succeed
#        and the plugin appears in `claude plugin list` as enabled.
#   T17  the installed tree really contains the plugin's skills, with parseable frontmatter,
#        at the count the manifest predicts. Not "a dir exists" -- real SKILL.md files.
#   T18  cleanup restores the machine: no plugin, no marketplace, no orphaned cache.
#
# IT MUTATES REAL MACHINE STATE (user-scope plugin config), so it is deliberately NOT called by
# tests/gate0.test.sh. It is safe to re-run: it refuses to start if the marketplace is already
# present (so it can never clobber a real install of the same name) and cleans up on any exit.
#
# NOT COVERED, deliberately (C-34): Cursor. The `cursor` binary is not installed on this machine.
# The Cursor manifests are validated by tests/cursor-schema.test.sh against the documented schema
# and cursor/plugins' live marketplace shape -- a schema check, NOT an install. The real Cursor
# install path is UNVERIFIED and this script does not pretend otherwise.

set -uo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)

PLUGIN="${1:-m2ai-workflow-content}"
MARKET=$(node -e 'console.log(require("./.claude-plugin/marketplace.json").name)')
LOG_DIR="$ROOT/.self-healing-claudex"
[ -d "$LOG_DIR" ] || LOG_DIR=/tmp
LOG="$LOG_DIR/phase2-gate-$(date -u +%Y%m%dT%H%M%SZ).log"

pass=0; fail=0
ok()  { echo "  PASS  $1" | tee -a "$LOG"; pass=$((pass+1)); }
bad() { echo "  FAIL  $1" | tee -a "$LOG"; fail=$((fail+1)); }
say() { echo "$1" | tee -a "$LOG"; }

command -v claude >/dev/null 2>&1 || { echo "FATAL: claude CLI not installed"; exit 1; }
say "Phase 2 gate: $PLUGIN@$MARKET  ($(claude --version 2>&1 | head -1))"
say "transcript: $LOG"

# Refuse to touch a pre-existing marketplace of the same name -- a test must never clobber a
# real install and then "restore" it to a state it was not in.
if claude plugin marketplace list 2>&1 | grep -q "^  ❯ ${MARKET}$"; then
  say "FATAL: marketplace '$MARKET' is already configured. Refusing to run: cleanup would remove"
  say "       a marketplace this script did not add. Remove it first if it is a leftover."
  exit 1
fi

cleanup() {
  say ""; say "--- cleanup (T18) ---"
  claude plugin uninstall "$PLUGIN@$MARKET"  >>"$LOG" 2>&1
  claude plugin marketplace remove "$MARKET" >>"$LOG" 2>&1
  # The cache survives `marketplace remove` (Claude Code tags it .orphaned_at for its own GC).
  # This gate added it, so this gate removes it: "clean up the test install" means the machine is
  # left as found, not left holding 5MB of someone's plugin tree.
  rm -rf "$HOME/.claude/plugins/cache/$MARKET"
}
trap cleanup EXIT

# ---------- T16: real marketplace add + install ----------
say ""; say "T16 REAL marketplace add + install (not an assertion)"
if claude plugin marketplace add "$ROOT" >>"$LOG" 2>&1; then
  ok "marketplace add '$MARKET' from local path"
else
  bad "marketplace add FAILED -- see $LOG"; echo; echo "gate FAILED"; exit 1
fi

if claude plugin install "$PLUGIN@$MARKET" >>"$LOG" 2>&1; then
  ok "plugin install $PLUGIN@$MARKET"
else
  bad "plugin install FAILED -- see $LOG"; echo; echo "gate FAILED"; exit 1
fi

LIST=$(claude plugin list 2>&1); echo "$LIST" >>"$LOG"
if printf '%s' "$LIST" | grep -q "$PLUGIN@$MARKET"; then
  ok "appears in \`claude plugin list\`"
else
  bad "installed but NOT listed -- install silently no-opped"
fi
# "enabled" is the load-bearing word: a listed-but-disabled plugin ships no skills.
if printf '%s' "$LIST" | grep -A3 "$PLUGIN@$MARKET" | grep -qi 'enabled'; then
  ok "listed as enabled"
else
  bad "listed but not enabled -- its skills would not load"
fi

# ---------- T17: the skills are really there ----------
say ""; say "T17 installed skills are discoverable (real files, not a dir that exists)"
CACHE="$HOME/.claude/plugins/cache/$MARKET/$PLUGIN"
EXPECT=$(node -e '
  const m = require("./skills-manifest.json");
  const d2p = {}; for (const p of m.plugins) for (const d of p.divisions) d2p[d] = p.id;
  console.log(Object.entries(m.skills).filter(([, d]) => d2p[d] === process.argv[1]).length);
' "$PLUGIN")

if [ -d "$CACHE" ]; then
  ok "installed tree present at ~/.claude/plugins/cache/$MARKET/$PLUGIN"
else
  bad "no installed tree at $CACHE"; exit 1
fi

# NOTE: the tree is version-nested (<plugin>/<version>/skills/...). Search unbounded rather than
# guessing a depth -- a maxdepth guess reported 0 skills during the manual run and looked exactly
# like a real failure.
GOT=$(find "$CACHE" -name SKILL.md 2>/dev/null | wc -l)
[ "$GOT" = "$EXPECT" ] && ok "$GOT SKILL.md installed (manifest predicts $EXPECT)" \
  || bad "installed $GOT SKILL.md, manifest predicts $EXPECT"

# Every installed skill must carry real, parseable frontmatter -- an empty or truncated SKILL.md
# would still satisfy a file count.
badfm=0
while IFS= read -r f; do
  n=$(awk '/^---$/{c++;next} c==1 && /^name:/{print;exit}' "$f")
  d=$(awk '/^---$/{c++;next} c==1 && /^description:/{print;exit}' "$f")
  [ -n "$n" ] && [ -n "$d" ] || { badfm=$((badfm+1)); echo "    bad frontmatter: $f" >>"$LOG"; }
done < <(find "$CACHE" -name SKILL.md 2>/dev/null)
[ "$badfm" = "0" ] && ok "all $GOT installed skills have name+description frontmatter" \
  || bad "$badfm installed skills have broken frontmatter (see $LOG)"

# Cross-check the installed skill NAMES against the manifest, not just the count: the right
# number of the wrong skills is still a broken split.
MISSING=$(node -e '
  const { execSync } = require("child_process");
  const m = require("./skills-manifest.json");
  const d2p = {}; for (const p of m.plugins) for (const d of p.divisions) d2p[d] = p.id;
  const want = Object.entries(m.skills).filter(([, d]) => d2p[d] === process.argv[1]).map(([s]) => s);
  const got = new Set(
    execSync(`find ${JSON.stringify(process.argv[2])} -name SKILL.md`, { encoding: "utf8" })
      .split("\n").filter(Boolean)
      .map((p) => p.split("/skills/")[1]).filter(Boolean).map((p) => p.split("/")[0])
  );
  console.log(want.filter((s) => !got.has(s)).join(" "));
' "$PLUGIN" "$CACHE" 2>/dev/null)
[ -z "$MISSING" ] && ok "every manifest skill for $PLUGIN is present in the install" \
  || bad "manifest skills missing from the install: $MISSING"

# ---------- T18: cleanup verified ----------
cleanup; trap - EXIT
say ""; say "T18 cleanup verified (machine left as found)"
claude plugin list 2>&1 | grep -q "$PLUGIN@$MARKET" \
  && bad "plugin still installed after uninstall" || ok "plugin gone"
claude plugin marketplace list 2>&1 | grep -q "^  ❯ ${MARKET}$" \
  && bad "marketplace still configured after remove" || ok "marketplace gone"
[ -e "$HOME/.claude/plugins/cache/$MARKET" ] \
  && bad "orphaned cache left behind at ~/.claude/plugins/cache/$MARKET" || ok "no orphaned cache"

say ""
say "================================"
say "  passed: $pass   failed: $fail"
say "================================"
[ "$fail" -eq 0 ]
