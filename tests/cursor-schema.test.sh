#!/usr/bin/env bash
# Cursor manifest validation — card Q-20260716-0002, claim C-37.
#
#   bash tests/cursor-schema.test.sh
#
# SCOPE, STATED HONESTLY. This is a SCHEMA/SHAPE check, NOT an install test. The `cursor` binary
# is not installed on the machine this pack is developed on, so the real Cursor install path is
# UNVERIFIED and nothing here may claim otherwise (C-34). What this file buys: the README states
# the Cursor manifests are "validated against Cursor's documented schema and against the shape of
# cursor/plugins' own live marketplace.json". Codex round 1 correctly flagged that this was a
# README claim with no code behind it -- a claim nothing machine-checks is a claim that rots.
# This makes the claim enforceable, so a future edit that breaks Cursor shape breaks a test here
# instead of breaking a marketplace submission.
#
# Rules encoded (source: cursor.com/docs/plugins + the live .cursor-plugin/marketplace.json in
# github.com/cursor/plugins, which IS the reference implementation; both read 2026-07-16):
#   - .cursor-plugin/plugin.json      : `name` is the ONLY required key.
#   - .cursor-plugin/marketplace.json : entries carry a BARE top-level dir name as `source`
#                                       (Cursor's own repo uses "teaching", not "./teaching").
#   - components (skills/, rules/, agents/, ...) are AUTO-DISCOVERED and need no declaration.

set -uo pipefail
cd "$(dirname "$0")/.."

pass=0; fail=0
ok()  { echo "  PASS  $1"; pass=$((pass+1)); }
bad() { echo "  FAIL  $1"; fail=$((fail+1)); }
t()   { echo; echo "$1"; }

