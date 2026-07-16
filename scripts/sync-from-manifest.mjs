#!/usr/bin/env node
// Generate every derived artifact from skills-manifest.json (the SSOT).
//
//   node scripts/sync-from-manifest.mjs           # write
//   node scripts/sync-from-manifest.mjs --check   # verify only, exit 1 on drift
//
// Generates:
//   README.md                                 counts, badge, summary table, catalog links
//   .claude-plugin/marketplace.json           7 plugin entries, "source": "./<id>"
//   .cursor-plugin/marketplace.json           7 plugin entries, bare "source": "<id>"
//   <plugin>/.claude-plugin/plugin.json       name + description (both required)
//   <plugin>/.cursor-plugin/plugin.json       name (required) + description
//
// Validates BEFORE writing: a manifest that disagrees with the filesystem is a hard failure,
// never a silent partial write. See PLAN.md claims C-05..C-14, C-46.
//
// Q-20260716-0002: this script previously read a single top-level `skills/` dir. That dir no
// longer exists -- the 183 skills live under <plugin>/skills/. A readdirSync on the old path
// would throw ENOENT, and the old catalog-row regex /\]\(skills\// would have matched ZERO rows
// while still "succeeding". Both are repointed here. The plugin dirs are DERIVED from the
// manifest, never globbed and never hardcoded, so the SSOT stays the only place membership lives.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
};

const manifest = JSON.parse(readFileSync(join(ROOT, 'skills-manifest.json'), 'utf8'));
const divisionIds = new Set(manifest.divisions.map((d) => d.id));
const skillNames = Object.keys(manifest.skills);
const focusById = new Map(manifest.divisions.map((d) => [d.id, d.focus]));

const AUTHOR = { name: 'Matthew Snow', email: 'matthew@memyselfplusai.com' };
const HOMEPAGE = 'https://github.com/m2ai-portfolio/m2ai-skills-pack';
const VERSION = '0.1.0';
// SPDX id emitted into every plugin manifest. Cursor's Publisher Terms allow permissive licenses
// only (MIT, BSD, Apache-2.0) and reject GPL/AGPL/LGPL, so this value is load-bearing for a
// submission, not decoration. It is declared here and independently enforced against the real
// LICENSE file by C-37d in tests/cursor-schema.test.sh: a manifest claiming MIT over a copyleft
// LICENSE would be worse than claiming nothing.
const LICENSE = 'MIT';

// ---- validate: plugin <-> division wiring (C-05, C-06, C-13) ----
const errors = [];
if (!Array.isArray(manifest.plugins) || manifest.plugins.length === 0) {
  fail('manifest has no `plugins` section -- it is the SSOT for the split');
  process.exit(1);
}
const divToPlugin = new Map();
for (const p of manifest.plugins) {
  if (!/^m2ai-[a-z-]+$/.test(p.id)) errors.push(`plugin id is not a valid dir name: ${p.id}`);
  for (const d of p.divisions) {
    if (!divisionIds.has(d)) errors.push(`plugin ${p.id} names an unknown division: ${d}`);
    if (divToPlugin.has(d)) {
      errors.push(`division ${d} claimed by BOTH ${divToPlugin.get(d)} and ${p.id}`);
    }
    divToPlugin.set(d, p.id);
  }
}
// every division must land in exactly one plugin, or skills silently vanish from the split
for (const d of divisionIds) {
  if (!divToPlugin.has(d)) errors.push(`division belongs to no plugin (its skills would be orphaned): ${d}`);
}
if (errors.length) {
  errors.forEach(fail);
  console.error(`\n${errors.length} plugin-wiring error(s). Nothing written.`);
  process.exit(1);
}

const pluginIds = manifest.plugins.map((p) => p.id);
const skillToPlugin = new Map(skillNames.map((s) => [s, divToPlugin.get(manifest.skills[s])]));

