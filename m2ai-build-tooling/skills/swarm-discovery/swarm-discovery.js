// swarm-discovery.js: a Haiku swarm maps ONE repo before the thinking work starts.
//
// Shape:
//   Phase 0 INVENTORY   deterministic, OUTSIDE this script: scripts/repo-inventory.mjs computes
//                       files, LOC, import edges, entrypoints. Haiku interprets; code counts.
//   Phase 1 MAP         one Haiku worker per module, read-only, fills a fixed CARD (schema-forced,
//                       evidence as file:line, confidence 0-1).
//   Phase 2 VERIFY      Sonnet skeptics judge each claim of a routed card as verified / refuted /
//                       unverified. They see claims and evidence only, never the worker's confidence or
//                       open questions. Claims they find MISSING become candidates for the next round.
//   Phase 3 HUNT        rounds 2..max_rounds: a Haiku hunter per still-productive module looks for IO and
//                       risks NOT in the ledger; new candidates are deduplicated by exact key and verified
//                       by Sonnet. Stops after 2 consecutive rounds with no novel, non-refuted finding, or
//                       at max_rounds, or at max_agents.
//   Phase 4 SYNTHESIZE  one Opus agent writes the map from the LEDGER: verified findings, unverified ones
//                       labelled as such, refuted ones as a count only.
//
// State lives in this script's data structures (the findings ledger), not in any model's context.
// Only verified + deduplicated findings (and clearly labelled unverified ones) go up to the synthesis
// agent and the parent session.
//
// Launch (two steps, because workflow scripts cannot read files; SKILL_DIR is this skill's folder):
//   node $SKILL_DIR/scripts/repo-inventory.mjs <repo> --max-modules 40 --out /tmp/inv.json --emit-script /tmp/launch.js
//   Workflow({ scriptPath: '/tmp/launch.js', args: { repo, inventory: { repo, head, totals },
//              out: '<report path>.md', ts: '<iso now>' } })
// Optional args: votes (2), verify ('flagged' | 'all' | 'none'), worker_model ('haiku'),
//   verifier_model ('sonnet'), synth_model ('opus'), max_modules (40; 0 = all),
//   max_rounds (4; 1 = a single map + verify pass), max_agents (160, hard).

export const meta = {
  name: 'swarm-discovery',
  description: 'Haiku swarm maps one repo (one read-only worker per module into a fixed card), Sonnet skeptics verify claims, Haiku hunters search for gaps until saturation, Opus writes the architecture map from verified findings. Never edits code.',
  whenToUse: 'First contact with a repo, data store or service tree: build the map, dependency edges, external IO and risk list cheaply before any planning or ETL design.',
  phases: [
    { title: 'Map', detail: 'one Haiku worker per module fills a card', model: 'haiku' },
    { title: 'Verify', detail: 'Sonnet skeptics judge each claim verified / refuted / unverified', model: 'sonnet' },
    { title: 'Hunt', detail: 'Haiku hunters look for unrecorded IO and risks until 2 quiet rounds', model: 'haiku' },
    { title: 'Synthesize', detail: 'Opus writes the architecture map to args.out', model: 'opus' },
  ],
}

// EMBED MARKER: repo-inventory.mjs --emit-script replaces the next line with the inventory, so a large
// inventory never has to be pasted into Workflow args. Launch the emitted copy with Workflow({ scriptPath }).
const EMBEDDED_INVENTORY = null
let A = args
if (typeof A === 'string') {
  try { A = JSON.parse(A) } catch (e) { A = {} }
}
A = A || {}
// args.inventory still wins for totals/head when given.
const inv = EMBEDDED_INVENTORY ? Object.assign({}, EMBEDDED_INVENTORY, A.inventory || {}, { modules: EMBEDDED_INVENTORY.modules }) : A.inventory || {}
const repo = A.repo || inv.repo || '(unspecified repo)'
const out = A.out || null
const votes = A.votes || 2
const verifyMode = A.verify || 'flagged'
const workerModel = A.worker_model || 'haiku'
const verifierModel = A.verifier_model || 'sonnet'
const synthModel = A.synth_model || 'opus'
const num = (v, d) => (v === undefined || v === null ? d : Number(v))
// Cap the fan-out by default: an uncapped 195-module repo spent 294 agents in 43 min and never
// reached synthesis. 40 = the largest run that finished cleanly (81 agents, 18 min).
const DEFAULT_MAX_MODULES = 40
const maxModules = num(A.max_modules, DEFAULT_MAX_MODULES)
const maxRounds = Math.max(1, num(A.max_rounds, 4))
// Hard agent cap across ALL phases (synthesis included). A large single-pass run used 121.
const maxAgents = num(A.max_agents, 160)
const SATURATION = 2

