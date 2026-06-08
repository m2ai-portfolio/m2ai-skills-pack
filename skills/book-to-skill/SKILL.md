---
name: book-to-skill
description: Create Claude Code skills from technical books, documents, or source collections. Extracts a structured knowledge map from a book file (PDF, EPUB, DOCX, MD, HTML, RTF, MOBI) via the Gemini file processor, then converts that map into an on-demand reference skill you invoke like "/book-slug <topic>" so Claude answers from the actual chapter instead of hallucinating. Use when the user says "book to skill", "turn this book into a skill", "make a skill from this PDF", "reference skill from a doc", or wants a technical book available as an on-demand capability while they work.
---

# Book-to-Skill — Technical Book to On-Demand Reference Skill

Turn a technical book (or any document collection) into a structured Claude Code skill that
Claude loads on demand. Instead of re-reading a 400-page PDF or letting Claude hallucinate
about chapter 7, you invoke `/book-slug <topic>` and Claude reads the right section and answers
from the actual content.

This is the document sibling of `video-to-skill`: same intake → extract → review → skill-creator
pipeline, different source medium (text/book instead of screen recording).

## Prerequisites

- `file-intel` skill installed (Gemini file processor — the extraction engine)
- Gemini API key in `~/.env.shared` as `GOOGLE_API_KEY`
- `skill-creator` skill available (for final skill generation)
- The book/document file locally (PDF, EPUB, DOCX, MD, HTML, RTF, MOBI)

## Phase 1: Book Preparation

1. User provides a book/document file.
2. Identify the format. `file-intel` handles PDF, DOCX, MD, HTML, CSV, JSON, and plain text
   directly. For EPUB / MOBI / RTF, convert to PDF or Markdown first:

```bash
# EPUB/MOBI -> Markdown (requires pandoc or calibre's ebook-convert)
ebook-convert /path/to/book.epub /tmp/book-to-skill/book.md 2>/dev/null \
  || pandoc /path/to/book.epub -o /tmp/book-to-skill/book.md
```

3. For large books (over ~150 pages), do NOT extract the whole thing in one pass — it blows the
   context budget and produces shallow summaries. Split by chapter or logical section first, and
   process each chunk in Phase 2. Capture the table of contents up front so chapters map cleanly.

## Phase 2: Knowledge-Map Extraction via Gemini

Send the book (or each chapter chunk) to the Gemini file processor using the `file-intel` skill.

**Prompt to use for extraction:**

> Read this book/document and produce a structured knowledge map, NOT a summary. Account for:
> - The full chapter/section hierarchy, with a one-line "what you'd come here for" per section
> - Key concepts, definitions, and named techniques — with the exact term the book uses
> - Decision frameworks, checklists, and step-by-step procedures, preserved verbatim where they appear
> - Worked examples and the page/section they live in, so they can be retrieved later
> - Cross-references between chapters (concept introduced in X, applied in Y)
> - "Load-bearing" passages worth quoting directly vs. context that can be paraphrased
>
> Structure the output as a navigable index: for each section, give a slug, a trigger phrase
> ("invoke this section when the user asks about ..."), and the retrieval key (chapter/page).
> Flag the 3-5 highest-value sections of the whole book separately at the end.

Save the extracted knowledge map to a working directory (e.g., `/tmp/book-to-skill/map-{slug}.md`).
For chunked books, append each chapter's map into one combined index.

## Phase 3: Knowledge-Map Review (Human-in-the-Loop)

Present the extracted knowledge map to the user. Ask:

- Does the chapter/section index match the book's real structure?
- Are the highest-value sections actually the ones you'd reach for?
- Any named technique or framework mislabeled, or any retrieval key wrong?

Incorporate feedback before proceeding. Do not auto-approve — the index is the contract the
generated skill routes on, so a wrong key means a wrong answer at use time.

## Phase 4: Skill Generation

Invoke the `skill-creator` skill with the reviewed knowledge map as input.

**Key instructions for skill-creator:**

- The skill's job is RETRIEVAL, not recall: each section becomes a routable entry with its
  trigger phrase and retrieval key, so `/book-slug <topic>` resolves to "read section N, then answer".
- Preserve verbatim checklists, frameworks, and decision procedures as quoted reference, not paraphrase.
- The skill must answer ONLY from the book's content; if a topic isn't in the index, it says so
  rather than improvising (this is the whole point — no hallucination).
- Include source attribution (title, author, edition) in the skill frontmatter.
- Name the skill after the book with a short slug (e.g., `dddistilled`, `sre-workbook`).

## Phase 5: Validation

1. Read the generated SKILL.md.
2. Verify every section in the reviewed map is represented as a routable entry.
3. Spot-check 3 retrieval keys: invoke `/book-slug <topic>` and confirm it surfaces the correct section.
4. Confirm the "topic not in book" path returns an honest "not covered" rather than a guess.
5. Test invocation in a fresh session.

## Cost Management

| Book Size | Estimated Gemini Cost | Tip |
|-----------|----------------------|-----|
| Under 50 pages | < $0.05 | Send as-is |
| 50-150 pages | $0.05-0.25 | Single pass, request the index format |
| 150-400 pages | $0.25-1.00 | Chunk by chapter, one extraction call per chunk |
| Over 400 pages | $1.00+ | Chunk hard; extract only the chapters worth keeping |

## When NOT to Use This

- The content is a single short article or one-off reference (just `file-intel` it directly).
- You need the whole book's prose reproduced — that's a copyright problem, not a skill; this
  produces a navigable index + load-bearing quotes, not a redistribution of the text.
- The material changes constantly (use a live-source skill instead of a frozen book snapshot).

## Source Attribution

Concept inspired by virgiliojr94's `book-to-skill` (MIT): https://github.com/virgiliojr94/book-to-skill
Reimplemented forge-native to mirror the `video-to-skill` intake → extract → review → skill-creator
pipeline and use the in-house `file-intel` extraction engine.