// ---- validate: manifest vs filesystem, both directions (C-07, C-46) ----
// Scans the manifest's plugin dirs. A skill sitting in the WRONG plugin dir is caught here:
// onDisk carries the dir it was actually found in, and is compared against the mapping.
const onDisk = new Map(); // skill -> plugin dir it was found in
for (const id of pluginIds) {
  const dir = join(ROOT, id, 'skills');
  if (!existsSync(dir)) {
    errors.push(`plugin dir missing on disk: ${id}/skills`);
    continue;
  }
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || !existsSync(join(dir, e.name, 'SKILL.md'))) continue;
    if (onDisk.has(e.name)) {
      errors.push(`skill appears in TWO plugins (duplicate): ${e.name} in ${onDisk.get(e.name)} and ${id}`);
    }
    onDisk.set(e.name, id);
  }
}
for (const [s, id] of onDisk) {
  if (!(s in manifest.skills)) errors.push(`skill on disk missing from manifest (orphan): ${id}/skills/${s}`);
  else if (skillToPlugin.get(s) !== id) {
    errors.push(`skill is in the wrong plugin dir: ${s} is in ${id}, manifest says ${skillToPlugin.get(s)}`);
  }
}
for (const s of skillNames) {
  if (!onDisk.has(s)) errors.push(`manifest names a skill not on disk (ghost): ${s}`);
  if (!divisionIds.has(manifest.skills[s])) {
    errors.push(`skill maps to unknown division: ${s} -> ${manifest.skills[s]}`);
  }
}
if (errors.length) {
  errors.forEach(fail);
  console.error(`\n${errors.length} validation error(s). Nothing written.`);
  process.exit(1);
}

const TOTAL = skillNames.length;
const counts = new Map(manifest.divisions.map((d) => [d.id, 0]));
for (const id of Object.values(manifest.skills)) counts.set(id, counts.get(id) + 1);

const sum = [...counts.values()].reduce((a, b) => a + b, 0);
if (sum !== TOTAL) {
  fail(`per-division counts sum to ${sum}, expected ${TOTAL}`);
  process.exit(1);
}

// plugin counts + DERIVED descriptions (C-13): the description is the member divisions' `focus`
// strings joined, never hand-written, so it cannot drift from the manifest.
const pluginCount = new Map(pluginIds.map((id) => [id, 0]));
for (const s of skillNames) pluginCount.set(skillToPlugin.get(s), pluginCount.get(skillToPlugin.get(s)) + 1);
const pluginDesc = new Map(
  manifest.plugins.map((p) => [p.id, p.divisions.map((d) => focusById.get(d)).join(' ')])
);

// ---- generate ----
const writes = []; // [path, content] -- collected, then written/compared atomically at the end
const J = (o) => JSON.stringify(o, null, 2) + '\n';

let readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
const readmeBefore = readme;