const allModules = [...(inv.modules || [])].sort((a, b) => (b.loc || 0) - (a.loc || 0))
let modules = allModules.filter((m) => !m.stub)
let notMapped = allModules.filter((m) => m.stub)
if (maxModules > 0 && modules.length > maxModules) {
  notMapped = [...modules.slice(maxModules), ...notMapped]
  modules = modules.slice(0, maxModules)
}
const totalLoc = allModules.reduce((s, m) => s + (m.loc || 0), 0)
const coveragePct = totalLoc ? Math.round((1000 * modules.reduce((s, m) => s + (m.loc || 0), 0)) / totalLoc) / 10 : 100
const notMappedList = notMapped.map((m) => ({ path: m.path, loc: m.loc, files: m.files }))
if (notMapped.length) log(`capped: mapping ${modules.length} of ${allModules.length} modules (largest by LOC, ${coveragePct}% of LOC); ${notMapped.length} NOT mapped`)

// Fail LOUD on an empty fan-out: a clean-looking map over 0 modules is the silent-no-op class.
if (modules.length === 0) {
  log(`RED: 0 modules for ${repo}. args.inventory must be the output of scripts/repo-inventory.mjs. Aborting.`)
  return { status: 'error', error: 'empty-fanout', repo, reason: 'No modules in args.inventory; nothing to map.' }
}
if (!out) log('WARN: args.out not set; the synthesis will be returned inline only and not written to a file.')
log(`swarm-discovery on ${repo}@${inv.head || '?'} | ${modules.length} modules, ${inv.totals?.loc || '?'} LOC | workers=${workerModel} verify=${verifyMode}/${verifierModel} x${votes} synth=${synthModel} | rounds<=${maxRounds} agents<=${maxAgents}`)

// ---- agent budget (hard) -------------------------------------------------------------------------
let agentsUsed = 0
// One slot is always reserved for the synthesis agent.
const hasBudget = (n) => agentsUsed + n <= maxAgents - 1
const spend = (prompt, opts) => {
  agentsUsed++
  return agent(prompt, opts)
}

// ---- schemas -------------------------------------------------------------------------------------
const IO_KINDS = ['http', 'db', 'fs', 'queue', 'process', 'env', 'secret', 'network', 'listener', 'code_exec', 'other']
const RISK_KINDS = ['auth', 'injection', 'secret_exposure', 'unsafe_exec', 'network_exposure', 'data_loss', 'concurrency', 'correctness', 'other']
const FINDING_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: ['io', 'risk'] },
    kind: { type: 'string', enum: [...new Set([...IO_KINDS, ...RISK_KINDS])] },
    target: { type: 'string', description: 'io: the URL, table, path, command, env var or secret NAME (never its value); risk: a short title' },
    file: { type: 'string' },
    line: { type: 'integer' },
    claim: { type: 'string', description: 'one sentence: what the code does there' },
  },
  required: ['category', 'kind', 'target', 'file', 'line', 'claim'],
}

