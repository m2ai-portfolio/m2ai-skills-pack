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
# NOTE: this is the INSTALLED skill's venv under ~/.claude/skills/, which is a user-machine path
# and is NOT affected by the repo's plugin split. It stays `skills/banana-maker`.
SKILL_VENV="$HOME/.claude/skills/banana-maker/venv"

# Q-20260716-0002: the 183 skills moved from `skills/` into 7 top-level plugin dirs. Every repo
# path below is repointed, DERIVED from skills-manifest.json (the SSOT) rather than hardcoded, so
# a future re-grouping moves the tests with the layout instead of leaving them pointed at dirs
# that no longer exist -- a test whose pathspec matches nothing passes silently.
plugin_of() {  # <skill-name> -> plugin dir owning it
  node -e '
    const m = require("./skills-manifest.json");
    const d2p = {}; for (const p of m.plugins) for (const d of p.divisions) d2p[d] = p.id;
    const p = d2p[m.skills[process.argv[1]]];
    if (!p) process.exit(1);
    console.log(p);
  ' "$1"
}
BANANA="$(plugin_of banana-maker)/skills/banana-maker"
SILVER="$(plugin_of silver-platter)/skills/silver-platter"
# PROBE_DIR must sit INSIDE a scanned scope (C-42). A probe planted where leak-scan.sh does not
# look means every plant_expect_pass "passes" without the scan ever reading the file: green, and
# proving nothing.
PROBE_DIR="$(plugin_of banana-maker)/skills"
PLUGIN_GLOB="$(node -e '
  const m = require("./skills-manifest.json");
  console.log(m.plugins.map((p) => p.id + "/skills/").join(" "));
')"
if [ -z "$BANANA" ] || [ -z "$SILVER" ] || [ -z "$PROBE_DIR" ] || [ -z "$PLUGIN_GLOB" ]; then
  echo "FATAL: could not derive plugin paths from skills-manifest.json -- refusing to run a suite"
  echo "       whose paths may silently match nothing."
  exit 1
fi

# C-38: probes must NEVER plant a real person's username. This file ships in a public repo; a
# literal username here would re-introduce the identifier the gate exists to remove. PROBE_USER is
# a synthetic name that is nobody's identity, and is passed to the scan via the ADDITIVE
# LEAK_SCAN_EXTRA_USERS seam so the bare-token path is exercised without hardcoding anyone.
# The seam is additive by design (C-46): it can only ADD tokens to scan, never redirect the scan
# away from the real runtime-derived `id -un`. A replace-style seam was a genuine bypass.
PROBE_USER="zzprobeuser"

# Codex r2 HIGH (adopted). The negative controls below back up real repo files (README.md,
# marketplace.json, skills-manifest.json) to a temp dir and copy them BACK afterwards. They used
# fixed, predictable /tmp names, which is a symlink-plant vector on a shared machine: a local user
# can pre-create that exact path as a symlink, and then the backup step clobbers whatever it points
# at, while the restore step can feed attacker-controlled content straight back into a tracked file
# that is about to be committed. A private 0700 mktemp dir closes both directions.
TMPD=$(mktemp -d) || { echo "FATAL: cannot create a private temp dir"; exit 1; }
chmod 700 "$TMPD"
trap 'rm -rf "$TMPD"' EXIT

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
  local p="$PROBE_DIR/_probe_$$.md"
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
  local p="$PROBE_DIR/_probe_$$.md"
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
[ -z "$(git ls-files $BANANA/__pycache__/)" ] && ok "no __pycache__ in index" || bad "still tracked"

t "C-02 no build artifacts tracked anywhere"
[ -z "$(git ls-files | grep -E '__pycache__|/venv/|\.pyc$')" ] && ok "index clean" || bad "artifacts tracked"

