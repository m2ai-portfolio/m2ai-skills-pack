---
name: book-to-skill
description: Create Claude Code skills from book/long-form prose. Reads a how-to chapter or draft, extracts the teachable procedure (SOP) from the writing, then converts that SOP into a production skill via skill-creator. The prose sibling of video-to-skill (same pipeline, text input instead of a screen recording). Use when the user says "book to skill", "chapter to skill", "extract skill from this chapter", "turn this how-to into a skill", "SOP from this writing", or wants a written procedure captured as a runnable skill.
---

# Book-to-Skill — Prose Chapter to Automated Skill Pipeline

Turn a how-to chapter or long-form draft into a fully structured Claude Code skill.
This is the prose sibling of `video-to-skill`: identical pipeline, only the front-end
extractor changes (read text instead of sending a screen recording to the Gemini video
API). Phases 3-5 and the skill shape are shared field-for-field with video-to-skill,
"one schema, not two."

## Scope

EXTRACT-THE-METHOD only: a chapter that teaches a procedure becomes a runnable skill.
Narrative, analogy, or argument chapters with no extractable procedure yield nothing
(halt with `[NO_METHOD]`). Consult-the-book (book-as-Q&A) is a separate future sibling,
explicitly OUT of scope here.

## Prerequisites

- `skill-creator` skill available (for final skill generation)
- Read access to the source text (a chapter or draft `.md` / `.txt` file you provide)
- No Gemini API key and no ffmpeg required (text in, not video)

## Phase 1: Source Preparation

1. User provides (or names) a book/chapter/draft text file (`.md`, `.txt`).
2. Read the full file. Confirm it contains a teachable PROCEDURE, not just narrative.
3. If the chapter is purely narrative/analogy with no extractable steps, output
   `[NO_METHOD]` and halt. Do not fabricate a procedure that isn't on the page.

## Phase 2: SOP Extraction from Prose

Read the chapter text and produce the most comprehensive, detailed SOP of the process
it teaches. Account for:

- Every step the author describes, in order, including setup and teardown
- Stated rules, constraints, and "always / never" guidance
- Style and quality preferences the author expresses (what they like/dislike and why)
- Decision points where the author chooses one option over another and why
- Worked examples and the reasoning behind them
- Tacit knowledge stated in passing (asides, caveats, "the trick is...")

Structure the SOP as numbered phases with sub-steps. Flag "tacit knowledge nuggets"
separately at the end. Save the extracted SOP to a working directory
(e.g., `/tmp/book-to-skill/sop-{name}.md`).

## Phase 3: SOP Review (Human-in-the-Loop)

Present the extracted SOP summary to the user. Ask:

- Does this accurately capture the procedure the chapter teaches?
- Any steps missing or misinterpreted?
- Any tacit knowledge nuggets that are wrong or need emphasis?

Incorporate feedback before proceeding.

## Phase 4: Skill Generation

Invoke the `skill-creator` skill with the reviewed SOP as input.

**Key instructions for skill-creator:**

- Use the SOP as the ground truth for the skill's phases
- Preserve all tacit knowledge as explicit rules or preferences in the skill
- Add `AskUserQuestion` checkpoints at decision points identified in the SOP (minimal HIL)
- Include source attribution in the skill frontmatter (book title, chapter, author)
- Style preferences from the SOP become hard rules in the skill, not suggestions

## Phase 5: Validation

1. Read the generated SKILL.md
2. Verify all SOP phases are represented
3. Verify tacit knowledge nuggets are encoded as rules
4. Use `claude-code-guide` agent to validate skill structure
5. Test invocation in a fresh session

## When NOT to Use This

- The chapter is narrative/analogy with no repeatable procedure (output `[NO_METHOD]`)
- The procedure is a one-off that won't be repeated
- A screen recording of the process exists and the tacit knowledge is visual — use
  `video-to-skill` instead

## Source Attribution

Prose sibling of `video-to-skill` (technique from Mark Kashef, "You've Never Made a
Claude Code Skill Like This", 2026-03-23). book-to-skill adapts the same
extract -> review -> generate -> validate pipeline to text input.
