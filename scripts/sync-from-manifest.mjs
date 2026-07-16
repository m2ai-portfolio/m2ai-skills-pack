#!/usr/bin/env node
// Generate README.md + .claude-plugin/marketplace.json counts from skills-manifest.json (the SSOT).
//
//   node scripts/sync-from-manifest.mjs           # write
//   node scripts/sync-from-manifest.mjs --check   # verify only, exit 1 on drift
//
// Validates BEFORE writing: a manifest that disagrees with the filesystem is a hard failure,
// never a silent partial write. See .self-healing-claudex PLAN.md claims C-13..C-17, C-23, C-24.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
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

// ---- validate: manifest vs filesystem (C-13, C-14, C-23) ----
const onDisk = readdirSync(join(ROOT, 'skills'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(ROOT, 'skills', e.name, 'SKILL.md')))
  .map((e) => e.name);

const errors = [];
for (const s of onDisk) {
  if (!(s in manifest.skills)) errors.push(`skill on disk missing from manifest (orphan): ${s}`);
}
for (const s of skillNames) {
  if (!onDisk.includes(s)) errors.push(`manifest names a skill not on disk (ghost): ${s}`);
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

// ---- generate ----
let readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
const before = readme;

// The catalog rows are themselves a count source. A summary that says 16 above a section with
// 14 rows is the same drift class this script exists to kill, so the rows are validated against
// the manifest rather than trusted. (C-17)
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
    const r = ln.match(/^\|\s*\[([a-z0-9][a-z0-9-]*)\]\(skills\//);
    if (r && cur) {
      if (rows.has(r[1])) fail(`skill listed twice in catalog: ${r[1]}`);
      rows.set(r[1], cur);
    }
  }
  for (const [name, div] of rows) {
    if (!(name in manifest.skills)) fail(`catalog lists a skill absent from manifest: ${name}`);
    else if (manifest.skills[name] !== div) {
      fail(`catalog places ${name} in ${div}, manifest says ${manifest.skills[name]}`);
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

// summary table: one row per division, count column driven by the manifest
for (const d of manifest.divisions) {
  const title = d.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const row = new RegExp(`(\\|\\s*${d.emoji}\\s*\\[${title}\\]\\([^)]*\\)\\s*\\|\\s*)\\d+(\\s*\\|)`);
  if (!row.test(readme)) fail(`summary row not found for division: ${d.title}`);
  readme = readme.replace(row, `$1${counts.get(d.id)}$2`);
}
// summary total row
readme = readme.replace(/(\|\s*\|\s*\*\*)\d+(\*\*\s*\|\s*\|)/, `$1${TOTAL}$2`);

let mkt = readFileSync(join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf8');
mkt = mkt.replace(/"(\d+) portable skills/, `"${TOTAL} portable skills`);

if (process.exitCode === 1) {
  console.error('generation errors above. Nothing written.');
  process.exit(1);
}

// ---- verify no stale literal survives anywhere (C-24) ----
const stale = [];
const blurb = readme.match(/\*\*(\d+) portable Claude Code skills\*\*/)?.[1];
const badge = readme.match(/badge\/skills-(\d+)-brightgreen/)?.[1];
const total = readme.match(/\|\s*\|\s*\*\*(\d+)\*\*\s*\|\s*\|/)?.[1];
const mktN = mkt.match(/"(\d+) portable skills/)?.[1];
for (const [name, v] of [['README blurb', blurb], ['README badge', badge], ['README total', total], ['marketplace.json', mktN]]) {
  if (String(v) !== String(TOTAL)) stale.push(`${name} = ${v}, expected ${TOTAL}`);
}
if (stale.length) {
  stale.forEach(fail);
  process.exit(1);
}

if (CHECK) {
  const drift = readme !== before || mkt !== readFileSync(join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf8');
  if (drift) {
    fail('README.md / marketplace.json are out of sync with skills-manifest.json. Run: node scripts/sync-from-manifest.mjs');
    process.exit(1);
  }
  console.log(`OK: ${TOTAL} skills across ${manifest.divisions.length} divisions; README + marketplace.json in sync.`);
  process.exit(0);
}

writeFileSync(join(ROOT, 'README.md'), readme);
writeFileSync(join(ROOT, '.claude-plugin', 'marketplace.json'), mkt);
console.log(`Wrote ${TOTAL} skills across ${manifest.divisions.length} divisions.`);
for (const d of manifest.divisions) console.log(`  ${String(counts.get(d.id)).padStart(3)}  ${d.title}`);
