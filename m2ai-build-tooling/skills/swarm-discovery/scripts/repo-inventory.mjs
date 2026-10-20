#!/usr/bin/env node
// repo-inventory.mjs: Phase 0 of the swarm-discovery workflow. Deterministic, no LLM.
//
// Workflow scripts have no filesystem access, and a small model asked to COUNT things
// (files, lines, imports) invents numbers. So everything countable is computed here and
// handed to the Haiku workers as facts; they only interpret.
//
// Usage:
//   node scripts/repo-inventory.mjs <repo> [--depth 2] [--split-flat 40] [--max-modules 40] [--out file.json] [--emit-script launch.js]
// --emit-script writes a copy of ../swarm-discovery.js with this inventory embedded at its EMBED MARKER
// (modules slimmed: virtual ones drop sample_files, all drop test_files). Launch it with
// Workflow({ scriptPath: <launch.js>, args: { repo, out, ts, inventory: { repo, head, totals } } }).
// --max-modules N keeps full detail for the N largest modules (by LOC) and reduces the rest to
// { path, files, loc, lang, is_tests, stub: true }: swarm-discovery never maps stubs, it lists them as
// not mapped. Totals always cover every module. 0 (default) = full detail for all.
//
// Output: JSON { repo, head, totals, modules[], configs[], docs[] }
//   module = { path, files, loc, lang, sample_files[], entrypoints[], imports_to{}, imported_by{}, is_tests,
//              virtual?, all_files? }
// Module key: a file deeper than `depth` segments is grouped by its first `depth` segments
// (src/ttn), shallower files by their first segment (scripts), root files under "(root)".
// Flat split: a module with more than `split-flat` files (one real repo has 264 files directly
// under src/) is split by basename prefix (outbound-*.ts -> "src/outbound*"); prefixes with fewer
// than 3 files are chunked into "src/(misc 1)", "src/(misc 2)". Virtual modules carry all_files
// so a worker knows exactly which files are its own.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve, dirname, join, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const argv = process.argv.slice(2)
const repoArg = argv.find((a) => !a.startsWith('--') && !/^\d+$/.test(a))
if (!repoArg) {
  console.error('usage: repo-inventory.mjs <repo> [--depth N] [--split-flat N] [--max-modules N] [--out file] [--emit-script file]')
  process.exit(1)
}
const flag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt
}
const repo = resolve(repoArg)
const depth = Number(flag('depth', 2))
const splitFlat = Number(flag('split-flat', 40))
const MIN_PREFIX_GROUP = 3
const out = flag('out', null)
const maxModules = Number(flag('max-modules', 0))
const emitScript = flag('emit-script', null)

// .vue is included: without it, one Vue app's 16 .vue files (two thirds of its frontend LOC) were invisible.
const SRC_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.py', '.sh', '.go', '.rs', '.rb', '.java', '.cs', '.sql'])
const CONFIG_NAMES = /^(package\.json|tsconfig.*\.json|pyproject\.toml|requirements.*\.txt|Dockerfile.*|docker-compose.*\.ya?ml|compose\.ya?ml|\.env\.example|.*\.service(\.in)?|.*\.timer(\.in)?|vite\.config\..*|vitest\.config\..*|jest\.config\..*|eslint\.config\..*|\.eslintrc.*|Makefile|ecosystem\.config\..*|Cargo\.toml|go\.mod)$/
const DOC_NAMES = /^(README.*|CLAUDE\.md|AGENTS\.md|ARCHITECTURE.*|DECISIONS.*|CHANGELOG.*|docs\/.*\.md|adr\/.*\.md)$/i
const SKIP = /(^|\/)(node_modules|dist|build|out|coverage|\.next|\.cache|vendor|__pycache__|\.venv|venv|target)(\/|$)|\.min\.(js|css)$|(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$|\.d\.ts$/
const TEST_RE = /(^|\/)(tests?|__tests__|spec|e2e)(\/|$)|\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)test_[^/]*\.py$/

