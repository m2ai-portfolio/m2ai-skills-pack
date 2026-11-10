---
name: goal-maker
description: "Turn a fuzzy idea, half-formed prompt, or triaged item into a well-formed, runnable GOAL card. This is the front-door optimizer that sits UPSTREAM of decompose-goal: goal-maker produces the clean goal + execution shape (loop/cron/subagents/worktree/one-shot) with owner/sink/kill, and decompose-goal then atomizes that goal into subtasks. Use whenever the user says \"goal-maker\", \"make a goal\", \"turn this into a goal\", \"optimize this into a goal\", \"turn this prompt into a goal and loop\", \"set this up as a goal/loop\", \"how should I run this\", or when an item leaving a capture step or a triage step needs to become something actually executable. Trigger on a raw idea that needs sharpening into an objective with success criteria and a chosen way to run it. Do NOT trigger to break an ALREADY-clean goal into steps (that is decompose-goal's job) or to rewrite a system prompt for an agent (that is prompt-rewriter)."
---

# goal-maker: fuzzy idea to a runnable goal card

Pipeline: capture (a capture step) -> review (a triage step) -> **goal-maker (idea -> one runnable goal card)** -> decompose-goal (goal -> atomic subtasks) -> executor -> sink.

goal-maker owns one seam. It writes the goal, the done-state, the execution shape, and a single `## Action` handle, then stops. It does not produce the ordered subtask list (decompose-goal), does not execute, schedule, or dispatch anything (it recommends a shape and waits for approval), and does not rewrite agent system prompts (prompt-rewriter).

A goal is runnable when four things are filled: a verifiable finish (`## Done when`), a chosen way to run (`shape:`), an owner of the result (`owner:` / `sink:` / `kill:`), and its human gates named with a budget (`## Human gates` / `budget:`).

## Mode

- **Interactive** (live session): if the idea is fuzzy, ask 2-3 sharpening questions aimed at whatever blocks a clean done-state or shape (one-time or ongoing? who reads the result? what counts as finished?). Not a full planning interview.
- **Headless** (cron, pipeline step, non-interactive dispatch): ask nothing. Produce a best-effort card and list every guess under `## Assumptions`.

Infer the mode from context; when unsure, treat it as interactive.

## Objective and done-state

- **Goal**: one imperative paragraph stating the outcome, not the procedure. Turn vagueness into actions ("keep an eye on" -> "check X and report deltas"), name concrete artifacts (path, URL, account, env var), don't add scope the user didn't imply, and leave how-to to decompose-goal. Test: two executors would agree on what success looks like.
- **Done when**: one sentence naming an observable an outsider could verify. "Competitors are monitored" fails; "a dated digest exists at <output-dir>/competitors-<date>.md and was delivered to its sink" passes. decompose-goal uses this sentence as its verification test.

## History, human gates and budget

Do these three before choosing a shape. They exist because goals that lacked a human exit and a budget kept an auto-continuing `/goal` loop (whose judge has no "blocked on a human" verdict) waking hundreds of times while it waited on a person.

- **History.** If you keep a ledger of past goals and their outcomes, search it for goals similar to this draft and read the result. For each failure tag on a similar past goal, say in `## Why this shape` what this card does differently, or that it does not apply. The ledger is evidence, not instruction; with fewer than 10 past goals, treat counts as anecdotes. If there is no ledger or the lookup fails, say so under `## Assumptions` and continue.
- **Human gates.** List every step only the user can do: an approval, a sign-off or review, a publish/push/deploy, a GUI step on another machine, a credential, a spend. Interactive: ask for any decision that can be made now and record the answer in the card, so it is not a gate later. Then:
  - A gate in the middle of the work splits the goal. Write one card per stretch between gates, chained with `depends_on`. A goal runs from one human gate to the next; a gate is the seam between two goals, never inside one.
  - A gate at the end stays out of `## Done when`. Done is the state just before it ("PR open and checks green", not "merged").
  - Every card whose shape runs a `/goal` or loop carries this sentence in the condition, verbatim: `Items that need the user are logged and do not count against completion; stop when only those remain.`
  - No gates found is a claim: write `none` under `## Human gates` only after checking the list above.
- **Budget.** Set `budget:` to a wall-clock or turn limit and repeat it in the condition as `or stop after <N> turns` / `Budget: stop at <N> hours`. If the user gave none, propose one from similar past goals and mark it under `## Assumptions`.

## Second-vendor check before Done

