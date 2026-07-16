---
name: multi-artifact-work-package
description: Turn a messy business situation into a full deliverable set with an explicit artifact contract — Word, PowerPoint, Excel, PDFs, press releases, FAQs — and verify each file is real (not HTML with a wrong extension). Use when a client engagement, proposal, or agent task requires multiple coordinated output formats.
---

# Multi-Artifact Work Package

Takes a business situation or client brief and produces a defined set of real deliverables with an artifact contract that specifies exactly what each file must contain. The core problem it solves: AI models frequently produce the right number of files with the right names but wrong formats — a PowerPoint that is actually HTML, a spreadsheet with no formulas, a PDF that is just a renamed text file. This skill makes the artifact contract explicit before generation begins and verifies compliance after.

## Trigger

Use when the user says "/multi-artifact-work-package", "build a deliverable package", "create a full set of client outputs", "generate artifacts for this brief", or when any task requires more than two coordinated output files in different formats.

## Phase 1: Situation Intake

Ask the user for:
1. **Business situation or brief** — free-form description of the problem, client, and goals.
2. **Audience** — who receives the deliverables (executives, board, client, internal team).
3. **Output directory** — where to write the files.

If the user provides a document or notes, read them before asking clarifying questions.

## Phase 2: Artifact Contract Definition

Before any generation, define the artifact contract explicitly. Produce a contract in this format and ask the user to confirm or edit it before proceeding:

```
ARTIFACT CONTRACT
-----------------
1. executive-summary.pptx
   Format: Real PowerPoint (python-pptx)
   Required: ≥ 5 slides, embedded chart, title + body text per slide
   Audience: C-suite

2. financial-model.xlsx
   Format: Real Excel (openpyxl)
   Required: 3 sheets, ≥ 10 formula cells, named ranges, chart on Sheet 3
   Audience: CFO / analyst

3. full-report.pdf
   Format: PDF with selectable text (reportlab or weasyprint)
   Required: ≥ 5 pages, table of contents, section headers
   Audience: Full team

4. press-release.docx
   Format: Real Word document (python-docx)
   Required: AP-style, dateline, quote block, boilerplate footer
   Audience: Media

5. faq.md
   Format: Markdown
   Required: ≥ 8 Q&A pairs
   Audience: Internal
```

**Do not begin generation until the user approves the contract.** This is the HIL gate.

## Phase 3: Generation

For each artifact in the approved contract, generate using the appropriate library:

- **PowerPoint**: Use `python-pptx`. Never write HTML and rename it. Every slide must have a `shapes.title` and `text_frame` with real content.
- **Excel**: Use `openpyxl`. Every "formula" cell must contain an `=` expression, not a hard-coded number. Include at least one chart object.
- **PDF**: Use `reportlab` or `weasyprint`. Output must start with `%PDF-` bytes. Never rename an HTML file to .pdf.
- **Word**: Use `python-docx`. Output ZIP structure must contain `word/document.xml`.
- **Markdown / plain text**: Standard file write.

After writing each file, print its path and size.

## Phase 4: Verification

After all files are written, run artifact-contract-validator checks inline:

- Open each file and verify format authenticity (magic bytes / ZIP structure).
- Verify required contents (formula count, slide count, page count).
- Produce a pass/fail line per file.

If any file fails, regenerate that specific artifact and re-verify. Do not proceed to delivery until all contract items pass.

## Phase 5: Delivery Summary

```
DELIVERY SUMMARY
================
Directory:  {path}
Generated:  {date}

Artifacts
---------
{filename}  {size}  PASS
{filename}  {size}  PASS

All {n} artifacts passed contract validation. Ready for delivery.
```

## What This Does NOT Do

- Does not validate content accuracy, legal correctness, or data sourcing.
- Does not handle deliverables requiring live data connections.
- Does not replace `/artifact-contract-validator` for post-hoc audits of externally-generated files.

## Dependencies

- `/artifact-contract-validator` — called inline in Phase 4; install first if running standalone.

## Source

Extracted from Nate Kadlac newsletter (2026-04-28): "ChatGPT 5.5 scored 87 where the next best model scored 67. Here's what that gap looks like in real work." Prompt 2 of the five-prompt kit: Multi-Artifact Work Package, including the artifact-contract verification layer.