const CARD_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    purpose: { type: 'string', description: 'one or two sentences: what this module is FOR' },
    responsibilities: { type: 'array', items: { type: 'string' } },
    public_surface: {
      type: 'array',
      description: 'exported functions, classes, CLI commands, HTTP routes, with the file each lives in',
      items: { type: 'object', properties: { name: { type: 'string' }, kind: { type: 'string' }, file: { type: 'string' } }, required: ['name', 'kind'] },
    },
    depends_on: { type: 'array', items: { type: 'string' }, description: 'other module paths of this repo it imports or calls' },
    external_io: {
      type: 'array',
      description: 'everything that crosses the process boundary',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: IO_KINDS },
          target: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'integer' },
        },
        required: ['kind', 'target', 'file', 'line'],
      },
    },
    data_shapes: { type: 'array', items: { type: 'string' }, description: 'tables, record types, schemas, file formats this module reads or writes' },
    risks: {
      type: 'array',
      items: {
        type: 'object',
        properties: { kind: { type: 'string', enum: RISK_KINDS }, detail: { type: 'string' }, file: { type: 'string' }, line: { type: 'integer' } },
        required: ['kind', 'detail', 'file', 'line'],
      },
    },
    test_coverage: { type: 'string', enum: ['none', 'partial', 'good', 'unknown'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    evidence: { type: 'array', items: { type: 'string' }, description: 'file:line references that back the claims above' },
    open_questions: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'purpose', 'depends_on', 'external_io', 'risks', 'confidence', 'evidence'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    claims: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          outcome: { type: 'string', enum: ['verified', 'refuted', 'unverified'], description: 'verified: the code shows it; refuted: the code shows otherwise; unverified: you could not settle it' },
          evidence: { type: 'string', description: 'file:line you checked' },
          note: { type: 'string', description: 'for refuted or unverified: what the code actually shows' },
        },
        required: ['id', 'outcome'],
      },
    },
    missing: { type: 'array', items: FINDING_SCHEMA, description: 'IO or risks in this module that no claim covers, each with file and line' },
  },
  required: ['claims', 'missing'],
}

const HUNT_SCHEMA = {
  type: 'object',
  properties: {
    candidates: { type: 'array', items: FINDING_SCHEMA },
  },
  required: ['candidates'],
}

// ---- the ledger: every finding, keyed deterministically -----------------------------------------
const norm = (s) => String(s || '').toLowerCase().replace(/[`'"]/g, '').replace(/\s+/g, ' ').trim()
const normFile = (f) => norm(f).replace(/^\.\//, '').replace(/:\d+(-\d+)?$/, '')
const keyOf = (f) => `${f.category}|${f.kind}|${f.category === 'risk' ? norm(f.claim).slice(0, 80) : norm(f.target)}|${normFile(f.file)}`
const ledger = new Map() // key -> finding record
let nextId = 1
const fromCard = (card) => [
  ...(card.external_io || []).map((io) => ({ category: 'io', kind: io.kind, target: io.target, file: io.file, line: io.line, claim: `${io.kind} ${io.target}` })),
  ...(card.risks || []).map((r) => ({ category: 'risk', kind: r.kind, target: String(r.detail || '').slice(0, 120), file: r.file, line: r.line, claim: r.detail })),
]
// Adds a candidate; returns the record if its key is new, null for an exact duplicate.
const addCandidate = (f, module, round, source) => {
  const key = keyOf(f)
  if (ledger.has(key)) {
    ledger.get(key).sources.push(source)
    return null
  }
  const rec = { id: `f${nextId++}`, key, module, round, sources: [source], status: 'candidate', outcomes: [], notes: [], ...f }
  ledger.set(key, rec)
  return rec
}
const knownFor = (module) => [...ledger.values()].filter((f) => f.module === module && f.status !== 'refuted')

// Three outcomes, never collapsed: unanimous verified, unanimous refuted, anything else unverified
// (a split vote, an abstention, or a skeptic that died all mean "not settled").
const aggregate = (outcomes, expected) =>
  outcomes.length < expected ? 'unverified'
  : outcomes.every((o) => o === 'verified') ? 'verified'
  : outcomes.every((o) => o === 'refuted') ? 'refuted'
  : 'unverified'

const flagged = (card) =>
  card.confidence < 0.7 ||
  (card.external_io || []).some((io) => ['db', 'secret', 'http', 'network', 'queue', 'listener', 'code_exec'].includes(io.kind)) ||
  (card.risks || []).length > 0

// Decide whether a card gets skeptics: the mode, else the flag rule.
const route = (card) => {
  if (verifyMode === 'all') return { verify: true, by: 'mode' }
  if (verifyMode === 'none') return { verify: false, by: 'mode' }
  return { verify: flagged(card), by: 'rule' }
}

// ---- verification (shared by Map and Hunt rounds) ------------------------------------------------
// claims: [{ id, text }]. Skeptics never see the worker's confidence, open questions or reasoning.
const verifyClaims = async (m, claims, round) => {
  if (!claims.length) return { byId: {}, missing: [], refutingVotes: 0, votesCast: 0 }
  if (!hasBudget(votes)) return { byId: Object.fromEntries(claims.map((c) => [c.id, { status: 'unverified', notes: ['not checked: agent cap'] }])), missing: [], refutingVotes: 0, votesCast: 0 }
  const raw = await parallel(
    Array.from({ length: votes }, (_u, i) => () =>
      spend(
        `Adversarially verify claims about module ${m.path} in ${repo} (skeptic #${i + 1} of ${votes}, round ${round}). ` +
          `A cheap model wrote them; judge each one against the real files (Read/Grep under ${repo}).\n\nCLAIMS: ${JSON.stringify(claims)}\n\n` +
          `For EVERY claim id return outcome: "verified" if the code shows it, "refuted" if the code shows otherwise (say what it shows, with file:line), ` +
          `"unverified" if you cannot settle it. ` +
          `Then list in "missing" any external IO (http, db, fs, queue, process, env, secret, network, listener, code_exec) or risk in this module that no claim covers, each with file and line. ` +
          `READ-ONLY. Finding nothing wrong is an acceptable answer. No em-dashes.`,
        { label: `verify:${m.path}#${i + 1}${round > 1 ? `@r${round}` : ''}`, phase: 'Verify', schema: VERDICT_SCHEMA, model: verifierModel },
      ),
    ),
  )
  const v = raw.filter(Boolean)
  const byId = {}
  for (const c of claims) {
    const per = v.map((x) => (x.claims || []).find((y) => y.id === c.id)).filter(Boolean)
    byId[c.id] = {
      status: aggregate(per.map((p) => p.outcome), votes),
      notes: per.filter((p) => p.outcome !== 'verified').map((p) => `${p.outcome}: ${p.note || ''}${p.evidence ? ` (${p.evidence})` : ''}`),
    }
  }
  return {
    byId,
    missing: v.flatMap((x) => x.missing || []),
    refutingVotes: v.filter((x) => (x.claims || []).some((y) => y.outcome === 'refuted')).length,
    votesCast: v.length,
  }
}