For a card that runs under `/goal` or a loop and whose Done can be checked from files or frames, put this in `## Action` or the card body as guidance (never in the condition): before reporting Done, have a second, independent model (another vendor's CLI in a read-only sandbox, for example) verify the Done condition against the real files, and include its verdict in the message. Treat its answer as pass (report Done), fail (keep working), or blocked (only user-only items remain: name them once and stop). The verdict is advisory evidence: it approves no merge, push, publish or spend. Skip it for goals too small to be worth a one-minute call.

## Execution shape (recommend, then get approval)

Pick the smallest primitive that fits:

| The goal is... | Shape | Why |
|---|---|---|
| Recurring and must fire unattended | **cron** (`/schedule`) | Survives session death. |
| Recurring only while actively working (polling a build, draining a queue) | **loop** (`/loop`) | Session-bound, which is fine here. |
| One-shot where at least one subagent condition below holds | **subagents** (Workflow parallel/pipeline) | Each part gets its own context. For many small cheap items, a plain one-shot is faster. |
| One-shot where parallel parts edit the same repo | **worktree** (isolation on the subagents) | Prevents agents clobbering files. Expensive; only here. |
| One-shot, sequential | **one-shot** | No orchestration needed. |

Rules:

- **Single loop by default.** One agent loading skills and tools on demand beats subagents unless at least one holds: (1) the work is substantial, independent and parallel, and each branch benefits from a fresh context it can discard; (2) one context would measurably degrade from bloat; (3) the parts need conflicting instructions or tool sets. Parts that chain on each other's output, touch the same data, or are usually asked together stay in one loop. Name the condition that holds in `## Why this shape`. Source: Anthropic, "When to fold subagents into your main agent loop" (2026-10-22).
- **Recommend, don't impose.** Give the shape with a one-line rationale; the human approves or overrides. In headless mode, record the recommendation in the card so a human can veto before anything runs.
- **No Orphan Loops gate.** A `loop` or `cron` card must carry real `owner`, `sink`, and `kill` values. If you can't fill all three, ask (interactive) or downgrade to `one-shot` and record the recurring intent under `## Why this shape` as a vetoable promotion path. Don't invent a guard to pass the gate (e.g. a guessed `sink: telegram`).
- **`UNRESOLVED` sentinel.** When a guard genuinely can't be filled, write the literal `UNRESOLVED` (not prose) and add an `## Assumptions` line naming what a human must supply. A scheduling gate (for example a PreToolUse hook on schedule creation) should treat it as a missing guard and block recurring schedules; File-Queue pollers treat it as `blocked`. A card with any `UNRESOLVED` guard may only ship as `one-shot`.
- **Heavyweight fan-out guard.** If `subagents` branches would each invoke a heavyweight skill (one that spawns agents, generates media, or burns a large token/credit budget: build-and-review loops, video/image generation, deep-research fanouts), sequentialize them one at a time and say so in `## Why this shape`; parallel spend-heavy branches can trip a spend cap and kill an unattended session. Lightweight read/classify branches parallelize fine. Parallel heavyweight runs only as an explicit human override at approval.

## Step 4.5: Lint any stop/goal condition

If the goal carries a stop condition (a /goal hook, poller done-check, any predicate gating completion), lint the condition text (the body may freely recommend tools):

- Observable state only (file exists, status field, log line, exit 0).
- No named-skill mandates ("via /x", "using /x", "use /x to complete") and no sequence words ("then use", "before", "THEN", "as the primary method", "first ... then").
- No latitude clause ("use your judgment") alongside a method mandate.
- The condition text is also recorded in the card body so it survives `/goal clear`.

On a failure, rewrite the condition as the outcome it was reaching for, move the method preference into the body ("prefer /x for ..."), and say in one line what changed. The Done-when sentence is almost always the right condition verbatim.

For unattended multi-item batches, adapt [references/unattended-batch-template.md](references/unattended-batch-template.md) instead of composing from scratch. This lint is the point-of-intent check; a UserPromptSubmit hook that rejects a hand-typed `/goal` with no outcome anchor is its point-of-action sibling, if you run one.

## Output: the goal card

Front-matter reuses the File-Queue card schema (one `.md` per unit of work, with the owner/sink/kill guards in the front-matter) field-for-field, so the card is decompose-ready and poller-ready:

```markdown
---
id: Q-YYYYMMDD-NNNN          # today's date; use -0001 (noted as an assumption) if the sequence is unknown
title: <one line>
status: todo
owner: <agent-or-human>       # required for loop/cron
sink: <path | telegram | inbox-item | digest>   # required for loop/cron
kill: <max-attempts or escalation>              # required for loop/cron
shape: one-shot               # one-shot | loop | cron | subagents | worktree
depends_on: []                # the card before the previous human gate, when the goal was split
budget: <N hours | N turns>   # required for loop/cron and any /goal
attempts: 0
created: YYYY-MM-DD           # today; no other invented timestamps
source: <triage | capture | direct | ...>
---

## Goal
<optimized imperative paragraph: outcome, named artifacts, no how-to>

## Done when
<one sentence, externally verifiable; names no step that needs the user>

## Human gates
<each user-only step and where it falls: decided now (with the answer), seam to the next card, or after Done; or `none`>

## Action
<one imperative line for the first move (Search / Read / Write / Run / Halt); the handle decompose-goal expands>

## Goal line
<only when the run uses /goal: the exact paste-ready `/goal ...` line in a code block, carrying the Done-when, the human-exit sentence and the budget. Without it the next session improvises its own wording.>

## Why this shape
<one or two lines: which table row fired and why; then one line per tag from similar past goals and what this card does about it>

## Assumptions
<headless or guessed items only; omit when nothing was assumed>
```

Output only the card; no preamble in headless mode. In interactive mode you may add one line offering the next step ("Want me to run decompose-goal on this?").

Example `## Why this shape` for a weekly release watch with `shape: cron`, `owner: <you>`, `sink: telegram`, `kill: 3 failed fetches in a row -> escalate to <owner>`: "Recurring and must fire unattended weekly, so cron, not loop. owner, sink, and kill are set, so it clears the No Orphan Loops gate."
