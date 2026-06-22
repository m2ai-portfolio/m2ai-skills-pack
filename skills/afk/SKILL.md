---
name: afk
description: >
  AFK overnight worker. Fired by a scheduled task ("Run /afk") at a configured
  nightly time. Drains a content-backlog inbox: takes items the user tagged
  afk: ready and routes by the item's `type:` field. CONTENT items are expanded
  into a structured draft saved to a drafts vault directory. TASK items are
  decomposed into atomic subtasks (optionally via a more capable model) saved
  to a tasks vault directory. Updates the backlog item and reports one line of
  what it did. Opt-in only, capped, single pass (no loop). Use when the
  scheduler fires this skill automatically, or when the user says "/afk",
  "run afk", or "drain the inbox".
---

# /afk -- Overnight Drainer

You are the overnight worker. While the user sleeps, you take ONE small, explicitly
greenlit item and turn it into something they can refine in the morning. The
philosophy: "get something done and refine later" beats waiting for a perfect
2-hour focus block. You are deliberately conservative. Do the smallest honest
unit of work, log it, stop.

## Configuration (adapt to your setup before first use)

- `VAULT_ROOT` -- the root directory where drafts and task files are stored.
  Default: `~/vault/`
- `DRAFTS_DIR` -- where content drafts are written. Default: `~/vault/drafts/`
- `TASKS_DIR` -- where decomposed task files are written. Default: `~/vault/afk-tasks/`
- `BACKLOG_FILE` -- the backlog file to drain. Default: `~/vault/content-backlog.md`
- `DECOMPOSE_MODEL` -- the model used for the TASK decomposition step. Set to whichever
  capable model you have access to. The nightly run itself uses the default session model.
- `CAP` -- maximum items processed per run. Default: 3.

## Hard limits (do not exceed)

- **CAP = 3 items per run** (default). Even if more are ready, take only the oldest 3
  (oldest-first). Adjust CAP in your configuration, not by overriding this rule ad-hoc.
- **Opt-in only.** Touch ONLY backlog items whose `afk:` field is exactly `ready`.
  Never touch `off`, blank, `done`, or items with no `afk:` field.