// ---- Round 1: Map -> Verify, as ONE pipeline (synthesis is the only barrier) ---------------------
const pending = new Map() // module -> candidate findings for the next round (from skeptics' "missing")
const pushPending = (module, list) => {
  if (!list.length) return
  pending.set(module, [...(pending.get(module) || []), ...list])
}
const cardMeta = new Map() // module -> slim card metadata for the report

const results = await pipeline(
  modules,
  (m) =>
    hasBudget(1)
      ? spend(
          `You are a code cartographer: one worker in a swarm mapping the repo ${repo}. Your job is ONE module: ${m.path}.\n\n` +
            `FACTS (computed, do not recount): ${m.files} source files, ${m.loc} LOC, languages ${m.lang}. ` +
            `Import edges found by static scan: imports_to=${JSON.stringify(m.imports_to)}, imported_by=${JSON.stringify(m.imported_by)}. ` +
            `Known entrypoints: ${JSON.stringify(m.entrypoints)}. Is a tests module: ${m.is_tests}. ` +
            (m.virtual
              ? `This is a VIRTUAL module: a slice of a flat directory, grouped by filename prefix. Its files are EXACTLY: ${JSON.stringify(m.all_files)}. Do not describe sibling files outside this list.\n\n`
              : `Files to start with: ${JSON.stringify(m.sample_files)}.\n\n`) +
            `Read the module's files (Read/Grep/Glob under ${repo}/${m.path === '(root)' ? '' : m.path.replace(/\/[^/]*[*(].*$/, '')}) and fill the card. Rules:\n` +
            `- READ-ONLY. Never edit, create, or run anything that mutates the repo. Only read files, grep, and git -C ${repo} log/show.\n` +
            `- Every external_io and risk entry needs its file and line. If you cannot find evidence, lower "confidence" and put the gap in "open_questions". Never invent.\n` +
            `- external_io is the most important field: list every HTTP call, database/SQLite access, file path read or written, child process, listener, env var, and secret NAME this module touches. Never copy a secret value.\n` +
            `- depends_on lists OTHER modules of this repo that THIS module imports or calls (outgoing edges only; importers of this module are NOT dependencies). Start from imports_to, then confirm by reading.\n` +
            `- When you grep for callers, do not use --include filters: bin/ scripts and other entrypoints often have NO file extension and an include filter hides them.\n` +
            `- Plain prose, no em-dashes. Be terse. Your final output is the card, nothing else.`,
          { label: `map:${m.path}`, phase: 'Map', schema: CARD_SCHEMA, model: workerModel, effort: 'low' },
        )
      : null,
  async (card, m) => {
    if (!card) return null
    const decision = route(card)
    // Always the inventory's key: a worker may "helpfully" rewrite path.
    card = { ...card, path: m.path }
    const recs = fromCard(card).map((f) => addCandidate(f, m.path, 1, `map:${m.path}`)).filter(Boolean)
    const metaRow = {
      path: m.path, purpose: card.purpose, loc: m.loc, files: m.files, depends_on: card.depends_on || [], test_coverage: card.test_coverage,
      confidence: card.confidence, inventory_edges: m.imports_to, data_shapes: card.data_shapes || [], status: 'skipped', refutes: 0, votes: 0, routed_by: decision.by,
    }
    cardMeta.set(m.path, metaRow)
    if (!decision.verify) {
      for (const r of recs) r.status = 'unverified' // not checked: never presented as verified
      return metaRow
    }
    const claims = [
      { id: 'purpose', text: card.purpose },
      { id: 'depends_on', text: `outgoing module dependencies: ${JSON.stringify(card.depends_on || [])}` },
      { id: 'public_surface', text: `public surface: ${JSON.stringify(card.public_surface || [])}` },
      ...recs.map((r) => ({ id: r.id, text: `[${r.category}/${r.kind}] ${r.claim} (${r.file}:${r.line})` })),
    ]
    const res = await verifyClaims(m, claims, 1)
    for (const r of recs) {
      r.status = res.byId[r.id]?.status || 'unverified'
      r.notes.push(...(res.byId[r.id]?.notes || []))
    }
    const statuses = claims.map((c) => res.byId[c.id]?.status || 'unverified')
    metaRow.status = statuses.includes('refuted') ? 'refuted' : statuses.includes('unverified') ? 'unverified' : 'verified'
    metaRow.purpose_status = res.byId.purpose?.status
    metaRow.refutes = res.refutingVotes
    metaRow.votes = res.votesCast
    metaRow.corrections = claims.flatMap((c) => (res.byId[c.id]?.notes || []).map((n) => `${c.id}: ${n}`))
    pushPending(m.path, res.missing)
    return metaRow
  },
)