# C-02a: the ORIGINAL C-02 pattern only knew about venvs and pycache, so it passed while 4.8MB of
# generated images sat tracked in $BANANA/output/ (69% of the pack's tracked weight)
# and a real audit run sat in m2ai-build-tooling/skills/skill-maintenance/reports/. A skill WRITES to these dirs, so
# anything tracked in one is a leftover from someone's usage. Deliberately narrow: examples/,
# references/, evals/ and scripts/ are legitimate tracked documentation and must NOT appear here.
t "C-02a no runtime artifact DIRS tracked under skills/"
[ -z "$(git ls-files -- $PLUGIN_GLOB | grep -E '/(output|reports|dist|build|logs|tmp|node_modules|\.pytest_cache)/')" ] \
  && ok "no artifact dirs in index" || bad "artifact dir tracked: $(git ls-files -- $PLUGIN_GLOB | grep -E '/(output|reports|dist|build|logs|tmp|node_modules|\.pytest_cache)/' | head -3 | tr '\n' ' ')"

t "C-02b legitimate doc subdirs are still tracked (guards against over-ignoring)"
[ -n "$(git ls-files $SILVER/examples/)" ] && ok "examples/ still tracked" || bad "examples/ wrongly untracked"
[ -n "$(git ls-files $SILVER/references/)" ] && ok "references/ still tracked" || bad "references/ wrongly untracked"

t "C-03 .gitignore covers the artifact classes"
git check-ignore -q $BANANA/__pycache__/x.pyc && ok ".pyc ignored" || bad ".pyc NOT ignored"
git check-ignore -q $BANANA/venv/x && ok "venv ignored" || bad "venv NOT ignored"

t "C-03a .gitignore covers runtime artifact dirs"
git check-ignore -q $BANANA/output/x.png && ok "output/ ignored" || bad "output/ NOT ignored"
git check-ignore -q m2ai-build-tooling/skills/skill-maintenance/reports/x.json && ok "reports/ ignored" || bad "reports/ NOT ignored"

t "C-03b .gitignore does NOT swallow legitimate doc subdirs"
git check-ignore -q $SILVER/examples/x.md && bad "examples/ wrongly ignored" || ok "examples/ not ignored"
git check-ignore -q $SILVER/references/x.md && bad "references/ wrongly ignored" || ok "references/ not ignored"

# ---------- item 2: venv relocation ----------
t "C-04 venv absent from work-tree"
[ ! -e $BANANA/venv ] && ok "no venv in repo" || bad "venv still in work-tree"

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
python3 -c "import ast,sys; ast.parse(open('$BANANA/generate_image.py').read())" \
  && ok "parses" || bad "syntax error"

# ---------- item 3: sanitization ----------
t "C-07 trace-prompt free of internal product names"
[ -z "$(git grep -in -E 'claudeclaw|ccos' -- m2ai-agent-ops/skills/trace-prompt/)" ] && ok "clean" || bad "internal name present"

t "C-08..C-10 named files free of personal name"
[ -z "$(git grep -in matthew -- $BANANA/ m2ai-strategy-analysis/skills/launch-filter/ m2ai-workflow-content/skills/viral-shorts-pipeline/)" ] \
  && ok "clean" || bad "personal name present"

t "C-11 the 4 sanitized skills still declare working frontmatter"
for f in m2ai-agent-ops/skills/trace-prompt/SKILL.md $BANANA/SKILL.md m2ai-strategy-analysis/skills/launch-filter/SKILL.md; do
  n=$(awk '/^---$/{c++;next} c==1 && /^name:/{print;exit}' "$f")
  d=$(awk '/^---$/{c++;next} c==1 && /^description:/{print;exit}' "$f")
  [ -n "$n" ] && [ -n "$d" ] && ok "$(basename $(dirname $f)) frontmatter intact" || bad "$f frontmatter broken"
done

t "C-11b viral-shorts registry still parses as YAML with its keys"
python3 - <<'PY' && ok "yaml intact" || bad "yaml broken"
import sys
try: import yaml
except ImportError: print("  (pyyaml absent, structural check only)"); sys.exit(0)
d=yaml.safe_load(open('m2ai-workflow-content/skills/viral-shorts-pipeline/skill-registry.yaml'))
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

