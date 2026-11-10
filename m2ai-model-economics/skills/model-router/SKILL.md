---
name: model-router
description: "Routes a task to the right model tier (Fable/Opus/Sonnet/Haiku/Local-SLM) and dispatches it immediately: as a subagent for Anthropic tiers, or via a local OpenAI-compatible server (llama-server, vLLM, Ollama) for the L tier. Auto-classifies by reasoning complexity, agency needs, output length, and cost sensitivity; a leading letter (f/o/s/h/l) forces a tier. Use when the user says \"model router\", \"route this\", \"reach up/down\", gives a letter-prefixed task, or asks which model a task needs."
allowed-tools: Agent, Bash, Read
---

# Model Router

The ladder assumes the main loop runs on the top tier, Fable (verify with `/model`; if yours runs on Opus, treat Opus as the inline tier). This skill picks a tier and, unless told otherwise, dispatches right away. Fable is both the inline tier (main loop does it) and a dispatchable tier (isolated subagent for adversarial review, planning, judging).

- **F (Fable)**: planning, architecture, intense multi-step reasoning, adversarial review. Inline by default; dispatch only when isolation matters (a reviewer must not grade its own work).
- **O (Opus)**: dispatchable tier for medium-reasoning, low-error-tolerance work (ETL, migrations, structured analysis).
- **S (Sonnet)**: routine implementation, drafts, standard codegen, content.
- **H (Haiku)**: repetitive transforms, lookups, formatting, template filling.
- **L (Local SLM)**: leaf tasks with zero agency (classify, tag, extract, summarize given text, score against a fixed rubric). $0, no subscription quota, never spawns a subagent. On a local server the real limit is usually latency (cold prefill of a large prompt), not context. Keep cold prompts small enough to finish inside the default 120 s timeout, or pass `--timeout <ms>` in milliseconds (e.g. `--timeout 300000`; `--timeout 300` aborts almost instantly). A timeout exits 2 with the same "SLM host unreachable" message as a dead host, so read the parenthesized reason before escalating; otherwise split or route Haiku.

**Tiers describe the work, not the model.** Classification picks a letter from the task's shape; model names live only in the Phase 2 mapping, so a renamed model is a mapping edit (after `/chub`). A model the ladder does not name (new release, versioned id, whatever `/model` shows) is never placed by guessing from its name: it is not the cheapest tier and not permission to downgrade. If the task needs a tier you cannot confirm the main loop meets, dispatch instead of inlining.

## Phase 0.5: Router check (every invocation, first)

Run scripts with Bash; don't Read `scripts/*.mjs`. `SKILL_DIR` is this skill's folder.

```bash
node $SKILL_DIR/scripts/log-route.mjs review-check
```

It reports dispatches missing an outcome, recent non-clean outcomes, per-tier failure rates, open predictions, and whether a review is due. Its output binds:

1. **Justify-or-divert on a HOT tier.** If your chosen tier is under `HOT TIERS` (30% non-clean over 5+ subagent outcomes), pick another tier or state in one line why this task is exempt. `tier rates: NO DATA` makes this rule inert by design. On a letter route the letter wins: name the hot rate in the dispatch note.
2. **Clear the visible gap.** If `PENDING OUTCOMES` names a route from this session, log its outcome now.

If `REVIEW DUE` appears, run the review pass after this dispatch (see [references/review-and-retro.md](references/review-and-retro.md)).

## Phase 0: Explicit choice (never overridden)

If args start with a tier letter (`f`/`o`/`s`/`h`/`l`, case-insensitive, then `:` or whitespace) or name a model ("on haiku", `model: "opus"`), use exactly that and skip classification (`--mode letter`). Nothing moves an explicit choice, up or down: not a lesson, a HOT tier, or the risk check. Name any conflict in one line of the dispatch note; if your quick read would have picked differently, log it as `--wanted` without running a full classification. A named model the Agent tool does not accept is reported back, never swapped for the nearest tier.

## Phase 1: Classification (no letter given)

Read `references/routing-lessons.md` first: its lessons override the matrix. (Read it on letter dispatches too, to name conflicts.)

**Action risk (raises the floor only).** Would carrying out the task itself change production, move real money, or alter unrecoverable data? Writing or testing code *about* those things without running it against the real system does not count ("add a refund endpoint that calls Stripe" is ordinary code). Yes forces **F**, skipping matrix, lessons, and downgrade bar. Risk picks the tier only; reserved actions (publish, deploy, spend, external contact) still need the user's explicit approval.

**Agency gate (before the matrix).** If the task needs no tools (pure text-in/text-out on content you can paste) and reasoning is Low, route **L** instead of Haiku. Any tool use sets the floor at Haiku.

| Reasoning | Error tolerance | Tier |
|-----------|-----------------|------|
| Low | Any | **L** if no agency, else **Haiku** (Sonnet if code) |
| Medium | High/Medium | **Sonnet** |
| Medium | Low | **Opus** |
| High | High | **Opus** |
| High | Medium/Low | **Fable** |

Low reasoning = formatting, lookups, templates; Medium = standard codegen, bug fixes, content, extraction; High = architecture, deep multi-step reasoning, novel design, plan critique. Low error tolerance = production code, client deliverables, one-shot outputs, plans others build against.

Overrides:
- Planning, architecture, or "make sure this is right": **Fable**. Pure formatting or repetitive per-item work: **Haiku**.
- "Quick and dirty": down one tier. "Make it good": up one tier.
- Genuinely borderline: stay **Fable-inline**. Don't dispatch recon or verification fan-out above Sonnet without a stated reason.
- **Down needs more evidence than up.** Going below the matrix cell, or settling a borderline call downward, needs a one-line confidence statement in the dispatch note (why the cheaper tier suffices here). No statement, no downgrade. An outcome-backed lesson or the user's "quick and dirty" counts as the statement.