- **Single pass.** Process the item(s), write, log, exit. Never loop or re-queue.
- **No publishing.** You produce a DRAFT only. Never post, email, or push anywhere.
- **No fabrication.** If an item depends on a source you cannot locate (e.g. "find
  the original series first"), produce a structured OUTLINE + a clear DEPENDENCY
  flag instead of inventing content. Say what you could not do.
- **Expensive model fires on the TASK path only.** If you have configured a more
  capable model for the TASK decompose step, use it solely for that step -- never on
  no-op nights, never on content drafts. If the configured model is unavailable,
  fall back to the default model so the item is still decomposed (never silently lost);
  the file's `decomposed_by` field records which model actually ran.

## Steps

1. **Read** `BACKLOG_FILE`.
2. **Select** items where `afk: ready`. Sort oldest-first by capture/source date.
   Take up to CAP items.
   - If none are ready: respond with EXACTLY `[NO-OP] AFK inbox empty` and stop.
3. **Classify the selected item by `type:`** to pick the path:
   - Read the item's `type:` field. `content` -> CONTENT path (step 4A).
     `task` -> TASK path (step 4B).
   - If `type:` is MISSING, infer: action verbs (check, investigate, explore,
     build, evaluate, decompose, "research spike", "set up") -> `task`;
     post / article / series / carousel / explainer -> `content`. When genuinely
     ambiguous, default to `content` (the safer, no-cost path). ALWAYS state the
     type used (and whether it was inferred) in the final output so the user can
     correct it.

4A. **CONTENT path -- expand the one-liner into a structured draft** (default model; no
   expensive model call):
   - Lead with what the reader is trying to DO / the payoff (outcome-first).
   - Provide: a working title, a one-line thesis, an ordered outline (sections with
     1-2 sentence intent each), the strongest hook, and an open-questions list.
   - Honor any constraints noted on the backlog item (audience, no-jargon, etc.).
   - If a `Dependency:` is noted on the item, do the part you CAN without it, then
     flag the blocked part explicitly under a `## Blocked on` heading.
   - **Idempotency guard (check BEFORE writing).** Search `DRAFTS_DIR` for an
     existing draft for THIS item by `source_item` front-matter. If a match
     exists, do NOT write a second file -- reuse the existing path, skip to step 5,
     and add `(already drafted)` to the output line. A backlog item maps to exactly
     ONE draft file; this stops a double-write if the item is processed twice in one pass.
   - **Write** the draft to `DRAFTS_DIR/{YYYY-MM-DD}-{slug}.md` with front matter:
     ```
     ---
     source_item: {backlog item id/title}
     created_by: afk
     created: {YYYY-MM-DD HH:MM}
     status: draft
     ---
     ```

4B. **TASK path -- decompose into atomic subtasks** (the one potentially expensive step):
   - Use your configured decompose helper or the `decompose-goal` skill, passing the
     item's full text as input. Capture the `Atomic subtasks (N):` block from the output.
   - **Fallback:** if the configured DECOMPOSE_MODEL fails (outage, timeout, or access
     issue), retry using the default session model. Record which model actually produced
     the list in the `decomposed_by` front-matter field. If BOTH attempts fail, set
     `decomposed_by: failed`.
   - **No fabrication:** only if the decompose step fails entirely do you NOT invent
     subtasks -- write the file with a `## Decompose failed` note (include the error)
     and flag it in the output line. Still mark the item `afk: done` so it does not
     silently re-fire.
   - **Idempotency guard (check BEFORE running the decompose step / writing).** Search
     `TASKS_DIR` for an existing task file for THIS item by `source_item` front-matter.
     If a match exists, do NOT decompose again or write a second file (skipping also
     avoids a needless expensive model call). Reuse the existing path, skip to step 5,
     and add `(already decomposed)` to the output line. A backlog item maps to exactly
     ONE task file.
   - **Write** to `TASKS_DIR/{YYYY-MM-DD}-{slug}.md` with front matter:
     ```
     ---
     source_item: {backlog item id/title}
     created_by: afk
     decomposed_by: {model name, or "failed"}
     created: {YYYY-MM-DD HH:MM}
     status: subtasks
     ---
     ```
     Body = the captured `Atomic subtasks (N):` block, UNEDITED, under an
     `## Atomic subtasks` heading. These are a REVIEW artifact only -- never
     auto-dispatch subtasks to downstream agents or queues. The user triages them
     manually.

   `slug` (both paths) = lowercase, hyphenated, first ~5 words of the title.

5. **Update the backlog item** in place (append-safe; do not disturb other items):
   - `afk: ready` -> `afk: done`
   - `Status: seed` -> `Status: drafting`
   - CONTENT path: add `- **Draft:** DRAFTS_DIR/{filename}`
   - TASK path: add `- **Subtasks:** TASKS_DIR/{filename}`
6. **LOG** a one-line memory entry so a morning briefing can surface it:
   - CONTENT: `afk_run:{date}: drafted "{title}" -> {filename}`
   - TASK: `afk_run:{date}: decomposed "{title}" -> {filename} ({N} subtasks via {model})`
   - no work: `afk_run:{date}: no-op`
7. **OUTPUT** one tight line summarizing the run. Examples:
   - `AFK drafted "How to Train Your AI (non-tech rewrite)" -> ~/vault/drafts/2026-06-05-how-to-train-your-ai.md. Outline ready; blocked on locating the original series.`
   - `AFK decomposed "check viability of checkpoint" (task) -> ~/vault/afk-tasks/2026-06-09-check-viability-of-checkpoint.md -- 5 subtasks. Review before dispatch.`
   - `[NO-OP] AFK inbox empty`

## Scaling note

CAP is 3 per run by default. If your capture workflow (e.g. a `/quick` inbox command)
auto-tags items `afk: ready`, supply may outpace a low-cap drain. Raise CAP only after
reviewing a few mornings at the current cap and confirming trust. Do not self-promote
past the configured cap; that is a human decision.

## Why this exists

A quick capture command is the inbox; `/afk` is the worker that drains it. Together they
let you capture an idea in seconds during the day and wake up to a refinable draft,
instead of losing the idea or waiting for focus time that never comes.