t "C-14 zero orphans, zero ghosts, zero duplicates (symmetric diff, both directions)"
python3 - <<'PY' && ok "manifest == disk, each skill in exactly one plugin" || bad "manifest/disk mismatch"
import json,os,sys
j=json.load(open('skills-manifest.json'))
m=set(j['skills'])
# Walk the PLUGIN dirs, not a top-level skills/ (which no longer exists). Tracks which plugin
# each skill was found in so a skill present in TWO plugins is caught -- the old single-dir walk
# could not express that failure at all.
seen={}
dupes=[]
for p in j['plugins']:
    d=f"{p['id']}/skills"
    if not os.path.isdir(d): print("  missing plugin dir:", d); sys.exit(1)
    for x in os.listdir(d):
        if os.path.isfile(f'{d}/{x}/SKILL.md'):
            if x in seen: dupes.append(f"{x} in {seen[x]} and {p['id']}")
            seen[x]=p['id']
if dupes: print("  duplicates:", dupes); sys.exit(1)
d=set(seen)
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
j=json.load(open('skills-manifest.json'))
n=len(j['skills'])
r=open('README.md').read()
# Q-20260716-0002: marketplace.json no longer carries ONE total -- it carries 7 per-plugin
# counts. The old regex `"(\d+) portable skills` now matches whichever plugin happens to be
# listed first (it read 27, the agent-architecture count, and called it the pack total). Sum the
# per-plugin counts instead, and separately assert each one against the manifest so a wrong
# split cannot hide inside a right total.
mk=json.load(open('.claude-plugin/marketplace.json'))
cur=json.load(open('.cursor-plugin/marketplace.json'))
d2p={d:p['id'] for p in j['plugins'] for d in p['divisions']}
expect={}
for s,d in j['skills'].items(): expect[d2p[d]]=expect.get(d2p[d],0)+1
for name,doc in (('claude',mk),('cursor',cur)):
    if len(doc['plugins'])!=len(j['plugins']):
        print(f"  {name} marketplace has {len(doc['plugins'])} entries, manifest has {len(j['plugins'])}"); sys.exit(1)
    for p in doc['plugins']:
        got_n=int(re.match(r'(\d+) portable skills',p['description']).group(1))
        if got_n!=expect[p['name']]:
            print(f"  {name} marketplace says {p['name']}={got_n}, manifest says {expect[p['name']]}"); sys.exit(1)
mk_total=sum(int(re.match(r'(\d+) portable skills',p['description']).group(1)) for p in mk['plugins'])
got={
 'manifest': n,
 'marketplace_sum': mk_total,
 'blurb': int(re.search(r'\*\*(\d+) portable Claude Code skills\*\*',r).group(1)),
 'badge': int(re.search(r'badge/skills-(\d+)-brightgreen',r).group(1)),
 'summary_total': int(re.search(r'\|\s*\|\s*\*\*(\d+)\*\*\s*\|\s*\|',r).group(1)),
 # The link target now carries the plugin dir. This regex previously read `\]\(skills/` and would
 # have counted ZERO rows post-split -- caught only by the len(set())!=1 check below, and only by
 # luck. Anchoring on the plugin prefix makes the row prove membership, not just existence.
 'catalog_rows': len(re.findall(r'^\|\s*\[[a-z0-9-]+\]\(m2ai-[a-z-]+/skills/',r,re.M)),
}
print("  ",got)
if len(set(got.values()))!=1: sys.exit(1)
PY

# ---------- constraints ----------
t "C-18 .pyc REMAINS in git history (history not rewritten)"
[ -n "$(git log --all --oneline -- '*generate_image.cpython-312.pyc' 2>/dev/null)" ] \
  && ok "history intact" || bad "history appears rewritten -- OUT OF SCOPE"

