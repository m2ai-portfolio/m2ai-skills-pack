---
name: trust-score
description: Score any AI-generated document, spreadsheet, or deck on a 0–100 trust scale across five verifiable dimensions. Outputs a per-dimension scorecard and a composite score. Use as a final gate before sharing any AI-generated artifact.
---

# Trust Score

Score any AI-generated file (deck, workbook, report, or document) on a 0–100 trust scale across five verifiable dimensions. Outputs a per-dimension scorecard with composite score and distribution gate. Use this before sharing any AI-generated artifact.

## Trigger

Use when the user:
- Provides an AI-generated file (workbook, deck, report, document) and asks "is this ready to share?" or "can I trust this?"
- Says "trust score", "score this file", "/trust-score", or "check this before I send it"
- Wants a go/no-go signal before distributing an AI-generated deliverable
- Needs to track quality improvement across revisions of the same artifact
- Is building a pipeline and needs a numeric gate: "don't distribute files scoring below X"

## Phase 1: Intake

Ask the user to provide:
1. The artifact to score — paste content, share the file, or describe key elements
2. The artifact type: workbook / deck / report / document
3. Optional: intended audience and stakes (informs caveat phrasing in output)

If the user provides a file directly, accept it. If they describe it, ask enough clarifying questions to score each dimension accurately.

## Phase 2: Score each dimension

Evaluate the artifact against five dimensions, each worth 0–20 points.

**Source Traceability (0–20)**
Every significant claim, number, or assertion cites a specific source file, page, or cell reference.
- 20: All claims sourced with specific references
- 15: Most claims sourced; minor gaps in lower-stakes sections
- 10: Some claims sourced; recurring gaps in key assertions
- 5: Minimal sourcing; numbers appear without attribution
- 0: No sources cited anywhere

**Formula Integrity (0–20)** *(skip for non-quantitative documents — assign 20 by default)*
Calculations use live, consistent formulas rather than hardcoded values; no error cells.
- 20: All outputs calculated from linked inputs; consistent formulas across like rows; no errors
- 15: Minor hardcodes in low-stakes areas; no errors; formulas consistent where it matters
- 10: Some hardcoded outputs in important areas; OR formula inconsistencies across rows
- 5: Significant hardcoding; outputs do not change when inputs change
- 0: No live formulas; all outputs are static typed values

**Assumption Labeling (0–20)**
Estimates, projections, and interpretations are explicitly labeled and separated from verified facts.
- 20: All assumptions labeled; clearly distinguished from verified data
- 15: Most assumptions labeled; occasional unlabeled estimates in obvious context
- 10: Some labeling present; key assumptions blended with facts
- 5: Minimal labeling; assumptions and facts not distinguished
- 0: No assumptions labeled; everything presented as fact

**Verification Trail (0–20)**
A checks tab, review memo, evidence map, or audit log exists confirming key outputs were verified.
- 20: Full verification documented (checks tab, review memo, or evidence map)
- 15: Partial verification — high-stakes outputs confirmed, others not
- 10: Light verification — spot checks only, not systematic
- 5: Single reviewer sign-off with no documented checks
- 0: No verification documented

**Freshness (0–20)**
All data and dates are current; no stale ranges, deprecated sources, or outdated figures.
- 20: All data explicitly dated; within acceptable freshness window for the use case
- 15: Most data current; minor staleness in background sections
- 10: Some stale data in secondary sections; core figures current
- 5: Freshness unclear on key figures; dates missing from important data
- 0: No dates on data; staleness undetectable

Score conservatively: any unresolved gap in a dimension scores no higher than 15/20.

For AI-generated workbooks and decks, apply extra scrutiny to:
- **Formula Integrity** — AI commonly hardcodes outputs rather than building live calculations
- **Source Traceability** — AI commonly asserts claims with fabricated or unprovable citations

## Phase 3: Output the scorecard

```
TRUST SCORE: XX/100

DIMENSION SCORES
────────────────────────────────────────────
Source Traceability    XX/20  [PASS / PARTIAL / FAIL]
Formula Integrity      XX/20  [PASS / PARTIAL / FAIL]
Assumption Labeling    XX/20  [PASS / PARTIAL / FAIL]
Verification Trail     XX/20  [PASS / PARTIAL / FAIL]
Freshness              XX/20  [PASS / PARTIAL / FAIL]

DISTRIBUTION GATE
────────────────────────────────────────────
[SAFE TO SHARE / SHARE WITH CAVEATS / REVIEW REQUIRED / DO NOT SHARE]

  ≥ 80   SAFE TO SHARE
  60–79  SHARE WITH CAVEATS — note open items to recipient
  40–59  REVIEW REQUIRED — close named gaps before sending
   < 40  DO NOT SHARE — fundamental trust issues present

FINDINGS
────────────────────────────────────────────
[Specific issues per dimension, most impactful first.
 Be concrete: "Slide 7 claims $2.3M with no source" not "some numbers lack sources."]

NEXT STEPS
────────────────────────────────────────────
[Prioritized actions to raise the score, most impactful first]
```

PASS = 18–20, PARTIAL = 8–17, FAIL = 0–7.

## Phase 4: Advisory follow-up

If the score is below 60, recommend the specific skill most likely to raise it fastest:
- Source gaps → `/evidence-map`
- Formula problems → `/workbook-doctor`
- Global hostile review → `/pretty-but-wrong`
- Pre-submission gate → `/preflight-check`

## Related skills

- `/pretty-but-wrong` — hostile review that enumerates issues without scoring; run before this for a fuller issue list
- `/workbook-doctor` — deep audit with formula repair plan; use when formula integrity is below 10
- `/evidence-map` — traces every claim back to source data; use when source traceability is below 10
- `/preflight-check` — pre-flight checklist before any artifact ships
