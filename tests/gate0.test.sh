#!/usr/bin/env bash
# Gate 0 test contract — card Q-20260716-0001.
# Each test cites the spec-claim id it covers. Run from repo root: bash tests/gate0.test.sh
#
# Includes NEGATIVE CONTROLS (T22, T23, T24, T33): tests that plant a fault and assert the
# guard FIRES. Without these, "the scan is clean" and "the scan is blind" look identical.

set -uo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)

pass=0; fail=0
ok()   { echo "  PASS  $1"; pass=$((pass+1)); }
bad()  { echo "  FAIL  $1"; fail=$((fail+1)); }
t()    { echo; echo "$1"; }

VENV_DEST="$HOME/.local/share/m2ai-skills-pack/banana-maker-venv"
SKILL_VENV="$HOME/.claude/skills/banana-maker/venv"

# C-38: probes must NEVER plant a real person's username. This file ships in a public repo; a
# literal username here would re-introduce the identifier the gate exists to remove. PROBE_USER is
# a synthetic name that is nobody's identity, and is passed to the scan via the ADDITIVE
# LEAK_SCAN_EXTRA_USERS seam so the bare-token path is exercised without hardcoding anyone.
# The seam is additive by design (C-46): it can only ADD tokens to scan, never redirect the scan
# away from the real runtime-derived `id -un`. A replace-style seam was a genuine bypass.
PROBE_USER="zzprobeuser"

# ---- planted-control helpers -------------------------------------------------------------
# A mutation claim with NO planted control is UNPROVEN regardless of what the scan returns
# today: "the scan is clean" and "the scan is blind" look identical from the outside.
# plant_expect_fail: the scan MUST catch this content (positive control).
# plant_expect_pass: the scan MUST NOT flag this content (negative control / false-positive guard).
_plant() {  # _plant <relpath> <content>  -> stage a tracked probe file
  printf '%s\n' "$2" > "$1"; git add -f "$1" >/dev/null 2>&1
}
_unplant() { git rm --cached -q "$1" >/dev/null 2>&1; rm -f "$1"; }

plant_expect_fail() {  # <label> <content> [env assignments...]
  local label="$1" content="$2"; shift 2
  local p="skills/_probe_$$.md"
  _plant "$p" "$content"
  if env "$@" bash scripts/leak-scan.sh >/dev/null 2>&1; then
    bad "$label -- scan PASSED on a planted leak (pattern is blind)"
  else
    ok "$label -- scan caught it"
  fi
  _unplant "$p"
}

plant_expect_pass() {  # <label> <content> [env assignments...]
  local label="$1" content="$2"; shift 2
  local p="skills/_probe_$$.md"
  _plant "$p" "$content"
  if env "$@" bash scripts/leak-scan.sh >/dev/null 2>&1; then
    ok "$label -- correctly NOT flagged"
  else
    bad "$label -- FALSE POSITIVE: scan flagged legitimate content"
  fi
  _unplant "$p"
}

# ---------- item 1: tracked build artifact ----------
t "C-01 .pyc untracked"
[ -z "$(git ls-files skills/banana-maker/__pycache__/)" ] && ok "no __pycache__ in index" || bad "still tracked"

t "C-02 no build artifacts tracked anywhere"
[ -z "$(git ls-files | grep -E '__pycache__|/venv/|\.pyc$')" ] && ok "index clean" || bad "artifacts tracked"

t "C-03 .gitignore covers the artifact classes"
git check-ignore -q skills/banana-maker/__pycache__/x.pyc && ok ".pyc ignored" || bad ".pyc NOT ignored"
git check-ignore -q skills/banana-maker/venv/x && ok "venv ignored" || bad "venv NOT ignored"

# ---------- item 2: venv relocation ----------
t "C-04 venv absent from work-tree"
[ ! -e skills/banana-maker/venv ] && ok "no venv in repo" || bad "venv still in work-tree"