t "C-19 INVERTED (Q-20260716-0002): the themed-plugin restructure HAS happened"
# SUPERSESSION, recorded deliberately rather than deleted. Under Gate 0 (card Q-20260716-0001)
# this test asserted the OPPOSITE -- "no themed plugin dirs" and "all 183 still under skills/" --
# because restructuring was explicitly out of scope for THAT card. Card Q-20260716-0002's
# Done-when requires exactly the restructure Gate 0 forbade, so the constraint is inverted, not
# dropped. Keeping it inverted (rather than removing it) preserves the invariant in both
# directions: a partial or accidental revert to the monolith now BREAKS THE SUITE instead of
# passing silently.
EXPECTED_PLUGINS=$(node -e '
  const m = require("./skills-manifest.json");
  console.log(m.plugins.length);
')
ACTUAL_PLUGINS=$(ls -d m2ai-*/ 2>/dev/null | wc -l)
[ "$ACTUAL_PLUGINS" = "$EXPECTED_PLUGINS" ] \
  && ok "$ACTUAL_PLUGINS themed plugin dirs present (manifest says $EXPECTED_PLUGINS)" \
  || bad "expected $EXPECTED_PLUGINS plugin dirs, found $ACTUAL_PLUGINS"
[ ! -e skills ] && ok "the old monolithic skills/ dir is gone" || bad "skills/ still exists -- split incomplete"
[ "$(find m2ai-*/skills -maxdepth 2 -name SKILL.md 2>/dev/null | wc -l)" = "183" ] \
  && ok "all 183 skills live under the plugin dirs" || bad "skill count under plugins != 183"

t "C-20 INVERTED (Phase 3, 2026-07-16): the work IS published, and local matches the remote"
# THIS GUARD WAS NOT WEAKENED, ITS PREMISE WAS LIFTED BY THE OWNER. Read before touching it.
#
# C-20 originally asserted "nothing pushed", and it enforced that faithfully for the whole build:
# it is the check that kept an unsanitized 183-skill pack off a PUBLIC repo (3 stargazers, 1 fork)
# while Gate 0 was still finding leaks. It then FAILED, correctly, the moment the push happened.
#
# On 2026-07-16 Matthew authorized the push explicitly, in his own words, after a pre-push audit
# showed him the repo was public and that the split would break existing installs. The publish is
# the POINT of Phase 3, so an assertion that nothing was ever published is now asserting a
# constraint that was deliberately retired. Leaving it red would train everyone to ignore a red
# suite; deleting it would silently drop the only check that touches the remote at all.
#
# So it is INVERTED, exactly as C-19 was when the restructure legitimately happened. The mechanism
# is unchanged and still queries the REMOTE (local ahead/behind cannot prove anything about what
# origin actually has). Only the expected verdict flipped. What it now proves is still worth
# proving: that what is published is exactly what was tested here, so a green suite on this
# checkout is a statement about the artifact the public can actually clone.
#
# If a future phase needs a never-push constraint again (a new branch, a new repo), write a NEW
# claim for it. Do not edit this one back and forth: a guard that flips with the wind is noise.
GATE0_SHA=$(git rev-parse HEAD)
if [ -z "$GATE0_SHA" ]; then
  bad "cannot resolve HEAD -- C-20 inconclusive"
elif ! git ls-remote --exit-code origin >/dev/null 2>&1; then
  echo "  SKIP  remote unreachable (offline) -- C-20 cannot be proven without the remote"
else
  # Q-20260716-0002: check EVERY remote ref, not just master. This work lives on
  # feature/themed-plugin-split, so a push would create refs/heads/feature/themed-plugin-split
  # and sail straight past a master-only assertion -- the constraint is "never pushed", not
  # "never pushed to master".
  #
  # `git ls-remote origin` is also the only sound probe here: it asks the REMOTE what it has.
  # Local ahead/behind cannot prove a push never happened.
  REMOTE_REFS=$(git ls-remote --heads origin | cut -f1 | sort -u)
  if [ -z "$REMOTE_REFS" ]; then
    echo "  SKIP  origin has no branches"
  else
    git fetch -q origin 2>/dev/null || true
    pushed=""
    for rref in $REMOTE_REFS; do
      # If HEAD had ever been pushed, it would be an ANCESTOR of some remote branch tip.
      # `git cat-file -e` guards refs we could not fetch (merge-base errors on unknown objects).
      git cat-file -e "$rref" 2>/dev/null || continue
      if git merge-base --is-ancestor "$GATE0_SHA" "$rref" 2>/dev/null; then
        pushed="$rref"; break
      fi
    done
    if [ -n "$pushed" ]; then
      ok "HEAD ${GATE0_SHA:0:7} is on the remote -- published, and what is public is what this suite tested"
    else
      bad "HEAD ${GATE0_SHA:0:7} is NOT on any remote branch -- local work is unpublished, so a green suite here says nothing about what the public can clone"
    fi
  fi
fi

t "C-35 work landed as LOCAL COMMITS on the working branch, tree clean"
# Q-20260716-0002: Gate 0 landed on master; this card works on feature/themed-plugin-split.
# Anchor on the CURRENT branch so the test follows the work instead of asserting against
# whichever branch happened to be right in July.
WORKING_BRANCH=$(git branch --show-current)
[ -n "$(git log --oneline "$WORKING_BRANCH" -n 5)" ] \
  && ok "commits present on $WORKING_BRANCH" || bad "no commits on $WORKING_BRANCH"
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
probe=$PROBE_DIR/_leakprobe.bin
cleanup_probe() { git rm --cached -q "$probe" 2>/dev/null; rm -f "$probe"; }
# `trap` REPLACES the handler rather than adding to it, so a bare `trap cleanup_probe EXIT` here
# would silently drop the TMPD cleanup installed at the top, and the `trap - EXIT` below would
# then leave the temp dir behind on every run. Chain both explicitly.
trap 'cleanup_probe; rm -rf "$TMPD"' EXIT
printf '\x00\x01binary\x00/home/%s/secret\x00' "$PROBE_USER" > "$probe"
git add -f "$probe" || bad "could not stage probe (control inconclusive)"
if LEAK_SCAN_EXTRA_USERS="$PROBE_USER" bash scripts/leak-scan.sh >/dev/null 2>&1; then
  bad "scan PASSED on a planted binary leak -- the scan is blind (this is the -I bug)"
else
  ok "scan correctly failed on planted binary leak"
fi
cleanup_probe; trap 'rm -rf "$TMPD"' EXIT   # restore the TMPD cleanup, do not clear the trap

t "C-33 NEGATIVE CONTROL: untracked/ignored file does NOT trip the scan (no false positive)"
mkdir -p $BANANA/__pycache__
printf '%s /home/%s\n' "$PROBE_USER" "$PROBE_USER" > $BANANA/__pycache__/probe.pyc
if LEAK_SCAN_EXTRA_USERS="$PROBE_USER" bash scripts/leak-scan.sh >/dev/null 2>&1; then
  ok "ignored untracked file correctly not scanned"
else
  bad "scan tripped on an untracked gitignored file -- false positive"
fi
rm -rf $BANANA/__pycache__

t "C-23 NEGATIVE CONTROL: generator REFUSES a manifest with an orphan, and writes NOTHING"
# FIXED (Codex r1 MEDIUM, adopted per Matthew decision (5)): round 1 asserted only that README.md
# was unmutated. The generator writes TWO files -- a partial write to marketplace.json on the
# refusal path would have slipped through silently. Assert BOTH are byte-identical.
cp skills-manifest.json "$TMPD/m.bak"; cp README.md "$TMPD/r.bak"; cp .claude-plugin/marketplace.json "$TMPD/mk.bak"
python3 -c "
import json;j=json.load(open('skills-manifest.json'));j['skills'].pop('aar');json.dump(j,open('skills-manifest.json','w'),indent=2)"
if node scripts/sync-from-manifest.mjs >/dev/null 2>&1; then
  bad "generator accepted an orphaned manifest"
else
  r_ok=0; m_ok=0
  cmp -s README.md "$TMPD/r.bak" && r_ok=1
  cmp -s .claude-plugin/marketplace.json "$TMPD/mk.bak" && m_ok=1
  if [ "$r_ok" = 1 ] && [ "$m_ok" = 1 ]; then
    ok "refused loudly AND wrote nothing (BOTH README and marketplace.json untouched)"
  else
    [ "$r_ok" = 1 ] || bad "refused but still mutated README.md"
    [ "$m_ok" = 1 ] || bad "refused but still mutated .claude-plugin/marketplace.json (partial write)"
  fi
fi
cp "$TMPD/m.bak" skills-manifest.json; cp "$TMPD/r.bak" README.md; cp "$TMPD/mk.bak" .claude-plugin/marketplace.json
rm -f "$TMPD/mk.bak"

t "C-24 NEGATIVE CONTROL: --check DETECTS a hand-edited count literal"
cp README.md "$TMPD/r.bak"
sed -i 's/\*\*183 portable Claude Code skills\*\*/**999 portable Claude Code skills**/' README.md
node scripts/sync-from-manifest.mjs --check >/dev/null 2>&1 && bad "--check missed drifted literal" || ok "--check caught drift"
cp "$TMPD/r.bak" README.md
rm -f "$TMPD/m.bak" "$TMPD/r.bak"

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
  bp="$PROBE_DIR/_probe_bypass_$$.md"
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
  sp="$PROBE_DIR/_probe_spoof_$$.md"
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
cp README.md "$TMPD/r1.bak"; cp .claude-plugin/marketplace.json "$TMPD/mk1.bak"
node scripts/sync-from-manifest.mjs >/dev/null 2>&1
cmp -s README.md "$TMPD/r1.bak" && cmp -s .claude-plugin/marketplace.json "$TMPD/mk1.bak" \
  && ok "second run produced no diff" || bad "generator is NOT idempotent"
rm -f "$TMPD/r1.bak" "$TMPD/mk1.bak"
[ -z "$(git status --porcelain README.md .claude-plugin/marketplace.json)" ] \
  && ok "generator left committed files unchanged" || bad "generator mutated committed files"

t "C-25/C-48 banana-maker's untracked output/ survived the move AND is hidden from git"
# Codex r3 coverage gap (adopted). This was verified by hand during the move and passed -- but a
# hand-check is not a test, and this is the single most expensive thing to get wrong: `git mv` of
# a directory relocates UNTRACKED children physically while staging only the tracked renames, and
# the wip-snapshot cron runs `git add -A` on this repo every 30 min. If the ignore rule does not
# cover the NEW depth, 4.8MB of generated images become tracked within half an hour. `*` does not
# cross `/`, so the old `skills/*/output/` silently stopped matching the moment a plugin dir was
# inserted above it. Assert the whole chain, not the pattern text.
if [ -d "$BANANA/output" ]; then
  n=$(find "$BANANA/output" -type f | wc -l)
  [ "$n" -gt 0 ] && ok "output/ physically followed the move ($n files at the new path)" \
    || bad "output/ exists but is EMPTY -- the untracked images did not follow the git mv"
  # ignored at the CONCRETE new path...
  f=$(find "$BANANA/output" -type f | head -1)
  git check-ignore -q "$f" && ok "a real file in output/ is ignored at the new depth" \
    || bad "output/ file NOT ignored at the new depth -- the cron will track it: $f"
  # ...and therefore invisible to `git add -A`, which is the property that actually matters.
  [ -z "$(git status --porcelain --untracked-files=all -- "$BANANA/output" 2>/dev/null)" ] \
    && ok "output/ is invisible to git status (git add -A cannot sweep it in)" \
    || bad "output/ is VISIBLE to git -- `git add -A` would commit it"
  [ -z "$(git ls-files "$BANANA/output")" ] && ok "output/ is not tracked" || bad "output/ IS tracked"
else
  echo "  SKIP  $BANANA/output does not exist on this machine (no generated images to guard)"
fi

t "C-40/C-41 leak-scan FAILS CLOSED when a scan root matches zero files"
# Codex r3 coverage gap (adopted). THE load-bearing control for this whole card, and it was only
# ever run by hand. `git grep` exits 1 for "no match" AND for "pathspec matched nothing" -- so a
# stale scan root reports a clean, green, zero-leak scan while reading NOTHING. This control
# caught a real bug in the first implementation: an aggregate-only file count let ONE dead root
# hide behind six live ones (344 -> 300 files, still "OK"). Mutate the manifest's plugin id to a
# dir that does not exist and assert the scan refuses to report clean.
cp skills-manifest.json "$TMPD/manifest.bak"
python3 -c "
import json
f='skills-manifest.json'
d=json.load(open(f))
d['plugins'][0]['id']='m2ai-zz-nonexistent-probe'
json.dump(d,open(f,'w'),indent=2)"
collapse_out=$(bash scripts/leak-scan.sh 2>&1); collapse_rc=$?
cp "$TMPD/manifest.bak" skills-manifest.json
case "$collapse_out" in
  *"matched ZERO tracked files"*)
    [ "$collapse_rc" -ne 0 ] && ok "zero-file scan root fails CLOSED (refuses to report clean)" \
      || bad "warned about a zero-file scan root but still exited 0" ;;
  *) bad "a dead scan root did NOT fail closed (rc=$collapse_rc) -- the scan can silently read nothing" ;;
