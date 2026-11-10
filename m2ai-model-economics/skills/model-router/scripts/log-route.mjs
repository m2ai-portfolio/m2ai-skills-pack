#!/usr/bin/env node
// Append-only dispatch/outcome/review log for the model-router skill.
// Log: ~/logs/model-router/routes.jsonl (one JSON event per line)
//
// Usage:
//   node log-route.mjs dispatch --tier fable|opus|sonnet|haiku|local --mode letter|auto \
//        --task "short summary" [--session <id>] [--lesson <lesson-id>] [--wanted <tier>]
//     -> prints the new route id (rt-<epoch>-<rand>)
//     --wanted: the tier the router would have picked when an explicit choice (letter, named
//     model, or the user's redirect) kept a different one. Stored only when it differs ("kept
//     <tier>, wanted <wanted>"). Optional, so legacy rows and callers are unaffected.
//   node log-route.mjs outcome --id rt-... --result clean|needed-rework|escalated-tier \
//        [--tokens N] [--note "..."]
//   node log-route.mjs pending [--session <id>] [--json]
//     -> dispatches with no outcome (the outcome-capture gap)
//   node log-route.mjs review-check [--json]
//     -> the every-invocation evidence surface (Phase 0.5). Deterministic, no model.
//   node log-route.mjs review --routes-since N --findings N --proposed N [--accepted N]
//     -> records that a review pass ran
//
// Design notes (war game 2026-08-13):
//  - Routes whose task begins with "review:" are EXCLUDED from route counts, so a review
//    dispatch can never trigger or inflate the next review (failure mode 4).
//  - `pending` ignores dispatches older than STALE_DAYS and reports them as abandoned
//    rather than nagging forever (failure mode 5).
//  - Truncation guard: dispatches older than the earliest outcome in the log are treated as
//    unknowable rather than pending (failure mode 7).
//  - Ladder rung is NOT stored here. It lives in references/review-state.json (failure mode 7).

import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const LOG_DIR = join(homedir(), "logs", "model-router");
const LOG_FILE = join(LOG_DIR, "routes.jsonl");

const HERE = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(HERE, "..", "references", "review-state.json");

const TIERS = ["fable", "opus", "sonnet", "haiku", "local"];
const MODES = ["letter", "auto"];
const RESULTS = ["clean", "needed-rework", "escalated-tier"];
const CHANNELS = ["inline", "subagent"];

// Tunables. Kept as named constants so the war-game thresholds are greppable.
const STALE_DAYS = 7; // beyond this a pending dispatch is abandoned, not nagged
const TRAILING_DAYS = 14; // window for the non-clean surface and per-tier rates
const MIN_OUTCOMES_TO_REVIEW = 5; // floor: never review a near-empty log (failure mode 8)
const TRIGGER_NONCLEAN = 2; // new non-clean outcomes since last review
const TRIGGER_ROUTES = 10; // routes since last review
const TRIGGER_PENDING = 3; // dispatches missing an outcome
const BAD_TIER_RATE = 0.30; // non-clean rate that makes a tier "hot" for justify-or-divert
const BAD_TIER_MIN_N = 5; // ...but only once the tier has this many outcomes in the window

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) args[argv[i].slice(2)] = argv[i + 1] ?? "";
  }
  return args;
}

function die(msg) {
  console.error(`log-route: ${msg}`);
  process.exit(1);
}

function readEvents() {
  if (!existsSync(LOG_FILE)) return [];
  const out = [];
  for (const line of readFileSync(LOG_FILE, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      out.push(JSON.parse(t));
    } catch {
      // A corrupt line must never take the whole surface down. Skip it.
    }
  }
  return out;
}

function readState() {
  const base = { rung: 1, passes_at_rung: 0, predictions: [] };
  if (!existsSync(STATE_FILE)) return base;
  try {
    return { ...base, ...JSON.parse(readFileSync(STATE_FILE, "utf8")) };
  } catch {
    return base;
  }
}