t "C-05 venv RELOCATED, not deleted, and outside the repo"
[ -d "$VENV_DEST" ] && ok "exists at $VENV_DEST" || bad "relocated venv missing (deleted?)"
case "$VENV_DEST" in "$ROOT"/*) bad "destination is INSIDE the repo" ;; *) ok "destination outside repo" ;; esac

t "C-06 banana-maker still resolves a working interpreter (RUN it, do not assume)"
if [ -x "$SKILL_VENV/bin/python" ]; then
  "$SKILL_VENV/bin/python" -c "import google.genai, dotenv" 2>/dev/null \
    && ok "installed venv imports google.genai + dotenv" || bad "installed venv broken"
  "$SKILL_VENV/bin/python" "$HOME/.claude/skills/banana-maker/generate_image.py" --help >/dev/null 2>&1 \
    && ok "generate_image.py --help runs" || bad "generate_image.py does not run"
else
  echo "  SKIP  installed banana-maker venv not present on this machine"
fi

t "C-06b shipped generate_image.py still parses after edits"
python3 -c "import ast,sys; ast.parse(open('skills/banana-maker/generate_image.py').read())" \
  && ok "parses" || bad "syntax error"

# ---------- item 3: sanitization ----------
t "C-07 trace-prompt free of internal product names"
[ -z "$(git grep -in -E 'claudeclaw|ccos' -- skills/trace-prompt/)" ] && ok "clean" || bad "internal name present"

t "C-08..C-10 named files free of personal name"
[ -z "$(git grep -in matthew -- skills/banana-maker/ skills/launch-filter/ skills/viral-shorts-pipeline/)" ] \
  && ok "clean" || bad "personal name present"

t "C-11 the 4 sanitized skills still declare working frontmatter"
for f in skills/trace-prompt/SKILL.md skills/banana-maker/SKILL.md skills/launch-filter/SKILL.md; do
  n=$(awk '/^---$/{c++;next} c==1 && /^name:/{print;exit}' "$f")
  d=$(awk '/^---$/{c++;next} c==1 && /^description:/{print;exit}' "$f")
  [ -n "$n" ] && [ -n "$d" ] && ok "$(basename $(dirname $f)) frontmatter intact" || bad "$f frontmatter broken"
done

t "C-11b viral-shorts registry still parses as YAML with its keys"
python3 - <<'PY' && ok "yaml intact" || bad "yaml broken"
import sys
try: import yaml
except ImportError: print("  (pyyaml absent, structural check only)"); sys.exit(0)
d=yaml.safe_load(open('skills/viral-shorts-pipeline/skill-registry.yaml'))
assert d['name']=='viral-shorts-pipeline', d.get('name')
assert d['source']['author'], 'author key lost'
assert 'version' in d
PY

t "C-12 / C-26 full leak scan over ALL tracked files under skills/"
bash scripts/leak-scan.sh >/dev/null 2>&1 && ok "leak-scan clean" || { bash scripts/leak-scan.sh; bad "leaks found"; }

# ---------- item 4: manifest SSOT ----------
t "C-13 manifest assigns 183 skills"
N=$(python3 -c "import json;print(len(json.load(open('skills-manifest.json'))['skills']))")
[ "$N" = "183" ] && ok "183 skills" || bad "manifest has $N, expected 183"

t "C-14 zero orphans, zero ghosts (symmetric diff, both directions)"
python3 - <<'PY' && ok "manifest == disk" || bad "manifest/disk mismatch"
import json,os,sys
m=set(json.load(open('skills-manifest.json'))['skills'])
d={x for x in os.listdir('skills') if os.path.isfile(f'skills/{x}/SKILL.md')}
if m-d: print("  ghosts:", sorted(m-d)); sys.exit(1)
if d-m: print("  orphans:", sorted(d-m)); sys.exit(1)
PY

t "C-14b every division reference resolves"
python3 - <<'PY' && ok "no dangling divisions" || bad "dangling division ref"
import json,sys
j=json.load(open('skills-manifest.json'))
ids={d['id'] for d in j['divisions']}
bad=[f"{k}->{v}" for k,v in j['skills'].items() if v not in ids]
if bad: print("  ",bad); sys.exit(1)
PY

t "C-15/C-16/C-17 generated counts in sync"
node scripts/sync-from-manifest.mjs --check >/dev/null 2>&1 && ok "--check clean" || bad "counts drifted"

t "C-17b all four count sources read the SAME number"
python3 - <<'PY' && ok "all sources agree" || bad "sources disagree"
import json,re,sys
n=len(json.load(open('skills-manifest.json'))['skills'])
r=open('README.md').read(); m=open('.claude-plugin/marketplace.json').read()
got={
 'manifest': n,
 'blurb': int(re.search(r'\*\*(\d+) portable Claude Code skills\*\*',r).group(1)),
 'badge': int(re.search(r'badge/skills-(\d+)-brightgreen',r).group(1)),
 'summary_total': int(re.search(r'\|\s*\|\s*\*\*(\d+)\*\*\s*\|\s*\|',r).group(1)),
 'catalog_rows': len(re.findall(r'^\|\s*\[[a-z0-9-]+\]\(skills/',r,re.M)),
 'marketplace': int(re.search(r'"(\d+) portable skills',m).group(1)),
}
print("  ",got)
if len(set(got.values()))!=1: sys.exit(1)
PY

# ---------- constraints ----------
t "C-18 .pyc REMAINS in git history (history not rewritten)"
[ -n "$(git log --all --oneline -- '*generate_image.cpython-312.pyc' 2>/dev/null)" ] \
  && ok "history intact" || bad "history appears rewritten -- OUT OF SCOPE"

t "C-19 no themed-plugin restructure"
[ -z "$(ls -d m2ai-*/ 2>/dev/null)" ] && ok "no themed plugin dirs" || bad "restructure happened"
[ "$(find skills -maxdepth 2 -name SKILL.md | wc -l)" = "183" ] && ok "all 183 still under skills/" || bad "skills moved"