t "C-37 .cursor-plugin/plugin.json satisfies Cursor's documented schema"
node - <<'JS' && ok "all per-plugin Cursor manifests valid" || bad "invalid Cursor plugin manifest"
const fs = require('fs');
const m = JSON.parse(fs.readFileSync('skills-manifest.json', 'utf8'));
let bad = 0;
for (const p of m.plugins) {
  const f = `${p.id}/.cursor-plugin/plugin.json`;
  if (!fs.existsSync(f)) { console.log(`    missing: ${f}`); bad++; continue; }
  let d;
  try { d = JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { console.log(`    not valid JSON: ${f} (${e.message})`); bad++; continue; }
  // `name` is the only REQUIRED key per Cursor's docs.
  if (typeof d.name !== 'string' || !d.name.length) { console.log(`    missing/empty required 'name': ${f}`); bad++; }
  // The dir name IS the identity Cursor resolves via marketplace `source`; a mismatch would
  // resolve to the wrong plugin.
  else if (d.name !== p.id) { console.log(`    name '${d.name}' != dir '${p.id}': ${f}`); bad++; }
  if ('description' in d && (typeof d.description !== 'string' || !d.description.length)) {
    console.log(`    'description' present but empty: ${f}`); bad++;
  }
}
process.exit(bad ? 1 : 0);
JS

t "C-37c .cursor-plugin/plugin.json satisfies Cursor's REVIEW bar, not just its docs"
# The docs (cursor.com/docs/plugins) say only `name` is required, so C-37 above tests exactly that.
# Cursor's own review-plugin-submission skill (cursor/plugins) applies a STRICTER bar and requires
# name + description + version + author + license "required and coherent". Building to the docs and
# submitting against the reviewer is how a submission gets bounced for something the docs never
# asked for. Both bars are tested on purpose: C-37 is what Cursor promises to load, C-37c is what a
# human reviewer will actually check.
node - <<'JS' && ok "all 7 satisfy the reviewer's required fields" || bad "a plugin would be bounced by Cursor's review checklist"
const fs = require('fs');
const m = JSON.parse(fs.readFileSync('skills-manifest.json', 'utf8'));
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PERMISSIVE = ['MIT', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0'];
let bad = 0;
for (const p of m.plugins) {
  const f = `${p.id}/.cursor-plugin/plugin.json`;
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const k of ['name', 'description', 'version', 'author', 'license']) {
    if (!d[k] || (typeof d[k] === 'string' && !d[k].trim())) {
      console.log(`    missing/empty '${k}': ${f}`); bad++;
    }
  }
  if (d.name && !KEBAB.test(d.name)) { console.log(`    'name' not lowercase kebab-case: ${d.name}`); bad++; }
  // Publisher Terms bar copyleft outright: GPL/AGPL/LGPL cannot ship on the Marketplace.
  if (d.license && !PERMISSIVE.includes(d.license)) {
    console.log(`    license '${d.license}' is not on the permissive allowlist: ${f}`); bad++;
  }
}
process.exit(bad ? 1 : 0);
JS

t "C-37d the declared license matches the actual LICENSE file"
# A manifest claiming MIT over a GPL LICENSE file is worse than claiming nothing.
head -1 LICENSE | grep -qi "MIT License" \
  && ok "LICENSE is MIT, matching every manifest's declared license" \
  || bad "LICENSE file does not match the MIT declared in the manifests"

t "C-37 .cursor-plugin/marketplace.json matches cursor/plugins' live shape"
node - <<'JS' && ok "Cursor marketplace shape valid" || bad "Cursor marketplace shape invalid"
const fs = require('fs');
const m = JSON.parse(fs.readFileSync('skills-manifest.json', 'utf8'));
const f = '.cursor-plugin/marketplace.json';
if (!fs.existsSync(f)) { console.log(`    missing: ${f}`); process.exit(1); }
let d;
try { d = JSON.parse(fs.readFileSync(f, 'utf8')); }
catch (e) { console.log(`    not valid JSON (${e.message})`); process.exit(1); }
let bad = 0;
if (typeof d.name !== 'string' || !d.name.length) { console.log("    missing required 'name'"); bad++; }
if (!Array.isArray(d.plugins) || !d.plugins.length) { console.log("    missing/empty 'plugins'"); bad++; }
const ids = new Set(m.plugins.map((p) => p.id));
for (const p of d.plugins || []) {
  if (!p.name || !ids.has(p.name)) { console.log(`    entry names a plugin absent from the manifest: ${p.name}`); bad++; }
  if (typeof p.source !== 'string' || !p.source.length) { console.log(`    entry has no 'source': ${p.name}`); bad++; continue; }
  // THE load-bearing assertion. Cursor's own live marketplace.json uses a BARE dir name.
  // Claude Code's format uses "./<dir>". The two are near-mirrors and it is genuinely easy to
  // paste the Claude form here; that would break Cursor resolution while looking correct.
  if (p.source.startsWith('./') || p.source.startsWith('/')) {
    console.log(`    'source' must be a BARE top-level dir name, got '${p.source}' (that is the Claude Code form)`); bad++;
  } else if (p.source !== p.name) {
    console.log(`    'source' '${p.source}' does not match plugin dir '${p.name}'`); bad++;
  } else if (!fs.existsSync(p.source)) {
    console.log(`    'source' points at a dir that does not exist: ${p.source}`); bad++;
  }
}
if ((d.plugins || []).length !== m.plugins.length) {
  console.log(`    ${d.plugins.length} entries, manifest has ${m.plugins.length}`); bad++;
}
process.exit(bad ? 1 : 0);
JS

t "C-37 Cursor auto-discovers skills/ -- the dir must actually be there"
# Cursor declares nothing for components; it looks in default dirs. If skills/ is absent or empty
# under a plugin, Cursor silently ships an empty plugin -- no error, nothing to notice.
miss=0
for p in $(node -e 'require("./skills-manifest.json").plugins.forEach((p) => console.log(p.id))'); do
  n=$(find "$p/skills" -maxdepth 2 -name SKILL.md 2>/dev/null | wc -l)
  [ "$n" -gt 0 ] || { echo "    $p/skills/ has no SKILL.md -- Cursor would ship an empty plugin"; miss=$((miss+1)); }
done
[ "$miss" = "0" ] && ok "every plugin has a non-empty skills/ for Cursor to discover" \
  || bad "$miss plugin(s) would ship empty to Cursor"

# C-37a. Cursor's own `review-plugin-submission` skill (cursor/plugins) names "missing frontmatter
# on discoverable components" as an explicit REJECTION criterion, and requires skills/*/SKILL.md to
# carry BOTH `name` and `description`. This check exists because the rest of this suite validated
# manifests and dir presence, passed 5/5, and still missed that `get-api-docs` and `model-audit`
# shipped with only `argument-hint`. It is not a Cursor-only concern: a skill with no `description`
# cannot auto-trigger in Claude Code either, so it silently degrades to explicit-invoke-only.
# Parse ONLY the leading frontmatter block; a `description:` line in the body is not frontmatter.
t "C-37a every discoverable skill has name AND description frontmatter"
missfm=0; checked=0
while IFS= read -r f; do
  checked=$((checked+1))
  hn=$(awk 'NR==1 && $0!="---"{exit} /^---$/{c++; if(c==2) exit; next} c==1 && /^name:[[:space:]]*[^[:space:]]/{print "y"; exit}' "$f")
  hd=$(awk 'NR==1 && $0!="---"{exit} /^---$/{c++; if(c==2) exit; next} c==1 && /^description:[[:space:]]*[^[:space:]]/{print "y"; exit}' "$f")
  if [ "$hn" != "y" ] || [ "$hd" != "y" ]; then
    echo "    ${f} name=${hn:-MISSING} description=${hd:-MISSING}"
    missfm=$((missfm+1))
  fi
done < <(node -e 'require("./skills-manifest.json").plugins.forEach((p) => console.log(p.id))' | while read -r p; do find "$p/skills" -maxdepth 2 -name SKILL.md; done)
[ "$checked" -gt 0 ] || bad "C-37a scanned ZERO skills -- pathspec matched nothing, this check is blind"
[ "$checked" -gt 0 ] && { [ "$missfm" = "0" ] && ok "all $checked skills carry name + description" \
  || bad "$missfm of $checked skills would be REJECTED by Cursor for missing frontmatter"; }

t "C-37b C-37a actually fires (planted control)"
# Without this, "no skills missing frontmatter" and "the check never read a file" look identical.
_p="$(node -e 'console.log(require("./skills-manifest.json").plugins[0].id)')/skills/_fmprobe_$$"
mkdir -p "$_p" && printf -- '---\nargument-hint: x\n---\n\n# probe\n' > "$_p/SKILL.md"
_bad=0
while IFS= read -r f; do
  hn=$(awk 'NR==1 && $0!="---"{exit} /^---$/{c++; if(c==2) exit; next} c==1 && /^name:[[:space:]]*[^[:space:]]/{print "y"; exit}' "$f")
  [ "$hn" = "y" ] || _bad=$((_bad+1))
done < <(find "$(dirname "$_p")" -maxdepth 2 -name SKILL.md)
[ "$_bad" -gt 0 ] && ok "planted a frontmatter-less skill and the check caught it" \
  || bad "planted a frontmatter-less skill and the check stayed green -- it is blind"
rm -rf "$_p"

t "C-34 this suite does NOT claim a Cursor install was tested"
# Guards the honesty constraint itself: if someone later makes this file assert an install,
# that is a false claim, because `cursor` is not installed here.
if command -v cursor >/dev/null 2>&1; then
  echo "  NOTE  a 'cursor' binary now EXISTS on this machine -- the UNVERIFIED marker in README.md"
  echo "        and the scope note at the top of this file should be revisited, and a real Cursor"
  echo "        install test written. Until then this remains a schema check only."
  ok "cursor present, but this suite still only claims a schema check (honest)"
else
  ok "no cursor binary; schema-check-only scope is accurate and README says UNVERIFIED"
fi
grep -qi 'UNVERIFIED' README.md && ok "README carries the UNVERIFIED marker for the Cursor path" \
  || bad "README dropped the UNVERIFIED marker -- it would be claiming untested support"

echo
echo "================================"
echo "  passed: $pass   failed: $fail"
echo "================================"
[ "$fail" -eq 0 ]
