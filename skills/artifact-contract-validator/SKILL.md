---
name: artifact-contract-validator
description: Validate a directory of claimed deliverables for file-type authenticity, formula presence in spreadsheets, embedded media in presentations, and PDF metadata sanity. Catches AI-generated fakes (HTML renamed as .pptx, empty spreadsheet cells passed off as data). Use before shipping any AI-generated deliverable set to a client or reviewer.
---

# Artifact Contract Validator

Runs per-format integrity checks on a directory of deliverables and produces a pass/fail report per file. The core problem it solves: AI models frequently produce files in the wrong format while giving them the correct extension — a "PowerPoint" that is actually an HTML file, a "spreadsheet" with no formulas, a "PDF" with no embedded text. This skill catches those failures before they reach a human reviewer.

## Trigger

Use when the user says "/artifact-contract-validator", "validate my deliverables", "check these files are real", "run artifact checks", "verify output formats", or after any AI-generated multi-artifact task completes.

## Phase 1: Intake

Ask the user for:
1. **Deliverable directory** — path to the folder containing the output files.
2. **Expected artifact contract** (optional) — a list of expected files and their types. If not provided, infer from the directory contents.

Example contract:
```
quarterly-report.pptx   → PowerPoint with embedded images
financial-model.xlsx     → Excel with at least one formula
exec-summary.pdf         → PDF with selectable text (not a scan)
press-release.docx       → Word document with tracked changes off
```

## Phase 2: Per-Format Validation

Run the following checks for each file type found in the directory. Use Python's standard library (`zipfile`, `struct`) or lightweight tools; do not install external packages without asking.

### .pptx / .pptx-like files
- Open as ZIP. A valid .pptx contains `ppt/presentation.xml`.
- Check `ppt/slides/` directory exists and has at least one slide.
- Check `ppt/media/` for embedded images if the contract specifies "with embedded images."
- **Fail signal**: ZIP opens but lacks `ppt/` tree → HTML or other format with .pptx extension.

### .xlsx / .xls files
- Open as ZIP. A valid .xlsx contains `xl/workbook.xml`.
- Check `xl/sharedStrings.xml` for non-empty string content.
- Search `xl/worksheets/sheet*.xml` for `<f>` tags (formula cells).
- **Fail signal**: No `<f>` tags → spreadsheet has no formulas despite claiming to be a financial model.

### .pdf files
- Read first 4 bytes: must be `%PDF`.
- Scan for `/Font` entries (presence indicates selectable text, not a scanned image-only PDF).
- Check file size > 10 KB (near-empty PDFs are suspicious).
- **Fail signal**: Starts with `<html` or `<!DOCTYPE` → HTML renamed to .pdf.

### .docx files
- Open as ZIP. A valid .docx contains `word/document.xml`.
- Check `word/document.xml` has non-trivial content (> 500 bytes).
- **Fail signal**: ZIP lacks `word/` tree → not a real Word document.

### Other / unknown extensions
- Report file size and MIME type detected from magic bytes.
- Flag if extension and detected type mismatch.

## Phase 3: Report

Produce a structured report:

```
=================================================================
ARTIFACT CONTRACT VALIDATION REPORT
=================================================================
Directory:   {path}
Validated:   {date}
Files:       {count}

Results
-------
{filename}          {PASS | FAIL | WARN}
  {failure reason if applicable}

{filename}          PASS

Summary
-------
Passed:    {n}
Failed:    {n}
Warnings:  {n}

{If failures}: The following files did not pass authenticity checks
and should be regenerated before delivery:
  - {filename}: {specific issue}
=================================================================
```

## Phase 4: Remediation Guidance

For each failed file, provide the specific regeneration instruction:

- **HTML-as-PPTX**: "Re-run the generation prompt with an explicit instruction: 'Output a real .pptx file using python-pptx, not an HTML file.'"
- **No-formula spreadsheet**: "Re-run with: 'Use openpyxl to write real Excel formulas in column C. Do not hard-code values — use =SUM() and cell references.'"
- **Scan-only PDF**: "Re-run with: 'Generate the PDF using reportlab or weasyprint to produce selectable text, not a screenshot.'"

## What This Does NOT Do

- Does not validate the *content* of files — only format authenticity.
- Does not check for copyright or data accuracy.
- Does not execute or render files — all checks are structural/byte-level.
- Does not require external packages to be pre-installed — it generates inline Python to perform the checks.

## Source

Extracted from Nate Kadlac newsletter (2026-04-28): "ChatGPT 5.5 scored 87 where the next best model scored 67. Here's what that gap looks like in real work." The Multi-Artifact Work Package template (Nate's Prompt 2) includes a verification layer that confirms artifacts are real files in real formats — this skill operationalizes that verification layer as a standalone, reusable validator.