t "C-20 nothing pushed: the REMOTE does not contain the Gate-0 commit"
# FIXED (Codex r1 MEDIUM, adopted per Matthew decision (5)): the round-1 assertion checked local
# ahead/behind, which CANNOT prove a push never happened -- being ahead of origin now is entirely
# consistent with having pushed and then committed more on top. The only sound assertion queries
# the REMOTE and asks whether it contains the Gate-0 commit.
GATE0_SHA=$(git log --format=%H --grep='Gate 0: sanitize' -n 1)
if [ -z "$GATE0_SHA" ]; then
  bad "cannot locate the Gate-0 commit locally -- C-20 inconclusive"
elif ! git ls-remote --exit-code origin >/dev/null 2>&1; then
  echo "  SKIP  remote unreachable (offline) -- C-20 cannot be proven without the remote"
else
  REMOTE_MASTER=$(git ls-remote origin refs/heads/master | cut -f1)
  if [ -z "$REMOTE_MASTER" ]; then
    echo "  SKIP  origin has no refs/heads/master"
  else
    git fetch -q origin master 2>/dev/null || true
    # Sound test: if the Gate-0 commit had ever been pushed, it would be an ANCESTOR of the
    # remote master tip. It must not be.
    if git merge-base --is-ancestor "$GATE0_SHA" "$REMOTE_MASTER" 2>/dev/null; then
      bad "Gate-0 commit ${GATE0_SHA:0:7} IS on the remote -- IT WAS PUSHED (constraint violated)"
    else
      ok "remote master ${REMOTE_MASTER:0:7} does NOT contain Gate-0 ${GATE0_SHA:0:7} -- never pushed"
    fi
  fi
fi

t "C-35 work landed as LOCAL COMMITS on master, tree clean"
[ -n "$(git log --oneline master -n 5)" ] && ok "commits present on master" || bad "no commits on master"
[ -z "$(git status --porcelain)" ] && ok "work-tree clean (nothing left uncommitted)" \
  || { echo "    dirty:"; git status --porcelain | sed 's/^/      /'; bad "work-tree dirty -- work not committed"; }