const mapped = results.filter(Boolean)
const dropped = modules.length - mapped.length
if (dropped) log(`WARN: ${dropped} module(s) returned no card (agent skipped, died, or agent cap); they are missing from the map`)

// ---- Rounds 2..N: Hunt until saturation ----------------------------------------------------------
const rounds = [{ round: 1, novel: [...ledger.values()].filter((f) => f.status !== 'refuted').length, agents: agentsUsed }]
let quiet = 0
let stopReason = maxRounds === 1 ? 'single-pass' : null
// novel-module sets of recent rounds; a module stays active for the whole saturation window, so
// "2 consecutive quiet rounds" really searches twice before stopping.
const novelHistory = [new Set(mapped.map((c) => c.path))]
for (let round = 2; round <= maxRounds && !stopReason; round++) {
  // Active: produced a novel finding within the last SATURATION rounds, or has skeptic candidates waiting.
  const recent = novelHistory.slice(-SATURATION)
  const active = mapped.filter((c) => recent.some((s) => s.has(c.path)) || (pending.get(c.path) || []).length)
  if (!active.length) {
    stopReason = 'saturated'
    break
  }
  // Each active module costs 1 hunter + `votes` skeptics; keep 1 agent for synthesis.
  const perModule = 1 + votes
  const affordable = Math.max(0, Math.floor((maxAgents - 1 - agentsUsed) / perModule))
  if (affordable === 0) {
    stopReason = 'agent-cap'
    break
  }
  const batch = active.slice(0, affordable)
  log(`round ${round}: ${batch.length} active module(s)${batch.length < active.length ? ` (${active.length - batch.length} cut by agent cap)` : ''}`)
  const novelThisRound = new Set()
  let novelCount = 0
  await parallel(
    batch.map((c) => async () => {
      const m = modules.find((x) => x.path === c.path)
      const known = knownFor(c.path).map((f) => ({ kind: f.kind, target: f.target, file: f.file, claim: f.claim }))
      const hunt = await spend(
        `You are a gap hunter in a swarm mapping ${repo}, round ${round}. Module: ${c.path}. ` +
          `KNOWN findings for this module (already recorded; do NOT repeat them): ${JSON.stringify(known)}\n\n` +
          `Read the module's files (Read/Grep/Glob under ${repo}) and return ONLY external IO or risks that no known finding covers, each with file and line. ` +
          `An empty list is a good answer when the known list is complete. READ-ONLY. Never copy a secret value. No em-dashes.`,
        { label: `hunt:${c.path}@r${round}`, phase: 'Hunt', schema: HUNT_SCHEMA, model: workerModel, effort: 'low' },
      )
      const cands = [...((hunt && hunt.candidates) || []), ...(pending.get(c.path) || [])]
      pending.delete(c.path)
      const fresh = []
      for (const f of cands) {
        const rec = addCandidate(f, c.path, round, `hunt:${c.path}@r${round}`)
        if (rec) fresh.push(rec)
      }
      const res = await verifyClaims(
        m,
        fresh.map((r) => ({ id: r.id, text: `[${r.category}/${r.kind}] ${r.claim} (${r.file}:${r.line})` })),
        round,
      )
      for (const r of fresh) {
        r.status = res.byId[r.id]?.status || 'unverified'
        r.notes.push(...(res.byId[r.id]?.notes || []))
        if (r.status !== 'refuted') {
          novelCount++
          novelThisRound.add(c.path)
        }
      }
      pushPending(c.path, res.missing)
    }),
  )
  rounds.push({ round, active: batch.length, novel: novelCount, agents: agentsUsed })
  novelHistory.push(novelThisRound)
  quiet = novelCount === 0 ? quiet + 1 : 0
  log(`round ${round}: ${novelCount} novel non-refuted finding(s); quiet streak ${quiet}/${SATURATION}`)
  if (quiet >= SATURATION) stopReason = 'saturated'
}
if (!stopReason) stopReason = 'round-cap'
const unchecked = [...pending.values()].reduce((s, l) => s + l.length, 0)
log(`stop: ${stopReason} after ${rounds.length} round(s), ${agentsUsed} agents; ${unchecked} skeptic candidate(s) left unchecked`)