const isReviewRoute = (d) => typeof d.task === "string" && d.task.startsWith("review:");
const daysAgo = (iso) => (Date.now() - new Date(iso).getTime()) / 86400000;

// Split the log into the shapes every subcommand needs.
function digest() {
  const ev = readEvents();
  const dispatches = ev.filter((e) => e.event === "dispatch");
  const outcomes = ev.filter((e) => e.event === "outcome");
  const reviews = ev.filter((e) => e.event === "review");

  const outcomeById = new Map();
  for (const o of outcomes) outcomeById.set(o.id, o); // later events supersede earlier

  // Truncation guard: anything predating the earliest surviving outcome is unknowable.
  const earliestOutcomeTs = outcomes.length
    ? Math.min(...outcomes.map((o) => new Date(o.ts).getTime()))
    : null;

  const realRoutes = dispatches.filter((d) => !isReviewRoute(d));
  const lastReviewTs = reviews.length
    ? Math.max(...reviews.map((r) => new Date(r.ts).getTime()))
    : null;

  const pending = [];
  const abandoned = [];
  for (const d of realRoutes) {
    if (outcomeById.has(d.id)) continue;
    const ts = new Date(d.ts).getTime();
    if (earliestOutcomeTs !== null && ts < earliestOutcomeTs) continue; // truncated history
    (daysAgo(d.ts) > STALE_DAYS ? abandoned : pending).push(d);
  }

  const inWindow = (e) => daysAgo(e.ts) <= TRAILING_DAYS;
  const recentNonClean = outcomes
    .filter((o) => o.result !== "clean" && inWindow(o))
    .map((o) => ({ ...o, dispatch: realRoutes.find((d) => d.id === o.id) || null }));

  // Channel overlay. The log is append-only, so a historical route's channel is corrected by
  // an `annotate` event rather than by rewriting its dispatch row.
  const channelById = new Map();
  for (const d of dispatches) if (d.channel) channelById.set(d.id, d.channel);
  for (const a of ev.filter((e) => e.event === "annotate")) {
    if (a.id && CHANNELS.includes(a.channel)) channelById.set(a.id, a.channel);
  }

  // Per-tier non-clean rate over the trailing window, SUBAGENT ROUTES ONLY (finding F4,
  // card Q-20260813-0015). Inline routes are graded by the loop that just did the work,
  // often within milliseconds, so they are near-auto-clean by construction. Mixing them
  // with externally-checked dispatch routes biased this rate toward inlining everything,
  // and this rate BINDS the Phase 0.5 justify-or-divert rule.
  //
  // Routes with an UNKNOWN channel are excluded rather than assumed either way. That is
  // deliberate: every route logged before 2026-08-13 predates the field, so the rate goes
  // dark until clean data accumulates. A dark stat fails open (no tier goes hot, no false
  // diversion). A guessed stat fails silently in the direction of the original bug.
  const tierStats = {};
  let statKnown = 0;
  let statUnknown = 0;
  for (const d of realRoutes) {
    const o = outcomeById.get(d.id);
    if (!o || !inWindow(o)) continue;
    const ch = channelById.get(d.id);
    if (ch !== "subagent") {
      if (ch === undefined) statUnknown++;
      continue;
    }
    statKnown++;
    const s = (tierStats[d.tier] ||= { n: 0, bad: 0 });
    s.n++;
    if (o.result !== "clean") s.bad++;
  }
  for (const t of Object.keys(tierStats)) {
    const s = tierStats[t];
    s.rate = s.n ? s.bad / s.n : 0;
    s.hot = s.n >= BAD_TIER_MIN_N && s.rate >= BAD_TIER_RATE;
  }

  // Explicit choices that differed from the router's own pick. Evidence for the retro in both
  // directions; never used to override anything.
  const overrides = realRoutes.filter((d) => d.wanted && d.wanted !== d.tier && inWindow(d));

  const since = (ts) => (e) => lastReviewTs === null || new Date(e.ts).getTime() > lastReviewTs;
  const routesSinceReview = realRoutes.filter(since()).length;
  const nonCleanSinceReview = outcomes.filter((o) => o.result !== "clean").filter(since()).length;

  const totalOutcomes = outcomes.length;
  const triggers = [];
  if (nonCleanSinceReview >= TRIGGER_NONCLEAN)
    triggers.push(`${nonCleanSinceReview} non-clean outcomes since last review`);
  if (routesSinceReview >= TRIGGER_ROUTES)
    triggers.push(`${routesSinceReview} routes since last review`);
  if (pending.length >= TRIGGER_PENDING)
    triggers.push(`${pending.length} dispatches missing an outcome`);
  // Floor: a near-empty log has nothing worth reviewing (failure mode 8).
  const shouldReview = totalOutcomes >= MIN_OUTCOMES_TO_REVIEW && triggers.length > 0;

  return {
    dispatches, outcomes, reviews, realRoutes, outcomeById,
    pending, abandoned, recentNonClean, overrides, tierStats, channelById, statKnown, statUnknown,
    routesSinceReview, nonCleanSinceReview, totalOutcomes,
    shouldReview, triggers, lastReviewTs,
    state: readState(),
  };
}