t "C-34 NEGATIVE CONTROL: author attribution PRESERVED in package metadata (sanitize did not over-reach)"
grep -q '"name": "Matthew Snow"' .claude-plugin/marketplace.json \
  && ok "marketplace.json attribution intact" || bad "attribution stripped -- over-reach"

# ---------- negative controls ----------
t "C-22/C-30 NEGATIVE CONTROL: leak-scan CATCHES a planted BINARY leak"
# The .pyc that triggered this whole gate was invisible to `git grep -I` while plainly visible
# to `git grep`. This control proves the scan is not blind to binary. Uses a synthetic username
# (C-38) and drives the bare-token path via the LEAK_SCAN_EXTRA_USERS seam -- no real identity planted.
probe=skills/_leakprobe.bin
cleanup_probe() { git rm --cached -q "$probe" 2>/dev/null; rm -f "$probe"; }
trap cleanup_probe EXIT
printf '\x00\x01binary\x00/home/%s/secret\x00' "$PROBE_USER" > "$probe"
git add -f "$probe" || bad "could not stage probe (control inconclusive)"
if LEAK_SCAN_EXTRA_USERS="$PROBE_USER" bash scripts/leak-scan.sh >/dev/null 2>&1; then
  bad "scan PASSED on a planted binary leak -- the scan is blind (this is the -I bug)"
else
  ok "scan correctly failed on planted binary leak"
fi
cleanup_probe; trap - EXIT

t "C-33 NEGATIVE CONTROL: untracked/ignored file does NOT trip the scan (no false positive)"
mkdir -p skills/banana-maker/__pycache__
printf '%s /home/%s\n' "$PROBE_USER" "$PROBE_USER" > skills/banana-maker/__pycache__/probe.pyc
if LEAK_SCAN_EXTRA_USERS="$PROBE_USER" bash scripts/leak-scan.sh >/dev/null 2>&1; then
  ok "ignored untracked file correctly not scanned"
else
  bad "scan tripped on an untracked gitignored file -- false positive"
fi
rm -rf skills/banana-maker/__pycache__

t "C-23 NEGATIVE CONTROL: generator REFUSES a manifest with an orphan, and writes NOTHING"
# FIXED (Codex r1 MEDIUM, adopted per Matthew decision (5)): round 1 asserted only that README.md
# was unmutated. The generator writes TWO files -- a partial write to marketplace.json on the
# refusal path would have slipped through silently. Assert BOTH are byte-identical.
cp skills-manifest.json /tmp/_m.bak; cp README.md /tmp/_r.bak; cp .claude-plugin/marketplace.json /tmp/_mk.bak
python3 -c "
import json;j=json.load(open('skills-manifest.json'));j['skills'].pop('aar');json.dump(j,open('skills-manifest.json','w'),indent=2)"
if node scripts/sync-from-manifest.mjs >/dev/null 2>&1; then
  bad "generator accepted an orphaned manifest"
else
  r_ok=0; m_ok=0
  cmp -s README.md /tmp/_r.bak && r_ok=1
  cmp -s .claude-plugin/marketplace.json /tmp/_mk.bak && m_ok=1
  if [ "$r_ok" = 1 ] && [ "$m_ok" = 1 ]; then
    ok "refused loudly AND wrote nothing (BOTH README and marketplace.json untouched)"
  else
    [ "$r_ok" = 1 ] || bad "refused but still mutated README.md"
    [ "$m_ok" = 1 ] || bad "refused but still mutated .claude-plugin/marketplace.json (partial write)"
  fi
fi
cp /tmp/_m.bak skills-manifest.json; cp /tmp/_r.bak README.md; cp /tmp/_mk.bak .claude-plugin/marketplace.json
rm -f /tmp/_mk.bak

t "C-24 NEGATIVE CONTROL: --check DETECTS a hand-edited count literal"
cp README.md /tmp/_r.bak
sed -i 's/\*\*183 portable Claude Code skills\*\*/**999 portable Claude Code skills**/' README.md
node scripts/sync-from-manifest.mjs --check >/dev/null 2>&1 && bad "--check missed drifted literal" || ok "--check caught drift"
cp /tmp/_r.bak README.md
rm -f /tmp/_m.bak /tmp/_r.bak

