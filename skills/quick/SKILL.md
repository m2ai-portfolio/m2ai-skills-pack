---
name: quick
description: >
  Quick-capture a spur-of-the-moment idea or one-liner into a content backlog
  inbox file so it is not lost. By DEFAULT every capture is handed to an AFK
  overnight worker (afk: ready); opt a given item OUT by including "no afk" /
  "skip afk". Use when the user says "/quick ...", "quick capture", "jot this
  down", "add to the backlog", or fires off a half-formed idea they want parked
  for later. This is the INBOX. The /afk skill is the overnight worker that
  drains items tagged afk: ready.
---

# /quick — Idea Capture Inbox

You are capturing a fast, low-friction idea so the user can keep moving. The whole
point is speed: get it down, tag it, confirm, done. Do NOT expand, research, or
draft anything here. That is the AFK worker's job later.

## Configuration

The backlog file path is configurable. Default: `~/vault/content-backlog.md`.
Adapt to whatever inbox file is in use for this workspace.

## Input

Everything after `/quick` is the capture text. Example:
`/quick a post on why "storage isn't memory" lands for non-technical readers`

**AFK tagging — default ON:**
Every capture defaults to `afk: ready` so it flows to the overnight worker without
the user having to remember anything. Set `afk: off` ONLY when the text contains an
explicit OPT-OUT tag as a whole word (case-insensitive), most often at the end after
a separator like `;`, `,`, or `-`:
- `no afk`
- `skip afk`
- `not afk` / `afk off`
- the transposition typo `no akf`

The legacy opt-IN phrases (`afk this`, a standalone `afk`, the typo `akf`) are now
redundant but still honored -- they just confirm the default. STRIP any opt-out OR
opt-in tag (and the trailing separator + surrounding whitespace that precedes it,
e.g. `; no afk`, `- afk this`) from the saved `Text:` so the captured idea reads
cleanly. Use word boundaries -- do NOT trip on `afk` buried inside a real word. If you
are genuinely unsure whether something is an opt-out, default to `ready` (the new
default) and say so in the confirmation so the user can re-tag.

## Steps

1. **Read** the configured backlog file (default: `~/vault/content-backlog.md`).
2. **Find or create** a `## Quick capture` section. If it does not exist, append it
   to the end of the file with this header block:
   ```
   ## Quick capture

   Fast inbox from `/quick`. Each item is a seed. AFK only touches items with
   `afk: ready`. Status legend: `seed` -> `drafting` -> `published`.
   ```
3. **Append** a new item using EXACTLY this template (newest at the bottom of the section):
   ```
   ### Q-{YYYYMMDD-HHMM}. {first ~8 words of the text as a title}
   - **Captured:** {YYYY-MM-DD HH:MM} (local time)
   - **Text:** {the full capture text, with AFK opt-in/opt-out tags stripped}
   - **type:** {content | task}
   - **Pillar:** {fill ONLY if obvious from the text, else leave blank}
   - **Format:** {fill ONLY if obvious, else leave blank}
   - **Status:** seed
   - **afk:** {ready | off}
   ```
4. **Light judgment only.** If the content pillar or format (post / article / etc.)
   is obvious from the text, fill it in. If you are not sure, leave it blank. Never
   guess. **Set `type:`** -- this decides how AFK processes the item later:
   - `content` -- something to WRITE (a post, article, series, carousel, explainer).
     This is the default; when unsure, use `content` (it's the safe, no-cost path).
   - `task` -- something to DO/BUILD/INVESTIGATE (e.g. "check viability of X",
     "explore how to set up Y", "research spike", "build Z"). AFK will route these
     differently (decompose into atomic subtasks instead of drafting prose).
   Pick from the verb/intent of the capture; if it's a genuine coin-flip, use `content`.
5. **Confirm** in one short line: what you captured, the item id, the `type`, and
   the AFK state. Since AFK is default-ON, the confirmation must make clear it
   WILL be worked overnight and how to stop it. Surfacing the type lets the user
   catch a misclassification now instead of later. Example:
   `Captured Q-20260604-1432 -> "why storage isn't memory" (type: content, afk: ready). It'll be drafted overnight -- say "no afk" to skip.`
   or, for an opted-out item:
   `Captured Q-20260604-1432 -> "check viability of /checkpoint" (type: task, afk: off, opted out). Drop the "no afk" to let it run overnight.`

## Rules

- Never overwrite existing backlog items. Append only.
- Never trigger any drafting or web research from /quick. Capture only.
- Keep the confirmation to one line. This skill is about speed.
- If the capture text is empty, ask for the one-liner instead of writing a blank item.