esac
# Control: prove the mutation was actually restored, or every later test runs against a broken
# manifest and this "fix" becomes its own outage.
node scripts/sync-from-manifest.mjs --check >/dev/null 2>&1 \
  && ok "manifest restored after the mutation" || bad "manifest NOT restored -- later tests are compromised"

t "C-47 the Phase 2 gate is a REAL install, and exists as an executable artifact"
# Codex r1 coverage gap (adopted). The gate was originally proven by a human running the CLI in a
# session. It really passed -- but a hand-run proof is unverifiable to anyone who was not
# watching, which is indistinguishable from never having run it. The proof must be re-runnable.
if [ -f tests/phase2-gate.sh ]; then
  ok "tests/phase2-gate.sh exists (the gate is re-runnable, not a one-off claim)"
else
  bad "no executable Phase 2 gate -- the install proof is unverifiable"
fi
# It must drive the REAL CLI. A gate that only parses JSON is exactly the anti-pattern the card
# names: "An assertion that the JSON is well-formed is NOT the proof."
if grep -qE 'claude plugin marketplace add' tests/phase2-gate.sh 2>/dev/null \
   && grep -qE 'claude plugin install' tests/phase2-gate.sh 2>/dev/null \
   && grep -qE 'claude plugin list' tests/phase2-gate.sh 2>/dev/null; then
  ok "gate drives the real CLI (marketplace add + install + list)"
