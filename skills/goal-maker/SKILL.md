---
name: goal-maker
description: "Turn a fuzzy idea, half-formed prompt, or triaged item into a well-formed, runnable GOAL card. This is the front-door optimizer that sits UPSTREAM of decompose-goal: goal-maker produces the clean goal + execution shape (loop/cron/subagents/worktree/one-shot) with owner/sink/kill, and decompose-goal then atomizes that goal into subtasks. Use whenever the user says \"goal-maker\", \"make a goal\", \"turn this into a goal\", \"optimize this into a goal\", \"turn this prompt into a goal and loop\", \"set this up as a goal/loop\", \"how should I run this\", or when an item leaving a capture step or a triage step needs to become something actually executable. Trigger on a raw idea that needs sharpening into an objective with success criteria and a chosen way to run it. Do NOT trigger to break an ALREADY-clean goal into steps (that is decompose-goal's job) or to rewrite a system prompt for an agent (that is prompt-rewriter)."
---

# goal-maker — fuzzy idea to a runnable goal card

A raw idea ("I want to keep an eye on what competitors ship") is not yet runnable.
It has no success criteria, no boundaries, and no decision about how it should
execute. goal-maker is the optimizer that closes that gap: it sharpens the idea
into a crisp objective, attaches an observable done-state, and recommends how to
run it. The output is a single goal card that decompose-goal can atomize and a
poller can pick up.

Think of the pipeline as: capture (a capture step) -> review (a triage step) ->
**goal-maker (this skill: idea -> runnable goal)** -> decompose-goal (goal ->
atomic cards) -> executor -> sink. goal-maker owns exactly one seam: turning
intent into a well-formed goal. Keep it to that seam. Do not atomize into
subtasks here, and do not start executing. Hand the card downstream.

## Why a "goal" is more than a sentence

Most fuzzy prompts fail downstream for three reasons, and the card has one field
for each:

1. **No measurable finish.** "Monitor competitors" never ends. A goal needs a
   done-state an outside observer could verify (a file exists, a digest was sent,
   a value was captured). That is the `## Done when` line.
2. **No chosen way to run.** The same goal can be a one-shot, a polling loop, a
   nightly cron, or a parallel fan-out. Choosing wrong is the most common and most
   expensive mistake (a loop that should have been a cron dies silently when the
   session closes). That is the `shape:` field.
3. **No owner of the result.** A loop or cron that logs to nowhere is silent debt.
   Per the No Orphan Loops rule, any recurring goal must name who reads it, where
   the result lands, and when it stops. Those are `owner:` / `sink:` / `kill:`.

Filling those three is the whole job. If you can fill them, the goal is runnable.

## Step 1 — Read the mode (interactive vs headless)

goal-maker runs in two contexts and must behave differently in each:

- **Interactive** (a human invoked it in a live session). If the idea is fuzzy or
  underspecified, ask 2 to 3 sharpening questions BEFORE writing the card. Aim the
  questions at whatever is blocking a clean done-state or shape decision, for
  example: "Is this a one-time thing or should it keep running?", "Who or what
  reads the result?", "What would make you call this finished?". Keep it light;
  this is not a full planning interview, just enough to write a real card.
- **Headless** (invoked by a cron, a pipeline step, or any non-interactive
  dispatch). Do NOT ask questions, because nothing is listening. Produce a
  best-effort card from what you were given and list every assumption you made
  under an `## Assumptions` section so a human can correct them later.

Infer the mode from context. When genuinely unsure, default to interactive and ask.

## Step 2 — Optimize the idea into an objective