const [event, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
const now = new Date().toISOString();

// ---- read-only subcommands ------------------------------------------------

if (event === "pending") {
  const d = digest();
  let rows = d.pending;
  if (args.session) rows = rows.filter((r) => r.session === args.session);
  if ("json" in args) {
    console.log(JSON.stringify({ pending: rows, abandoned: d.abandoned }, null, 2));
  } else if (!rows.length) {
    console.log("no pending outcomes");
  } else {
    console.log(`${rows.length} dispatch(es) with no logged outcome:`);
    for (const r of rows) {
      console.log(`  ${r.id}  tier=${r.tier}  ${daysAgo(r.ts).toFixed(1)}d ago  ${r.task}`);
    }
    console.log(`\nLog each with: log-route.mjs outcome --id <id> --result clean|needed-rework|escalated-tier`);
  }
  process.exit(0);
}

if (event === "review-check") {
  const d = digest();
  if ("json" in args) {
    console.log(JSON.stringify({
      pending: d.pending.map((p) => p.id),
      abandoned: d.abandoned.length,
      recent_non_clean: d.recentNonClean.length,
      overrides: d.overrides.length,
      tier_stats: d.tierStats,
      routes_since_review: d.routesSinceReview,
      non_clean_since_review: d.nonCleanSinceReview,
      should_review: d.shouldReview,
      triggers: d.triggers,
      rung: d.state.rung,
      open_predictions: (d.state.predictions || []).filter((p) => p.status === "open").length,
    }, null, 2));
    process.exit(0);
  }

  const L = [];
  L.push(`ROUTER CHECK  (${d.totalOutcomes} outcomes logged, rung ${d.state.rung})`);

  if (d.pending.length) {
    L.push(`  PENDING OUTCOMES (${d.pending.length}): ${d.pending.map((p) => p.id).join(", ")}`);
  }
  if (d.abandoned.length) {
    L.push(`  abandoned (>${STALE_DAYS}d, not nagged): ${d.abandoned.length}`);
  }

  const hot = Object.entries(d.tierStats).filter(([, s]) => s.hot);
  if (hot.length) {
    L.push(`  HOT TIERS (justify-or-divert applies):`);
    for (const [t, s] of hot) {
      L.push(`    ${t}: ${s.bad}/${s.n} non-clean in ${TRAILING_DAYS}d (${(s.rate * 100).toFixed(0)}%)`);
    }
  }
  // Always state the denominator. A silent zero-coverage stat reads as "all tiers healthy",
  // which is exactly the misread that finding F4 was about.
  if (d.statUnknown && !d.statKnown) {
    L.push(`  tier rates: NO DATA (${d.statUnknown} in-window route(s) have an unknown channel, excluded)`);
    L.push(`    justify-or-divert is inert until subagent routes accumulate. This fails open by design.`);
  } else if (d.statUnknown) {
    L.push(`  tier rates over ${d.statKnown} subagent route(s); ${d.statUnknown} excluded (unknown channel)`);
  }

  if (d.recentNonClean.length) {
    L.push(`  RECENT NON-CLEAN (${TRAILING_DAYS}d):`);
    for (const o of d.recentNonClean) {
      const tier = o.dispatch ? o.dispatch.tier : "?";
      const note = (o.note || "").slice(0, 90);
      L.push(`    [${o.result}] ${tier}: ${note}`);
    }
  }

  if (d.overrides.length) {
    L.push(`  OVERRIDES (${d.overrides.length}) in ${TRAILING_DAYS}d, explicit choice kept over the router's pick:`);
    for (const o of d.overrides.slice(-5)) {
      const res = d.outcomeById.get(o.id)?.result ?? "no outcome";
      L.push(`    ${o.id} kept ${o.tier}, wanted ${o.wanted} [${res}]`);
    }
  }

  const openPreds = (d.state.predictions || []).filter((p) => p.status === "open");
  if (openPreds.length) {
    L.push(`  OPEN PREDICTIONS (${openPreds.length}) awaiting confirmation before they count toward graduation`);
  }

  L.push(d.shouldReview
    ? `  REVIEW DUE: ${d.triggers.join("; ")}`
    : `  review not due (${d.routesSinceReview} routes / ${d.nonCleanSinceReview} non-clean since last)`);

  console.log(L.join("\n"));
  process.exit(0);
}

// ---- append subcommands ---------------------------------------------------

let record;
if (event === "dispatch") {
  if (!TIERS.includes(args.tier)) die(`--tier must be one of ${TIERS.join("|")}`);
  if (!MODES.includes(args.mode)) die(`--mode must be one of ${MODES.join("|")}`);
  if (!args.task) die("--task is required");
  const id = `rt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  if (args.channel && !CHANNELS.includes(args.channel))
    die(`--channel must be one of ${CHANNELS.join("|")}`);
  if ("wanted" in args && !TIERS.includes(args.wanted))
    die(`--wanted must be one of ${TIERS.join("|")}`);
  record = { event, id, ts: now, tier: args.tier, mode: args.mode, task: args.task };
  if (args.channel) record.channel = args.channel;
  if (args.wanted && args.wanted !== args.tier) record.wanted = args.wanted;
  if (args.session) record.session = args.session;
  if (args.lesson) record.lesson = args.lesson; // provenance, guards failure mode 9
  console.log(id);
} else if (event === "annotate") {
  // Append-only correction of a historical route's channel. Never rewrites the dispatch row.
  if (!args.id) die("--id is required");
  if (!CHANNELS.includes(args.channel)) die(`--channel must be one of ${CHANNELS.join("|")}`);
  record = { event, id: args.id, ts: now, channel: args.channel };
  if (args.note) record.note = args.note;
} else if (event === "outcome") {
  if (!args.id) die("--id is required");
  if (!RESULTS.includes(args.result)) die(`--result must be one of ${RESULTS.join("|")}`);
  record = { event, id: args.id, ts: now, result: args.result };
  if (args.tokens) record.tokens = Number(args.tokens);
  if (args.note) record.note = args.note;
} else if (event === "review") {
  record = {
    event, ts: now,
    routes_since_last: Number(args["routes-since"] || 0),
    findings: Number(args.findings || 0),
    proposed: Number(args.proposed || 0),
    accepted: Number(args.accepted || 0),
    rung: readState().rung,
  };
} else {
  die('first arg must be one of: dispatch | outcome | annotate | pending | review-check | review');
}

mkdirSync(LOG_DIR, { recursive: true });
appendFileSync(LOG_FILE, JSON.stringify(record) + "\n");