# ---------- mutation tests: PLANTED POSITIVE CONTROLS ----------
# The round-1 contract CITED T27/T28/T29/T31/T32 but never implemented them: the suite tested the
# scan's OUTPUT but not the MUTATIONS the claims name. These plant each leak class and assert the
# scan FAILS. Without them, every "clean" result is unproven.

t "C-27 MUTATION: case variants of the personal name are caught"
plant_expect_fail "C-27 uppercase MATTHEW"       "Contact MATTHEW for access."
plant_expect_fail "C-27 lowercase matthew"       "ask matthew about this"
plant_expect_fail "C-27 mixed-case username"     "path is /home/ZzProbeUser/x" LEAK_SCAN_EXTRA_USERS="$PROBE_USER"

t "C-28 MUTATION: possessive / inflected forms are caught"
plant_expect_fail "C-28 Matthews (inflection)"   "This is Matthews workflow."
plant_expect_fail "C-28 Matthew's (ASCII apostrophe)" "This is Matthew's workflow."
plant_expect_fail "C-28 Matthew’s (U+2019 smart apostrophe)" "This is Matthew’s workflow."

t "C-29 MUTATION: a concrete home path for a NON-runner user is caught"
plant_expect_fail "C-29 /home/<other> concrete path" "cd /home/someotherperson/projects"

t "C-44 MUTATION: the placeholder allowlist is EXACT-TOKEN, not a prefix"
plant_expect_pass "C-44 /home/user (sanctioned placeholder)"    "see /home/user/.claude/skills/"
plant_expect_pass "C-44 /home/<user> (sanctioned placeholder)"  "see /home/<user>/.claude/skills/"
plant_expect_fail "C-44 /home/username123 (prefix, still a leak)" "cd /home/username123/projects"

t "C-31 MUTATION: internal agent/product names are caught"
plant_expect_fail "C-31 ClaudeClaw"  "Built for ClaudeClaw users."
plant_expect_fail "C-31 Ravage"      "Dispatch to Ravage for code review."
plant_expect_fail "C-31 Teletraan"   "Logged via Teletraan dispatch."

t "C-31a NEGATIVE CONTROL: the REJECTED tokens Data/Kup are NOT scanned"
# Matthew's decision (2), authoritative. Verified 2026-07-16: \bData\b hits 47 files of legitimate
# content ("Data residency", "Data footprint") and \bKup\b hits 0 while `kup` hits 30 files of
# ordinary English. There is NO non-overmatching form. If a future round "helpfully" re-adds these
# tokens, THIS TEST BREAKS rather than the pack. That is the point.
plant_expect_pass "C-31a 'Data residency' is legitimate prose" "| Data residency | Data leaves your infrastructure |"
plant_expect_pass "C-31a 'backup'/'Pickup'/'markup' are ordinary English" "Run a backup, then Pickup the markup and do a lookup."

t "C-32 MUTATION: LAN addresses and personal device names are caught"
plant_expect_fail "C-32 private LAN address" "Browse to 10.0.0.46:8080 for the dashboard."
plant_expect_fail "C-32 device name ProBook" "Runs on the ProBook."
plant_expect_fail "C-32 device name gaming-pc" "SSH to gaming-pc to render."

t "C-39 NEGATIVE CONTROL: ~/ and \$HOME are SANCTIONED and must NOT be flagged"
# Matthew's decision (1), authoritative. Codex round-1 HIGH #1 ("add ~/ and \$HOME as leak
# patterns") is REJECTED: ~/ is the CORRECT portable already-sanitized home reference and appears
# in 58 tracked files as legitimate content; \$HOME appears 0 times. Implementing that finding
# would flag 58 files of correct content and make this gate unusable. This test encodes the
# rejection so a future round breaks the SUITE instead of breaking the PACK.
plant_expect_pass "C-39 ~/vault is sanctioned"          "Notes live in ~/vault/daily/."
plant_expect_pass "C-39 ~/.claude/skills is sanctioned" "Skills live in ~/.claude/skills/my-skill/."
plant_expect_pass "C-39 \$HOME is sanctioned"            "Set the path to \$HOME/.config/app."