let files
try {
  files = execSync('git ls-files -z', { cwd: repo }).toString().split('\0').filter(Boolean)
} catch {
  files = execSync("find . -type f -not -path '*/.git/*' -print0", { cwd: repo })
    .toString().split('\0').filter(Boolean).map((f) => f.replace(/^\.\//, ''))
}
files = files.filter((f) => !SKIP.test(f))
const fileSet = new Set(files)
let head = null
try { head = execSync('git rev-parse --short HEAD', { cwd: repo }).toString().trim() } catch {}

const dirKey = (f) => {
  const parts = f.split('/')
  if (parts.length === 1) return '(root)'
  return parts.slice(0, Math.min(depth, parts.length - 1)).join('/')
}

// Entrypoints named by package.json (main/bin/scripts) so workers do not have to guess them.
const entryFiles = new Set()
const pkgPath = join(repo, 'package.json')
if (existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    const add = (v) => typeof v === 'string' && v.match(/[\w./-]+\.(m?js|cjs|ts)/g)?.forEach((p) => entryFiles.add(p.replace(/^\.\//, '')))
    add(pkg.main); add(pkg.module)
    if (typeof pkg.bin === 'string') add(pkg.bin)
    else if (pkg.bin) Object.values(pkg.bin).forEach(add)
    if (pkg.scripts) Object.values(pkg.scripts).forEach(add)
  } catch {}
}

// Pass 1: per-file facts. Imports are resolved to FILE paths here; module edges come after grouping.
const configs = []
const docs = []
const records = []
const IMPORT_RE = /(?:import\s[^'"]*?from\s*|import\s*\(\s*|require\s*\(\s*|^\s*from\s+)['"](\.{1,2}\/[^'"]+)['"]/gm
const RESOLVE_EXT = ['', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.py', '/index.ts', '/index.js', '/index.mjs', '.vue']
// Python imports are unquoted, so IMPORT_RE never sees them (without this pass a Python backend showed 0 import edges).
// Relative `from ..utils import x` resolves against the file's package; absolute `from app.services
// import x` / `import app.x` against each ancestor dir in turn (the package root is often a subdir,
// e.g. backend/). Only in-repo hits become edges; stdlib and third-party imports resolve to nothing.
const PY_FROM_RE = /^[ \t]*from[ \t]+(\.*)([\w.]*)[ \t]+import[ \t]+\(?([\w \t,]+)/gm
const PY_IMPORT_RE = /^[ \t]*import[ \t]+([\w.]+)/gm
const pyFile = (p) => [p + '.py', p + '/__init__.py'].find((c) => fileSet.has(c))
const pyFrom = (baseDir, dotted, names) => {
  const path = [baseDir, dotted.replace(/\./g, '/')].filter(Boolean).join('/')
  const hits = names.map((n) => pyFile([path, n].filter(Boolean).join('/'))).filter(Boolean)
  if (dotted) { const own = pyFile(path); if (own) hits.push(own) }
  return hits
}
const pyImports = (f, text) => {
  const dirParts = dirname(f) === '.' ? [] : dirname(f).split('/')
  const absolute = (dotted, names) => {
    for (let i = dirParts.length; i >= 0; i--) {
      const hits = pyFrom(dirParts.slice(0, i).join('/'), dotted, names)
      if (hits.length) return hits
    }
    return []
  }
  const out = new Set()
  let m
  while ((m = PY_FROM_RE.exec(text))) {
    const names = m[3].split(',').map((s) => s.trim().split(/\s+/)[0]).filter((s) => /^\w+$/.test(s))
    const hits = m[1]
      ? pyFrom(dirParts.slice(0, Math.max(0, dirParts.length - (m[1].length - 1))).join('/'), m[2], names)
      : absolute(m[2], names)
    hits.forEach((h) => out.add(h))
  }
  while ((m = PY_IMPORT_RE.exec(text))) absolute(m[1], []).forEach((h) => out.add(h))
  out.delete(f)
  return [...out]
}
for (const f of files) {
  const base = basename(f)
  if (CONFIG_NAMES.test(base) || CONFIG_NAMES.test(f)) configs.push(f)
  if (DOC_NAMES.test(f)) docs.push(f)
  // Extensionless files count as source only when they start with a shebang (bin/ scripts are
  // usually the real entrypoints, and they have no extension).
  let text = null
  if (!SRC_EXT.has(extname(f))) {
    if (extname(f) !== '') continue
    try { text = readFileSync(join(repo, f), 'utf8') } catch { continue }
    if (!text.startsWith('#!')) continue
  }
  if (text === null) {
    try { text = readFileSync(join(repo, f), 'utf8') } catch { text = '' }
  }
  const ext = extname(f).slice(1) || (text.match(/^#!.*\b(node|bash|sh|python3?)\b/)?.[1] ?? 'script')
  const imports = []
  let mm
  while ((mm = IMPORT_RE.exec(text))) {
    const target = join(dirname(f), mm[1]).replace(/\\/g, '/').replace(/\.js$/, '')
    const hit = RESOLVE_EXT.map((e) => target + e).find((c) => fileSet.has(c)) || RESOLVE_EXT.map((e) => target + '.js' + e).find((c) => fileSet.has(c))
    imports.push(hit || target)
  }
  if (ext === 'py' || ext === 'python' || ext === 'python3') imports.push(...pyImports(f, text))
  records.push({
    f, dir: dirKey(f), ext, loc: text ? text.split('\n').length : 0, imports,
    entry: entryFiles.has(f) || text.startsWith('#!'), isTest: TEST_RE.test(f),
  })
}

// Pass 2: module keys, splitting flat directories by basename prefix.
const prefixOf = (f) => basename(f).replace(/\.[^.]+$/, '').replace(/\.(test|spec)$/, '').split(/[-._]/)[0].toLowerCase()
const byDir = new Map()
for (const r of records) (byDir.get(r.dir) || byDir.set(r.dir, []).get(r.dir)).push(r)
const fileModule = new Map()
const virtual = new Set()
for (const [dir, recs] of byDir) {
  if (recs.length <= splitFlat) {
    recs.forEach((r) => fileModule.set(r.f, dir))
    continue
  }
  const groups = new Map()
  for (const r of recs) (groups.get(prefixOf(r.f)) || groups.set(prefixOf(r.f), []).get(prefixOf(r.f))).push(r)
  const misc = []
  for (const [p, rs] of groups) {
    if (rs.length >= MIN_PREFIX_GROUP) {
      const key = `${dir}/${p}*`
      virtual.add(key)
      rs.forEach((r) => fileModule.set(r.f, key))
    } else misc.push(...rs)
  }
  misc.sort((a, b) => a.f.localeCompare(b.f))
  const chunks = Math.max(1, Math.ceil(misc.length / splitFlat))
  const per = Math.ceil(misc.length / chunks)
  misc.forEach((r, i) => {
    const key = chunks === 1 ? `${dir}/(misc)` : `${dir}/(misc ${Math.floor(i / per) + 1})`
    virtual.add(key)
    fileModule.set(r.f, key)
  })
}
const moduleOfPath = (p) => fileModule.get(p) || dirKey(p)

// Pass 3: aggregate per module and compute edges from the per-file import lists.
const modules = new Map()
for (const r of records) {
  const key = fileModule.get(r.f)
  if (!modules.has(key)) {
    modules.set(key, { path: key, files: 0, loc: 0, lang: {}, sample_files: [], entrypoints: [], imports_to: {}, imported_by: {}, is_tests: TEST_RE.test(key + '/x'), virtual: virtual.has(key), all_files: [], _tests: 0 })
  }
  const m = modules.get(key)
  m.files++
  m.loc += r.loc
  m.lang[r.ext] = (m.lang[r.ext] || 0) + 1
  m.all_files.push(r.f)
  if (m.sample_files.length < 12) m.sample_files.push(r.f)
  if (r.entry) m.entrypoints.push(r.f)
  if (r.isTest) m._tests++
  for (const t of r.imports) {
    const tk = moduleOfPath(t)
    if (tk === key) continue
    m.imports_to[tk] = (m.imports_to[tk] || 0) + 1
  }
}
for (const m of modules.values()) {
  for (const [t, n] of Object.entries(m.imports_to)) {
    if (modules.has(t)) modules.get(t).imported_by[m.path] = n
  }
  m.lang = Object.entries(m.lang).sort((a, b) => b[1] - a[1]).map(([k]) => k).join(',')
  m.entrypoints = [...new Set(m.entrypoints)]
  if (!m.is_tests && m._tests === m.files && m.files > 0) m.is_tests = true
  m.test_files = m._tests
  delete m._tests
  // all_files is only needed when the module boundary is not a directory the worker can glob.
  if (!m.virtual) delete m.all_files
}

const list = [...modules.values()].sort((a, b) => b.loc - a.loc)
const result = {
  repo,
  head,
  generated_at: new Date().toISOString(),
  depth,
  split_flat: splitFlat,
  totals: { files: files.length, source_files: list.reduce((s, m) => s + m.files, 0), loc: list.reduce((s, m) => s + m.loc, 0), modules: list.length, virtual_modules: list.filter((m) => m.virtual).length },
  modules: maxModules > 0 ? list.map((m, i) => (i < maxModules ? m : { path: m.path, files: m.files, loc: m.loc, lang: m.lang, is_tests: m.is_tests, stub: true })) : list,
  configs: [...new Set(configs)].sort(),
  docs: [...new Set(docs)].sort(),
}
const json = JSON.stringify(result, null, 2)
if (out) {
  writeFileSync(out, json)
  console.error(`wrote ${out}: ${result.totals.modules} modules (${result.totals.virtual_modules} virtual), ${result.totals.source_files} source files, ${result.totals.loc} LOC${maxModules > 0 && list.length > maxModules ? `; ${list.length - maxModules} beyond --max-modules ${maxModules} stubbed` : ''}`)
} else {
  console.log(json)
}

if (emitScript) {
  const wfPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'swarm-discovery.js')
  const wf = readFileSync(wfPath, 'utf8')
  const marker = 'const EMBEDDED_INVENTORY = null\n'
  if (wf.split(marker).length !== 2) {
    console.error(`ERROR: ${wfPath} must contain the line "const EMBEDDED_INVENTORY = null" exactly once; nothing emitted`)
    process.exit(2)
  }
  const slim = {
    ...result,
    modules: result.modules.map((m) => {
      const x = { ...m }
      if (x.virtual) delete x.sample_files
      delete x.test_files
      return x
    }),
  }
  const launch = wf.replace(marker, `const EMBEDDED_INVENTORY = ${JSON.stringify(slim)}\n`)
  // The Workflow tool refuses scripts over 524288 bytes; fail here, not at launch.
  if (Buffer.byteLength(launch) > 524288) {
    console.error(`ERROR: emitted script would be ${Buffer.byteLength(launch)} bytes (Workflow limit 524288); lower --max-modules`)
    process.exit(3)
  }
  writeFileSync(emitScript, launch)
  const launchArgs = { repo, ts: '<ISO now>', out: '<artifact path>', inventory: { repo, head, totals: result.totals } }
  console.error(`emitted ${emitScript}: ${result.modules.length} modules embedded. Workflow args: ${JSON.stringify(launchArgs)}`)
}
