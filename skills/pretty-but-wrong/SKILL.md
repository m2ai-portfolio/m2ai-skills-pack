---
name: pretty-but-wrong
description: Final hostile-reviewer pass on any AI-generated document, deck, or workbook before sharing. Scans for unsourced claims, undated numbers, untraceable charts, inconsistent formulas, and logic gaps. Outputs a ranked must-fix/should-fix/polish issue list — never rewrites. Use before sharing any AI-generated deliverable with a decision-maker.
---

# Pretty-But-Wrong Detector

Runs a structured hostile review on any AI-generated file before it ships. The core problem: AI tools produce polished-looking output that can contain unsourced claims, stale numbers, broken formulas, and logic gaps invisible to the naked eye. This skill plays adversary to catch those problems before the file reaches someone who will act on it.

The reviewer's job is enumeration only. It lists problems; it does not fix them. This constraint matters — a reviewer that also fixes can obscure what it changed and introduce new errors.

## When to Invoke

Trigger on: "pretty-but-wrong", "check this before I share", "hostile review", "fact-check my deck", "review this report", "pre-share gate", "final pass before sending", "is this file safe to share", "QA this document", or any time the user is about to distribute an AI-generated file to a decision-maker.

## Phase 1: Identify the Artifact

Ask the user for:
1. **File type** — deck, workbook, report, proposal, or other document
2. **Audience** — who will receive it and what decisions they will make with it
3. **Highest-risk content** — where are the numbers, claims, or recommendations that will drive action?

Use this to weight the review. A board presentation with financial projections gets a stricter pass than an internal draft.

## Phase 2: Run the Hostile Review

Review the artifact for all of the following. Flag every instance found — do not skip categories because the document looks clean.

### Unsourced Claims
- Statements presented as facts with no source, citation, or attribution
- Statistics without a date or origin
- Market size, growth rate, or benchmark numbers floating without provenance
- Competitive claims ("market leader", "fastest", "most adopted") with no evidence

### Undated Numbers
- Any numerical figure without a date or time range attached
- Percentages or ratios that could have changed since the source data was collected
- "Current" or "latest" figures without a timestamp

### Untraceable Charts
- Charts or graphs where the underlying data cannot be located or reconstructed
- Axes without units or scale labels
- Visualizations that contradict the text they accompany

### Formula and Calculation Risks (workbooks and financial sections)
- Formulas that do not change when input assumptions change (outputs that are secretly hardcoded)
- Hardcoded numbers embedded inside formula cells
- Totals that do not match the sum of their visible components
- Formulas copied inconsistently across rows (e.g., absolute reference that should be relative)
- Circular references

### Assumptions Presented as Facts
- Estimates or projections stated without the word "estimated", "projected", or "assumed"
- Single-point forecasts with no range or confidence interval
- Scenarios labeled as outcomes

### Stale Data
- Figures from prior fiscal years presented as current without a note
- Industry benchmarks from reports more than two years old
- Headcount, pricing, or competitive data that changes frequently

### Brand and Format Drift
- Inconsistent terminology for the same concept across slides or sections
- Numbers formatted differently in different places (e.g., "$1M" vs "1,000,000")
- Unnamed or differently-named entities that appear to refer to the same thing

### Logic Gaps
- Conclusions that do not follow from the evidence presented
- Missing steps between data and recommendation
- Claims that contradict each other across sections

## Phase 3: Output the Issue List

Format the findings as a ranked list. Each issue gets:
- **Category** (from Phase 2)
- **Location** (slide number, section name, cell reference, or page)
- **Issue** (one sentence describing the specific problem)
- **Severity** (must-fix / should-fix / polish)

```
## Pretty-But-Wrong Review

Artifact: [name]
Audience: [who]
Review date: [date]

---

### Must-Fix (blocks distribution)

1. [Category] | [Location] | [Issue]
2. ...

### Should-Fix (damages credibility if left in)

1. [Category] | [Location] | [Issue]
2. ...

### Polish (low stakes but worth catching)

1. [Category] | [Location] | [Issue]
2. ...

---

**Summary**: [N] must-fix, [N] should-fix, [N] polish. [One sentence overall assessment.]
```

Do not attempt to fix any issue. The output is a list for the author to act on.

## Phase 4: Disposition

Once the user has reviewed the issue list:
- If **must-fix items remain**: the file is not safe to distribute. Hold.
- If **only should-fix and polish remain**: user may distribute at their discretion. Surface the risk.
- If **no issues found**: confirm the artifact passed and note any categories that were not applicable (e.g., no formulas in a text-only report).

## Verification

- [ ] All eight review categories checked — none skipped because "it looks fine"
- [ ] Every flagged issue has a specific location, not just a vague description
- [ ] No fixes attempted — the output is enumeration only
- [ ] Severity ratings applied consistently: must-fix blocks distribution, should-fix is advisory
- [ ] Summary count matches the detailed list

## Source

Nate Jones newsletter (2026-05-27) — "The deck got forwarded with a wrong number inside. The Trust Layer's two-model review is built to catch exactly that." The hostile-reviewer pattern is the final gate in the Trust Layer workflow before any AI-generated Office file ships. Core insight: AI tools optimize for appearance; a dedicated adversarial pass is required to catch correctness failures that are invisible to the author.