// The catalog rows are themselves a count source. A summary that says 16 above a section with
// 14 rows is the same drift class this script exists to kill, so the rows are validated against
// the manifest rather than trusted. (C-17)
// Q-20260716-0002: the link target now carries the PLUGIN dir, so the row proves membership too --
// a skill linked into the wrong plugin dir is a validation failure, not a cosmetic typo.
{
  const catalog = readme.slice(readme.indexOf('## The catalog'));
  const rows = new Map();
  let cur = null;
  for (const ln of catalog.split('\n')) {
    const h = ln.match(/^### (\S+)\s+(.+)$/);
    if (h) {
      const d = manifest.divisions.find((x) => x.title === h[2].trim());
      if (!d) fail(`catalog section has no matching division in manifest: ${h[2]}`);
      cur = d?.id ?? null;
      continue;
    }
    const r = ln.match(/^\|\s*\[([a-z0-9][a-z0-9-]*)\]\((m2ai-[a-z-]+)\/skills\//);
    if (r && cur) {
      if (rows.has(r[1])) fail(`skill listed twice in catalog: ${r[1]}`);
      rows.set(r[1], { div: cur, plugin: r[2] });
    }
  }
  for (const [name, { div, plugin }] of rows) {
    if (!(name in manifest.skills)) fail(`catalog lists a skill absent from manifest: ${name}`);
    else {
      if (manifest.skills[name] !== div) {
        fail(`catalog places ${name} in ${div}, manifest says ${manifest.skills[name]}`);
      }
      if (skillToPlugin.get(name) !== plugin) {
        fail(`catalog links ${name} into ${plugin}, manifest says ${skillToPlugin.get(name)}`);
      }
    }
  }
  for (const name of skillNames) {
    if (!rows.has(name)) fail(`skill in manifest has no catalog row: ${name}`);
  }
  if (rows.size !== TOTAL) fail(`catalog has ${rows.size} rows, manifest has ${TOTAL} skills`);
  if (process.exitCode === 1) {
    console.error('\ncatalog is out of sync with the manifest. Nothing written.');
    process.exit(1);
  }
}

readme = readme.replace(/\*\*\d+ portable Claude Code skills\*\*/, `**${TOTAL} portable Claude Code skills**`);
readme = readme.replace(/badge\/skills-\d+-brightgreen/, `badge/skills-${TOTAL}-brightgreen`);
readme = readme.replace(/\[!\[Skills\]\(([^)]*?)skills-\d+/, `[![Skills]($1skills-${TOTAL}`);

// division summary table: one row per division, count column driven by the manifest
for (const d of manifest.divisions) {
  const title = d.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const row = new RegExp(`(\\|\\s*${d.emoji}\\s*\\[${title}\\]\\([^)]*\\)\\s*\\|\\s*)\\d+(\\s*\\|)`);
  if (!row.test(readme)) fail(`summary row not found for division: ${d.title}`);
  readme = readme.replace(row, `$1${counts.get(d.id)}$2`);
}
readme = readme.replace(/(\|\s*\|\s*\*\*)\d+(\*\*\s*\|\s*\|)/, `$1${TOTAL}$2`);

// plugin table: count column driven by the manifest (C-14)
for (const id of pluginIds) {
  const row = new RegExp(`(\\|\\s*\\[\`${id}\`\\]\\([^)]*\\)\\s*\\|\\s*)\\d+(\\s*\\|)`);
  if (!row.test(readme)) fail(`plugin table row not found for: ${id}`);
  readme = readme.replace(row, `$1${pluginCount.get(id)}$2`);
}
writes.push([join(ROOT, 'README.md'), readme]);

// root marketplaces. Claude Code resolves `source` relative to the dir holding .claude-plugin/,
// hence the "./" form. Cursor's own live marketplace.json uses a BARE top-level dir name -- the
// two are near-mirrors but NOT identical, and using the wrong form breaks one of the two.
const entry = (id) => ({
  name: id,
  description: `${pluginCount.get(id)} portable skills. ${pluginDesc.get(id)}`,
  category: 'productivity',
  author: AUTHOR,
  homepage: HOMEPAGE,
});
const claudeMkt = JSON.parse(readFileSync(join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'));
claudeMkt.plugins = pluginIds.map((id) => ({ ...entry(id), source: `./${id}` }));
// key order: keep `source` next to name/description for readability, matching the hand-written original
claudeMkt.plugins = pluginIds.map((id) => {
  const e = entry(id);
  return { name: e.name, description: e.description, source: `./${id}`, category: e.category, author: e.author, homepage: e.homepage };
});
writes.push([join(ROOT, '.claude-plugin', 'marketplace.json'), J(claudeMkt)]);

const cursorMkt = {
  name: 'm2ai-skills-pack',
  description: claudeMkt.description,
  owner: claudeMkt.owner,
  plugins: pluginIds.map((id) => {
    const e = entry(id);
    return { name: e.name, description: e.description, source: id, author: e.author, homepage: e.homepage };
  }),
};
writes.push([join(ROOT, '.cursor-plugin', 'marketplace.json'), J(cursorMkt)]);

// per-plugin manifests. Two different bars, and they do not agree:
//   Claude Code (code.claude.com/docs/en/plugin-marketplaces): name + description required.
//   Cursor (cursor.com/docs/plugins):                          name required, that is all.
//   Cursor's REVIEWER (cursor/plugins -> create-plugin/skills/review-plugin-submission):
//     name + description + version + author + license, "required and coherent".
// Build to the reviewer, not the docs: a submission gets bounced by the human running that
// checklist, not by the docs page. LICENSE is emitted here rather than being asserted only by the
// LICENSE file at the repo root, because Cursor's Publisher Terms bar copyleft (GPL/AGPL/LGPL)
// outright and a reviewer reads the manifest. Both manifests are GENERATED: hand-editing them is
// silently reverted by the next run of this script (which is exactly what happened on 2026-07-16).
for (const id of pluginIds) {
  writes.push([
    join(ROOT, id, '.claude-plugin', 'plugin.json'),
    J({ name: id, version: VERSION, description: pluginDesc.get(id), author: AUTHOR, license: LICENSE, homepage: HOMEPAGE }),
  ]);
  writes.push([
    join(ROOT, id, '.cursor-plugin', 'plugin.json'),
    J({ name: id, description: pluginDesc.get(id), version: VERSION, author: AUTHOR, license: LICENSE, homepage: HOMEPAGE }),
  ]);
}

if (process.exitCode === 1) {
  console.error('generation errors above. Nothing written.');
  process.exit(1);
}

// ---- verify no stale literal survives anywhere (C-24) ----
const stale = [];
const blurb = readme.match(/\*\*(\d+) portable Claude Code skills\*\*/)?.[1];
const badge = readme.match(/badge\/skills-(\d+)-brightgreen/)?.[1];
const total = readme.match(/\|\s*\|\s*\*\*(\d+)\*\*\s*\|\s*\|/)?.[1];
for (const [name, v] of [['README blurb', blurb], ['README badge', badge], ['README total', total]]) {
  if (String(v) !== String(TOTAL)) stale.push(`${name} = ${v}, expected ${TOTAL}`);
}
if (stale.length) {
  stale.forEach(fail);
  process.exit(1);
}

if (CHECK) {
  const drift = writes.filter(([p, c]) => !existsSync(p) || readFileSync(p, 'utf8') !== c);
  if (drift.length) {
    drift.forEach(([p]) => fail(`out of sync with skills-manifest.json: ${p.replace(ROOT + '/', '')}`));
    console.error('\nRun: node scripts/sync-from-manifest.mjs');
    process.exit(1);
  }
  console.log(`OK: ${TOTAL} skills across ${manifest.divisions.length} divisions in ${pluginIds.length} plugins; all generated files in sync.`);
  process.exit(0);
}

// Codex r2 MEDIUM (adopted). This wrote the 17 generated files one-by-one with plain
// writeFileSync. An interrupt (or a disk error) partway through left the repo holding a mix of
// old and new metadata -- e.g. a regenerated marketplace.json advertising 7 plugins next to
// stale plugin.json files, which is precisely the count-drift class this script exists to kill.
// Per-file atomicity: write to a temp file in the SAME directory (so rename() stays on one
// filesystem and is atomic), then rename over the target. A reader now sees either the whole old
// file or the whole new one, never a truncated write.
//
// Honest scope: this is per-file atomic, NOT a cross-file transaction. An interrupt can still
// land between two renames. Making all 17 atomic together would need a staging dir and a
// swap, which is real complexity for a local generator whose remedy is "run it again" --
// `--check` detects any mixed state, and the run is idempotent. Per-file atomicity removes the
// corrupt-file failure mode; the mixed-set one is detected rather than prevented.
const tmps = [];
try {
  for (const [p, c] of writes) {
    mkdirSync(dirname(p), { recursive: true });
    const tmp = `${p}.tmp-${process.pid}`;
    writeFileSync(tmp, c);
    tmps.push(tmp);
  }
  for (let i = 0; i < writes.length; i++) renameSync(tmps[i], writes[i][0]);
} finally {
  // Any temp that survived (a throw before its rename) must not be left lying next to the real
  // file -- it would be untracked clutter at best and confusing at worst.
  for (const t of tmps) { try { if (existsSync(t)) unlinkSync(t); } catch { /* best effort */ } }
}
console.log(`Wrote ${TOTAL} skills across ${manifest.divisions.length} divisions in ${pluginIds.length} plugins.`);
for (const id of pluginIds) console.log(`  ${String(pluginCount.get(id)).padStart(3)}  ${id}`);
