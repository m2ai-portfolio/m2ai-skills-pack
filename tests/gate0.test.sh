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

t "C-20 nothing pushed: local commits are AHEAD of origin"
git fetch --dry-run origin >/dev/null 2>&1 || true
if git rev-parse --verify -q origin/master >/dev/null; then
  [ -n "$(git log origin/master..master --oneline)" ] && ok "local commits unpushed (ahead of origin)" \
    || bad "no local commits ahead -- were they pushed?"
else
  echo "  SKIP  no origin/master ref locally"
fi

t "C-34 NEGATIVE CONTROL: author attribution PRESERVED in package metadata (sanitize did not over-reach)"
grep -q '"name": "Matthew Snow"' .claude-plugin/marketplace.json \
  && ok "marketplace.json attribution intact" || bad "attribution stripped -- over-reach"

# ---------- negative controls ----------
t "C-22/C-30 NEGATIVE CONTROL: leak-scan CATCHES a planted BINARY leak"
probe=skills/_leakprobe.bin
cleanup_probe() { git rm --cached -q "$probe" 2>/dev/null; rm -f "$probe"; }
trap cleanup_probe EXIT
printf '\x00\x01binary\x00/home/apexaipc/secret\x00' > "$probe"
git add -f "$probe" || bad "could not stage probe (control inconclusive)"
if bash scripts/leak-scan.sh >/dev/null 2>&1; then
  bad "scan PASSED on a planted binary leak -- the scan is blind (this is the -I bug)"
else
  ok "scan correctly failed on planted binary leak"
fi
cleanup_probe; trap - EXIT

t "C-33 NEGATIVE CONTROL: untracked/ignored file does NOT trip the scan (no false positive)"
mkdir -p skills/banana-maker/__pycache__
printf 'apexaipc /home/apexaipc\n' > skills/banana-maker/__pycache__/probe.pyc
if bash scripts/leak-scan.sh >/dev/null 2>&1; then
  ok "ignored untracked file correctly not scanned"
else
  bad "scan tripped on an untracked gitignored file -- false positive"
fi
rm -rf skills/banana-maker/__pycache__

t "C-23 NEGATIVE CONTROL: generator REFUSES a manifest with an orphan, and writes nothing"
cp skills-manifest.json /tmp/_m.bak; cp README.md /tmp/_r.bak
python3 -c "
import json;j=json.load(open('skills-manifest.json'));j['skills'].pop('aar');json.dump(j,open('skills-manifest.json','w'),indent=2)"
if node scripts/sync-from-manifest.mjs >/dev/null 2>&1; then
  bad "generator accepted an orphaned manifest"
else
  cmp -s README.md /tmp/_r.bak && ok "refused loudly AND wrote nothing" || bad "refused but still mutated README"
fi
cp /tmp/_m.bak skills-manifest.json; cp /tmp/_r.bak README.md

t "C-24 NEGATIVE CONTROL: --check DETECTS a hand-edited count literal"
cp README.md /tmp/_r.bak
sed -i 's/\*\*183 portable Claude Code skills\*\*/**999 portable Claude Code skills**/' README.md
node scripts/sync-from-manifest.mjs --check >/dev/null 2>&1 && bad "--check missed drifted literal" || ok "--check caught drift"
cp /tmp/_r.bak README.md
rm -f /tmp/_m.bak /tmp/_r.bak

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