// ---- what goes upward: verified + deduplicated, unverified labelled, refuted counted ---------------
const all = [...ledger.values()]
const verified = all.filter((f) => f.status === 'verified')
const unverified = all.filter((f) => f.status === 'unverified' || f.status === 'candidate')
const refutedCount = all.filter((f) => f.status === 'refuted').length
const slim = (f) => ({ id: f.id, module: f.module, category: f.category, kind: f.kind, target: f.target, file: f.file, line: f.line, claim: f.claim, round: f.round })
const contested = mapped.filter((c) => c.status === 'refuted')
log(`ledger: ${verified.length} verified, ${unverified.length} unverified, ${refutedCount} refuted | cards: ${mapped.length}, ${contested.length} with a refuted claim`)

const synthesis = await spend(
      `Synthesize the discovery map for ${repo} (head ${inv.head || '?'}, ${inv.totals?.source_files || '?'} source files, ${inv.totals?.loc || '?'} LOC, ${mapped.length} modules mapped, ${dropped} unmapped, ${rounds.length} search round(s), stopped: ${stopReason}).\n\n` +
        (notMapped.length
          ? `COVERAGE CAP: the fan-out was capped at the ${modules.length} largest modules (${coveragePct}% of LOC). These ${notMapped.length} modules were NOT read: ${JSON.stringify(notMappedList)}. Never describe them as mapped or clean.\n\n`
          : '') +
        `INPUTS (already deduplicated and checked; do not re-derive)\n` +
        `- Modules: ${JSON.stringify(mapped.map(({ corrections, ...r }) => r))}\n` +
        `- VERIFIED findings (unanimous skeptics; state as fact): ${JSON.stringify(verified.map(slim))}\n` +
        `- UNVERIFIED findings (split vote, not checked, or agent cap; present ONLY in a clearly labelled "Unverified" subsection, never as fact): ${JSON.stringify(unverified.map(slim))}\n` +
        `- Refuted findings: ${refutedCount} (excluded; do not mention individually).\n` +
        `- Config files: ${JSON.stringify(inv.configs || [])}\n- Docs: ${JSON.stringify(inv.docs || [])}\n\n` +
        `WRITE a markdown report${out ? ` to ${out} (create parent dirs if needed; overwrite)` : ''} with these sections:\n` +
        `1. Verdict: 5 lines max. What this repo is, its shape, the three things a newcomer must know, the biggest risk.\n` +
        `2. Architecture: an ASCII diagram (no Mermaid) of modules and the import edges from "inventory_edges" plus depends_on, entrypoints marked.\n` +
        `3. Module table: Module | Purpose | LOC | Depends on | External IO kinds | Tests | Confidence | Verified (skipped/verified/unverified/refuted).\n` +
        `4. External IO inventory: every verified io finding grouped by kind, with module and file:line; then an "Unverified" subsection.\n` +
        `5. Data shapes: the tables, record types, schemas and file formats, and which modules read vs write each.\n` +
        `6. Risks: verified risk findings with module and file:line; then an "Unverified" subsection; then open questions.\n` +
        `7. Next steps for the thinking work: what to read first, what to verify by hand (start with the unverified list), what the cleansing or refactor plan should start with. Recommend only.\n` +
        (notMapped.length ? `8. Not mapped: one line stating the coverage (${modules.length} of ${allModules.length} modules, ${coveragePct}% of LOC), then a table: Module | LOC | Files.\n` : '') +
        `Rules: no em-dashes anywhere; cite file paths; do not pad; where depends_on disagrees with inventory_edges say so. ` +
        `${out ? `After writing, read ${out} back and confirm it exists. ` : ''}Return a 10-line summary of the verdict and the report path as your final output.`,
      { label: 'synthesize', phase: 'Synthesize', model: synthModel },
    )