else
  bad "gate does not drive the real claude CLI -- a JSON assertion is not the proof"
fi
# ...and it must clean up, or it leaves the machine holding a local-path marketplace.
grep -qE 'plugin uninstall' tests/phase2-gate.sh 2>/dev/null \
  && grep -qE 'marketplace remove' tests/phase2-gate.sh 2>/dev/null \
  && ok "gate cleans up after itself (uninstall + marketplace remove)" \
  || bad "gate does not clean up the test install"
# C-37: the Cursor claim must be backed by a machine check, not just README prose.
[ -f tests/cursor-schema.test.sh ] && ok "tests/cursor-schema.test.sh backs the Cursor validation claim" \
  || bad "README claims Cursor validation with no test behind it"

t "C-19 the ONE-then-scale ordering is provable from git history"
# The card's Phase 2 gate is an ORDERING constraint ("Do not build all 7 and then test"), so it
# has to be checked against history, not asserted in prose. m2ai-workflow-content must appear in
# an EARLIER commit than the other six.
WFC_COMMIT=$(git log --format=%H --diff-filter=A -1 -- 'm2ai-workflow-content/skills/*/SKILL.md' 2>/dev/null | tail -1)
OTHER_COMMIT=$(git log --format=%H --diff-filter=A -1 -- 'm2ai-agent-ops/skills/*/SKILL.md' 2>/dev/null | tail -1)
if [ -z "$WFC_COMMIT" ] || [ -z "$OTHER_COMMIT" ]; then
  echo "  SKIP  cannot locate the introducing commits (shallow clone?)"
elif [ "$WFC_COMMIT" = "$OTHER_COMMIT" ]; then
  bad "all 7 plugins landed in ONE commit -- the one-end-to-end-then-scale gate was skipped"
elif git merge-base --is-ancestor "$WFC_COMMIT" "$OTHER_COMMIT" 2>/dev/null; then
  ok "m2ai-workflow-content (${WFC_COMMIT:0:7}) landed BEFORE the other plugins (${OTHER_COMMIT:0:7})"
else
  bad "m2ai-workflow-content did not land first -- proving order violated"
fi

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