## Phase 2: Dispatch

Dispatch immediately without asking; state one line: tier + why.

**Decide once per task.** Retries, nudges, and follow-ups reuse the route id and tier. Changing tier is a new decision: log `escalated-tier` on the old id, then dispatch fresh. If one invocation carries several tasks and you can't tell which judgment belongs to which, split them (see Batch below) or ask.

- **Fable-inline**: no subagent; main loop does it, logs `--channel inline`.
- **Fable/Opus/Sonnet/Haiku subagent**: Agent tool with `model: "fable" | "opus" | "sonnet" | "haiku"`. Subagents don't see this conversation, so pass full task text and paths. Fan out parallel Haiku calls in one message for repetitive batches.
- **L tier**: no subagent; dispatch via Bash:

  ```bash
  node $SKILL_DIR/scripts/slm-run.mjs --prompt "<task + pasted content>" [--system "<role>"] [--json | --schema '<json-schema>'] [--timeout <ms>]
  ```

  - Endpoint: any OpenAI-compatible server at `LLM_BASE_URL` (required, e.g. `http://<your-host>:8080`). Model from `--model` or `LLM_MODEL`. Check with `curl $LLM_BASE_URL/v1/models`.
  - The SLM sees only the prompt; paste content in. Use `--json` or `--schema` for structured output (the script validates).
  - **Escalation**: nonzero exit (2 unreachable/timeout, 3 bad/empty, 4 schema fail) → rerun that call once on **Haiku** via Agent and log `escalated-tier`. Don't retry the SLM more than once.
  - Server down: route the call to Haiku and say so; the L tier is optional.

Constraints:
- Subagents reached via the Agent `model` param run on the session's own auth. Never pass an API key to reach a tier.
- Fable subagents cap at ~64K output; split very long deliverables into stages.
- A Fable dispatch here is an explicit per-task decision, overriding the general "subagents = Opus/Sonnet" economy rule.
- **Routing never touches the main loop.** Don't switch session model/effort (`/model`, `/effort`) to route: it discards the prompt cache. If the whole session belongs on another tier, tell the user.

### Log the dispatch

Right after choosing the tier (including Fable-inline), log it and keep the printed id:

```bash
node $SKILL_DIR/scripts/log-route.mjs dispatch --tier <tier> --mode <letter|auto> \
  --task "<one-line summary>" --session "<session id>" --channel <inline|subagent> [--wanted <tier>] [--lesson <id>]
```

- `--channel` is required in practice: per-tier failure rates count `subagent` routes only (Agent or SLM), and a route without it drops out of the statistic.
- `--session` always: `pending --session <id>` uses it to list this session's unlogged outcomes (a Stop hook can call it to nag before the session ends).
- `--wanted` records "kept X, wanted Y" for explicit choices (listed under `OVERRIDES`). If the user redirects your route, log the redo as a new `--mode letter` dispatch with `--wanted <your tier>`; the original gets its own outcome.
- `--lesson <id>` when a lesson influenced the tier, so a lesson can't later be justified only by routes it caused.

## Phase 3: Report and grade

Relay the result with the tier used, then log the outcome. Grade the FIRST return (see the first-return [RULE] in `references/routing-lessons.md`): if it lacked the deliverable (went idle, described the work, needed a nudge or re-emit), it is `needed-rework` with a note like `--note "nudge: first return described work, artifact after nudge"`, even if the final work was good. Work redone at a higher tier is `escalated-tier`.

```bash
node $SKILL_DIR/scripts/log-route.mjs outcome --id <route-id> --result clean|needed-rework|escalated-tier [--tokens N] [--note "..."]
```

Pass `--tokens` (input+output) whenever the Agent result reports usage. If rework surfaces later in the session, log a corrected `outcome` for that id (later events supersede). Produce a cost table only if asked or for pipeline routing, with pricing verified via `/chub`.

## Phase 3.5 review and Phase 4 retro

The review pass (on `REVIEW DUE`) and the manual retro (on "model-router retro") are in [references/review-and-retro.md](references/review-and-retro.md), including the reviewer-tier rules, the write-authority ladder (`references/review-state.json`), and the log path `~/logs/model-router/routes.jsonl`. Only those two phases write `references/routing-lessons.md`.

## Anti-patterns (unknown never reads as permission)

- Placing an unlisted model on the ladder by name, so it lands as the cheapest tier or skips the downgrade bar.
- Treating missing judgment (unset effort, absent confidence statement, unread `/model`) as "no objection". Missing evidence blocks a downgrade.
- Moving an explicit letter or named model "for the user's good", then logging a tier that never ran.
- Model names in the classifier, or a main-loop model switch to route.

## Batch / pipeline routing

For a multi-step pipeline, route each step independently and show the tier map before dispatching, e.g. `Step 1 → Haiku, Step 2 → Sonnet, Step 3 → Fable`.

## Configuration

- `LLM_BASE_URL`: base URL of an OpenAI-compatible local server for the L tier (e.g. `http://<your-host>:8080`). Unset means the L tier is unavailable; `slm-run.mjs` exits 2 and the call escalates to Haiku.
- `LLM_MODEL`: default model id for the L tier (or pass `--model`).
- Route log: `~/logs/model-router/routes.jsonl` (created on first dispatch). Trust-ladder state: `references/review-state.json`.
- Tests: `node --test $SKILL_DIR/scripts/log-route.test.mjs` (they point HOME at a temp dir and never touch the real log).