// Per-module cards for downstream renderers (result.cards), rebuilt from the ledger, so a card only
// ever shows verified or labelled-unverified findings.
const ioOf = (p) => all.filter((f) => f.module === p && f.category === 'io' && f.status !== 'refuted').map((f) => ({ kind: f.kind, target: f.target, file: `${f.file}:${f.line}`, status: f.status }))
const risksOf = (p) => all.filter((f) => f.module === p && f.category === 'risk' && f.status !== 'refuted').map((f) => ({ kind: f.kind, detail: f.claim, file: `${f.file}:${f.line}`, status: f.status }))

// Headline fields first: the parent session sees a truncated copy of this object.
return {
  repo,
  head: inv.head || null,
  stop_reason: stopReason,
  rounds,
  agents_used: agentsUsed,
  agents_cap: maxAgents,
  moduleCount: mapped.length,
  unmapped: dropped,
  capped: notMapped.length,
  coverage_loc_pct: coveragePct,
  findings_verified: verified.length,
  findings_unverified: unverified.length,
  findings_refuted: refutedCount,
  skeptic_candidates_unchecked: unchecked,
  checked: mapped.filter((c) => c.status !== 'skipped').length,
  contested: contested.map((c) => ({ path: c.path, refutes: c.refutes, votes: c.votes })),
  report_path: out,
  summary: synthesis,
  ts: A.ts || null,
  not_mapped: notMappedList,
  findings: { verified: verified.map(slim), unverified: unverified.map(slim) },
  cards: mapped.map((c) => ({
    ...c,
    verified: c.status,
    contested: c.status === 'refuted',
    corrections: c.corrections || [],
    external_io: ioOf(c.path),
    risks: risksOf(c.path),
  })),
}