# ---------- the detector must not ship the identifier it removes ----------
t "C-37 the leak detector hardcodes NO concrete username"
# MAINT_USER is DERIVED, never written literally. Writing the maintainer's username here would
# re-create the exact bug this test exists to catch: the assertion "the repo contains no
# occurrences of X" cannot pass if the assertion itself spells X. Deriving it also generalizes
# the check -- it holds for ANY maintainer who runs this suite, not just the one who wrote it.
MAINT_USER="$(id -un 2>/dev/null || true)"
case "$MAINT_USER" in
  user|root|"") MAINT_USER="" ;;   # C-42: placeholder/root are not leak identities
esac
if [ -z "$MAINT_USER" ]; then
  echo "  SKIP  runner is a placeholder/root; C-37/C-38 identity checks not applicable"
else
  if git grep -qi -- "$MAINT_USER" -- scripts/leak-scan.sh 2>/dev/null; then
    bad "leak-scan.sh hardcodes the runner's username -- the detector IS the leak"
  else
    ok "leak-scan.sh carries no hardcoded username (derives at runtime)"
  fi
fi
grep -qE 'id -un' scripts/leak-scan.sh && ok "username derived at runtime via id -un" \
  || bad "no runtime username derivation found"

t "C-37a genericizing did NOT lose concrete-path coverage"
plant_expect_fail "C-37a /home/<runner> still caught for an arbitrary runner" \
  "cd /home/$PROBE_USER/projects" LEAK_SCAN_EXTRA_USERS="$PROBE_USER"

t "C-38 ACCEPTANCE: repo-wide ZERO hits for the maintainer username"
# Matthew decision (3)'s acceptance test. Uses the DERIVED name (see C-37 above) -- spelling the
# username here would make the test permanently self-failing AND would itself be the leak.
if [ -z "$MAINT_USER" ]; then
  echo "  SKIP  runner is a placeholder/root; identity check not applicable"
else
  HITS=$(git grep -l -i -- "$MAINT_USER" 2>/dev/null || true)
  if [ -z "$HITS" ]; then
    ok "repo-wide grep for the runner's username over ALL tracked files returns ZERO"
  else
    echo "    still present in:"; printf '%s\n' "$HITS" | sed 's/^/      /'
    bad "maintainer username still tracked in the repo"
  fi
fi

t "C-46 the test seam is ADDITIVE and cannot redirect the scan away from the real runner"
# Codex r1 HIGH (adopted). The previous replace-style seam was a REAL bypass, reproduced before
# the fix: `LEAK_SCAN_USER=zzbenign` pointed the bare-token scan at the wrong token and a genuine
# maintainer-username leak passed with exit 0. Assert the replace seam is gone AND that setting
# the additive seam cannot hide a real leak.
# Check for USE, not mention: comment lines are stripped first. The scanner deliberately DOCUMENTS
# why the replace-style seam was removed, and that prose must not trip its own test -- otherwise
# the only way to pass is to delete the explanation, which is the opposite of what we want.
if grep -vE '^[[:space:]]*#' scripts/leak-scan.sh | grep -qE 'LEAK_SCAN_USER\b'; then
  bad "replace-style LEAK_SCAN_USER seam still USED in code -- it was a real bypass"
else
  ok "no replace-style seam in the scanner's executable lines"
fi
if [ -n "$MAINT_USER" ]; then
  bp="skills/_probe_bypass_$$.md"
  printf 'contact %s for access\n' "$MAINT_USER" > "$bp"; git add -f "$bp" >/dev/null 2>&1
  if LEAK_SCAN_EXTRA_USERS=zzbenign bash scripts/leak-scan.sh >/dev/null 2>&1; then
    bad "a real bare-username leak PASSED while the seam pointed elsewhere -- BYPASS"
  else
    ok "seam cannot redirect the scan away from the real runner"
  fi
  git rm --cached -q "$bp" >/dev/null 2>&1; rm -f "$bp"