Rewrite the raw input into one imperative paragraph that states the outcome, not
the procedure. Strip vagueness ("keep an eye on" becomes "check X and report
deltas"). Name concrete artifacts where known (a path, a URL, an account, an env
var). Do not invent scope the user did not imply, and do not bake in step-by-step
how-to (that is decompose-goal's territory). The test for a good objective: could
two different executors read it and agree on what success looks like?

## Step 3 — Write the done-state

State, in one sentence, the concrete observable that proves the goal succeeded.
Distrust restatements: "competitors are monitored" is not observable; "a dated
digest exists at <output-path>/competitors-<date>.md and was delivered to its
sink" is. This single sentence is also exactly what decompose-goal uses as its
verification litmus test, so writing it well here pays off twice.

## Step 4 — Recommend the execution shape (then get approval)

Pick the smallest primitive that fits, using this decision tree. The shape is a
function of four yes/no questions about the goal:

| The goal is... | Recommend | Because |
|----------------|-----------|---------|
| Recurring AND must fire unattended (nightly, weekly, while you sleep) | **cron** (`/schedule`) | Survives session death. This is the durable form of a loop. |
| Recurring BUT only while you are actively working (polling a build, draining a queue) | **loop** (`/loop`) | Session-bound. Dies when the session closes, which is fine here. |
| One-shot with many INDEPENDENT parts that are each substantial (slow, token-heavy, or deep) | **subagents** (Workflow parallel/pipeline) | Fan-out. Each part gets its own context budget. The overhead only pays off when the parts are heavy; for many small cheap items (dozens of one-line lookups), a plain one-shot loop in a single context is faster. |
| One-shot where parts edit the SAME repo simultaneously | **worktree** (add isolation to the subagents) | Stops parallel agents from stomping each other's files. Expensive; only here. |
| One-shot, sequential, single-threaded | **one-shot** | No orchestration primitive needed. Do not over-engineer. |

Two rules govern this step:

- **Recommend, do not impose.** Present the shape with a one-line rationale and let
  the human approve or override. Execution choices are a human-in-the-loop gate;
  never auto-lock them. In headless mode, still record the recommendation and
  reasoning in the card so a human can veto it before anything runs.
- **No Orphan Loops gate (hard).** The instant the recommended shape is `loop` or
  `cron`, the card MUST carry `owner`, `sink`, AND `kill` with real values. If you
  cannot fill all three, the goal is not shippable as a loop: either gather the
  missing values (ask in interactive mode) or **downgrade the shape to `one-shot`**
  and record the recurring intent under `## Why this shape` as a human-vetoable
  promotion path. Never emit a recurring card with an empty or guessed guard. A
  guessed sink (silently writing "telegram") would pass this gate's letter while
  defeating its purpose, so do not invent values to satisfy it.
- **The `UNRESOLVED` sentinel.** When a guard genuinely cannot be filled (headless
  mode, nothing to read), write the literal value `UNRESOLVED` for that field, not
  a prose note. This makes the unmet state machine-detectable: a downstream
  scheduling gate treats `UNRESOLVED` as a missing guard and blocks any recurring
  schedule built from it, and a File-Queue poller treats it as `blocked`. A card
  carrying any `UNRESOLVED` guard may ship as `one-shot` (which is ungated) but
  must never carry `shape: loop` or `shape: cron`. Pair it with an `## Assumptions`
  line naming what a human needs to supply.

## Output contract — the goal card

Emit one markdown card. The front-matter reuses the File-Queue card schema (one
`.md` per unit of work, with the owner/sink/kill guards in the front-matter)
field-for-field so the card is both decompose-ready and poller-ready with no
translation. Use this exact shape:

```markdown
---
id: Q-YYYYMMDD-NNNN          # stable id, matches the File-Queue Q- convention
title: <one line>
status: todo                  # always todo at creation
owner: <agent-or-human>       # who reads/acts on the result (required if shape is loop/cron)
sink: <path | telegram | inbox-item | digest>   # where the result lands
kill: <max-attempts or escalation>              # when to stop trying
shape: one-shot               # one-shot | loop | cron | subagents | worktree
depends_on: []                # other card ids that must be done first
attempts: 0
created: YYYY-MM-DD
source: <where this idea came from: triage, capture, direct, ...>
---

## Goal
<one optimized imperative paragraph: the outcome, named artifacts, no how-to>

## Done when
<one sentence; a concrete observable an outside party could verify>

## Action
<one imperative line summarizing the first move: Search / Read / Write / Run / Halt.
This is the handle decompose-goal expands. Keep it to one line.>

## Why this shape
<one or two lines: which branch of the decision tree fired and why>

## Assumptions        # headless mode only, or when you had to guess
<bullets of anything you inferred rather than were told>
```

Rules for the card:

- `id` uses today's date and a sequence number. If you cannot know the next
  sequence number, use `-0001` and note it as an assumption.
- `created` is today's date in `YYYY-MM-DD`. Do not invent other timestamps.
- For a `one-shot` shape, `owner`/`sink`/`kill` are encouraged but not gated; for
  `loop`/`cron` they are mandatory (see Step 4).
- Omit `## Assumptions` entirely in clean interactive runs where you assumed nothing.
- Output only the card. No preamble in headless mode. In interactive mode you may
  add one short line after the card offering the obvious next step ("Want me to run
  decompose-goal on this?").

## Worked example (interactive)

Input: "I keep meaning to check what Anthropic ships each week but I forget."

After two sharpening questions (How often? Where should the summary go?), the card:

```markdown
---
id: Q-20260613-0001
title: Weekly Anthropic release watch
status: todo
owner: <you>
sink: telegram
kill: 3 failed fetches in a row -> escalate to <owner>
shape: cron
depends_on: []
attempts: 0
created: 2026-06-13
source: direct
---

## Goal
Check Anthropic's changelog, blog, and model pages once a week, capture anything
new since the last run, and summarize the deltas in plain language.

## Done when
A dated summary of new Anthropic releases is posted to Telegram, or the run reports
"no new releases since <last-date>".

## Action
Fetch Anthropic changelog/blog/model pages and diff against the last run's state file.

## Why this shape
Recurring and must fire unattended on a weekly cadence, so cron, not loop. owner,
sink, and kill are all set, so it clears the No Orphan Loops gate.
```

That card is ready to hand to decompose-goal, or to /schedule once approved.

## What goal-maker does NOT do

- It does not break the goal into the ordered subtask list. That is decompose-goal.
  goal-maker writes the single `## Action` handle and stops.
- It does not execute, schedule, or dispatch anything. It recommends a shape and
  waits for a human to approve. Building the cron/loop/team is a separate step.
- It does not rewrite an agent's system prompt. That is prompt-rewriter.

Holding this line is what keeps the pipeline composable: each stage has one job and
a clean contract with the next.
