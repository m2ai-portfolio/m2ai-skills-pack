---
name: workbook-doctor
description: Audits an existing or AI-generated Excel workbook for hidden risks before it is used in decisions. Runs four passes — structure map, formula risk scan, repair plan, verification memo — and produces a pass/fail checklist on formula consistency, source traceability, assumption clarity, and data freshness. Use before relying on any AI-generated spreadsheet for financial decisions, reporting, or client deliverables.
---

# Workbook Doctor

Performs a structured audit of a workbook before it drives decisions. AI tools generate clean-looking spreadsheets that frequently contain broken formula logic, hardcoded outputs masquerading as live calculations, and assumptions never labeled as such. This skill runs four diagnostic passes and produces a clear verdict: safe to use, needs repair, or do not use.

## When to Invoke

Trigger on: "workbook-doctor", "audit this spreadsheet", "check my Excel", "verify my workbook", "are my formulas right", "is this model safe to use", "QA my financial model", "check before I share this", or any time the user is about to use an AI-generated workbook for a consequential decision.

## Phase 1: Workbook Map

Before evaluating formulas, build a structural map of the workbook.

For each sheet, identify and document:

```
Sheet: [name]
Purpose: [what this sheet does]
Inputs (assumption cells): [list key variable cells and their current values]
Outputs (result cells): [list key output cells and their values]
Dependencies: [which other sheets does this sheet pull from?]
Hardcoded regions: [areas that appear to be manually entered rather than formula-driven]
```

Ask the user to paste or describe the workbook structure if direct file access is unavailable. The map does not need to be exhaustive — cover every sheet that drives a key output.

## Phase 2: Formula Risk Scan

Run each check below on the formulas and structure identified in Phase 1. For each finding, record: sheet name, cell reference (if known), finding description, and severity.

### Check 1 — Formula Consistency
- Are formulas consistent across rows in the same column, or do some rows have different formula logic?
- Are there cells in formula areas that contain plain numbers instead of formulas?
- Do SUM ranges cover all rows they should, or do some stop short?

### Check 2 — Live vs. Hardcoded Outputs
- When input assumption cells change, do output cells change accordingly?
- Are any "calculated" cells actually hardcoded constants that will never update?
- Are there cells formatted to look like formulas but containing static values?

### Check 3 — Circular References
- Are there circular dependencies between cells?
- Does the workbook rely on iterative calculation to resolve them?

### Check 4 — Reference Integrity
- Do formulas reference cells that exist, or are there broken references (#REF! errors)?
- Do cross-sheet references point to the correct sheet and range?
- Are there named ranges that have been deleted but are still referenced?

### Check 5 — Aggregation Accuracy
- Do summary totals equal the sum of their detail rows?
- Do percentages calculated from subtotals match independently calculated percentages?
- Are there rounding differences that accumulate to material discrepancies?

### Check 6 — Stale Data
- Are there hardcoded dates, prices, or rates that are unlikely to have been updated?
- Does the workbook reference external data (market rates, FX, headcount) that may be out of date?

## Phase 3: Repair Plan

For each finding from Phase 2, classify and recommend an action:

```
Finding [F01]:
  Sheet / Cell: [location]
  Issue: [description]
  Severity: must-fix / should-fix / optional
  Recommended action: [specific fix]
  Verification method: [how to confirm the fix worked]
```

**Severity definitions:**
- **Must-fix**: the workbook will produce materially wrong outputs if this is not corrected. Do not use until resolved.
- **Should-fix**: the workbook may produce correct results now but is brittle or misleading. Fix before sharing.
- **Optional**: cosmetic or low-risk. Fix at your discretion.

## Phase 4: Verification Memo

Issue a final verdict on four dimensions:

```
## Workbook Verification Memo

Workbook: [name]
Audited: [date]

### Formula Consistency
Status: PASS / FAIL / CONDITIONAL
Notes: [key findings or "formulas consistent across all reviewed ranges"]

### Source Traceability
Status: PASS / FAIL / CONDITIONAL
Notes: [key findings or "all input figures traced to identified sources"]

### Assumption Clarity
Status: PASS / FAIL / CONDITIONAL
Notes: [key findings or "assumption cells clearly labeled and separated from outputs"]

### Data Freshness
Status: PASS / FAIL / CONDITIONAL
Notes: [key findings or "all data verified current as of [date]"]

---

Overall verdict: SAFE TO USE / CONDITIONAL USE / DO NOT USE

Conditions (if CONDITIONAL): [list what must be resolved before use]
Open items (if DO NOT USE): [list must-fix items blocking use]
```

**PASS**: no issues found in this dimension.
**CONDITIONAL**: issues exist but do not block use if the stated conditions are met.
**FAIL**: issues block use of this workbook for any consequential decision.

## Verification

- [ ] All six formula risk checks run — none skipped
- [ ] Every finding has a location, not just a category
- [ ] Repair plan includes verification method for each must-fix item
- [ ] Verification memo issued with explicit overall verdict
- [ ] User informed of any must-fix items before they use the workbook

## Source

Nate Jones newsletter (2026-05-27) — "The deck got forwarded with a wrong number inside. The Trust Layer's two-model review is built to catch exactly that." The workbook doctor implements the Trust Layer Guide's Prompt Kit 1 (Workbook Doctor). Core insight: AI-generated spreadsheets look correct but frequently have hardcoded outputs that do not respond to changed assumptions — the formula risk scan is the only reliable way to catch this without running every scenario manually.