else
  echo "  SKIP  runner is a placeholder/root; bypass probe not applicable"
fi

t "C-45 an UNKNOWN runner username fails CLOSED (never a silent skip)"
# Codex r1 HIGH (adopted). Reproduced before the fix: a failing `id -un` mapped to empty, matched
# the placeholder case, and skipped the bare-token scan while exiting 0. `root` is a KNOWN identity
# we chose not to scan; "" means the scan does not know WHO it is scanning for -- and a scan that
# cannot answer that cannot report clean. Distinct cases, distinct outcomes.
# NOTE: this deliberately does NOT spoof via PATH. Since C-48 the scanner resolves `id` by
# absolute path, so a PATH shim no longer reaches this branch -- that is the point of C-48. The
# branch is instead exercised by mutating the resolution to empty, the same mutation technique
# T47 uses. This tests the real branch logic without relying on a hole we just closed.
sed 's|^RUNNER_USER=.*|RUNNER_USER=""|' scripts/leak-scan.sh > scripts/_ls_noid_$$.sh
uout=$(bash scripts/_ls_noid_$$.sh 2>&1); urc=$?
case "$uout" in
  *runner-user-unknown*) [ "$urc" -ne 0 ] && ok "unknown runner refuses to report clean" \
                           || bad "warned about unknown runner but still exited 0" ;;
  *) bad "unknown runner did not fail closed (rc=$urc) -- silent skip is a false clean" ;;
esac
rm -f scripts/_ls_noid_$$.sh

t "C-48 a spoofed 'id' in PATH cannot suppress the bare-token scan"
# Codex r2 HIGH (adopted). Reproduced before the fix: an `id` shim printing `user` triggered the
# C-42 placeholder skip and a real maintainer-username leak shipped with exit 0. The scanner now
# resolves `id` by absolute path. Plant a REAL leak, spoof `id`, and assert the scan STILL fails.
if [ -n "$MAINT_USER" ]; then
  spoof=$(mktemp -d)
  printf '#!/bin/sh\necho user\n' > "$spoof/id"; chmod +x "$spoof/id"
  sp="skills/_probe_spoof_$$.md"
  printf 'contact %s for access\n' "$MAINT_USER" > "$sp"; git add -f "$sp" >/dev/null 2>&1
  if PATH="$spoof:$PATH" bash scripts/leak-scan.sh >/dev/null 2>&1; then
    bad "a spoofed 'id' suppressed the scan and a REAL leak shipped clean"
  else
    ok "spoofed 'id' did not suppress the scan (absolute resolution holds)"
  fi
  git rm --cached -q "$sp" >/dev/null 2>&1; rm -f "$sp"; rm -rf "$spoof"
  grep -qE '/usr/bin/id|/bin/id|command -p id' scripts/leak-scan.sh \
    && ok "scanner resolves id by absolute path (not via caller PATH)" \
    || bad "scanner still resolves id through the caller's PATH"
else
  echo "  SKIP  runner is a placeholder/root; spoof probe not applicable"
fi

t "C-47 a scan ERROR fails CLOSED (an erroring scan is not a clean scan)"
# Codex r1 MEDIUM (adopted). `git grep` exits 0=match, 1=no-match, >1=ERROR. The old
# `2>/dev/null || true` collapsed all three to "clean", so a git built without PCRE (-P) support
# would silently disable the home-path scan and this gate would show green while detecting
# nothing. Inject a deliberately invalid pattern and assert the scan refuses to report clean.
sed 's|^scan "personal-name".*|scan "bogus-regex" "[" ;|' scripts/leak-scan.sh > scripts/_ls_err_$$.sh
eout=$(bash scripts/_ls_err_$$.sh 2>&1); erc=$?
case "$eout" in
  *"SCAN ERROR"*) [ "$erc" -ne 0 ] && ok "erroring scan refuses to report clean" \
                    || bad "printed SCAN ERROR but exited 0" ;;
  *) bad "an invalid regex was silently treated as 'no leaks' (rc=$erc) -- false clean" ;;
esac
# control: only the injected pattern should error; the rest of the scan must still function
ecount=$(printf '%s\n' "$eout" | grep -c "SCAN ERROR" || true)
[ "$ecount" = "1" ] && ok "exactly 1 scan errored (others still functioning)" \
  || bad "expected exactly 1 SCAN ERROR, got $ecount -- error handling is over-broad"
rm -f scripts/_ls_err_$$.sh

t "C-42 MUTATION: a runner named 'user' or 'root' must not self-flag"
plant_expect_pass "C-42 runner=user does not flag /home/user" "see /home/user/.claude/" LEAK_SCAN_EXTRA_USERS=user
plant_expect_pass "C-42 runner=root does not flag prose"      "ordinary content here"      LEAK_SCAN_EXTRA_USERS=root
# NOTE: capture to a variable and match with `case`, NEVER `scan | grep -q`. Under `pipefail`,
# grep -q exits on the first match and closes the pipe; leak-scan.sh then takes SIGPIPE on its
# next write and pipefail propagates 141, so the assertion fails intermittently depending on
# write timing. A flaky test is worse than no test -- it teaches you to ignore red.
note_out=$(LEAK_SCAN_EXTRA_USERS=user bash scripts/leak-scan.sh 2>&1 || true)
case "$note_out" in
  *"bare-token scan skipped"*) ok "C-42 skip NOTE emitted (visible, not silent)" ;;
  *)                           bad "C-42 skip is silent -- no NOTE" ;;
esac

t "C-43 MUTATION: a username with regex metacharacters is refused LOUDLY, not scanned blind"
out=$(LEAK_SCAN_EXTRA_USERS='a+b[' bash scripts/leak-scan.sh 2>&1); rc=$?
case "$out" in
  *unscannable*) [ "$rc" -ne 0 ] && ok "refused loudly (fail-safe toward the human)" \
                   || bad "printed 'unscannable' but exited 0 -- not fail-safe" ;;
  *)             bad "metachar username did not fail loudly (rc=$rc) -- may be scanning a corrupted pattern" ;;
esac

# ---------- preserved surface ----------
t "C-40 upstream Starter Kit README section PRESERVED (PR #1)"
grep -qi 'starter kit' README.md && ok "Starter Kit section present" \
  || bad "upstream PR #1 section dropped from README"

t "C-41 sync-from-manifest.mjs is IDEMPOTENT"
node scripts/sync-from-manifest.mjs >/dev/null 2>&1 || bad "generator failed on a valid manifest"
cp README.md /tmp/_r1.bak; cp .claude-plugin/marketplace.json /tmp/_mk1.bak
node scripts/sync-from-manifest.mjs >/dev/null 2>&1
cmp -s README.md /tmp/_r1.bak && cmp -s .claude-plugin/marketplace.json /tmp/_mk1.bak \
  && ok "second run produced no diff" || bad "generator is NOT idempotent"
rm -f /tmp/_r1.bak /tmp/_mk1.bak
[ -z "$(git status --porcelain README.md .claude-plugin/marketplace.json)" ] \
  && ok "generator left committed files unchanged" || bad "generator mutated committed files"

t "C-36 Gate 0 marked complete in the decision doc"
DEC="$HOME/vault/decisions/2026-07-16-m2ai-skills-pack-one-click-cursor-claude-code.md"
if [ ! -f "$DEC" ]; then
  bad "decision doc not found at $DEC"
elif grep -qiE 'gate 0.*(complete|done)|status.*gate 0.*complete' "$DEC"; then
  ok "Gate 0 completion marker present"
else
  bad "decision doc has no Gate 0 completion marker (card sink unmet)"
fi

t "C-21 wip-snapshot cron restored and ACTIVE (not left commented)"
if crontab -l 2>/dev/null | grep -qE '^\s*\*/30 \* \* \* \* .*git-wip-snapshot\.sh'; then
  ok "cron active"
else
  bad "cron still paused or missing -- RESTORE IT"
fi

echo
echo "================================"
echo "  passed: $pass   failed: $fail"
echo "================================"
[ "$fail" -eq 0 ]
