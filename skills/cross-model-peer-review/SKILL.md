---
name: cross-model-peer-review
description: Implements a cross-model peer review loop where Model A grades Model B's output on a structured rubric, catching errors that neither model's self-assessment reliably detects.
---

# Cross-Model Peer Review

Sets up a structured review loop where one model grades another's output using a defined rubric. Self-assessment by LLMs is systematically unreliable — models over- or under-sell themselves. Cross-model review catches errors that fall through single-model validation.

## Trigger

Use when the user says "peer review", "second opinion from a different model", "cross-check this output", "validate with another model", or when working on consequential outputs (financial, legal, architectural decisions) where one model's self-review is insufficient.

## Phase 1: Define the Review Target

Clarify:
1. **Output to review** — what artifact did the first model produce? (document, code, analysis, decision)
2. **Author model** — which model produced the original output?
3. **Reviewer model** — which model will do the review? (different provider preferred)
4. **Stakes** — why does this output matter? Shapes rubric weighting.

## Phase 2: Build the Rubric

Define 4–6 graded dimensions specific to the output type. Examples:

**For analytical/research outputs:**
- Factual accuracy (0–5): Are claims verifiable? Are sources cited?
- Logical coherence (0–5): Do conclusions follow from evidence?
- Completeness (0–5): Are significant omissions present?
- Calibration (0–5): Does the model hedge appropriately vs. overstate certainty?
- Internal consistency (0–5): Do sections contradict each other?

**For code outputs:**
- Correctness (0–5): Does the logic implement the spec?
- Edge case coverage (0–5): Are boundary conditions handled?
- Security (0–5): Are there injection, auth, or exposure risks?
- Maintainability (0–5): Is it readable and minimally complex?

Ask the user to confirm or adjust the rubric before proceeding.

## Phase 3: Reviewer Prompt Construction

Draft a prompt for the reviewer model. The prompt must:
- NOT reveal which model produced the original (prevents anchoring bias)
- Present the rubric as a structured scoring form
- Ask the reviewer to explain each score in 1–2 sentences
- Ask the reviewer to flag the top 1–2 actionable issues

Template:

```
You are an independent reviewer. Score the following output on each dimension 0–5 and explain each score briefly. Do not ask who wrote this — just evaluate the output itself.

RUBRIC:
[paste rubric dimensions]

OUTPUT TO REVIEW:
[paste original model output]

For each dimension:
SCORE (0-5): [score] | REASON: [1-2 sentences]

Top issues: [list 1-2 most important actionable problems, or "none" if the output is strong]
```

Present the constructed prompt to the user and confirm before proceeding.

## Phase 4: Run the Review

User submits the Phase 3 prompt to the reviewer model. Collect the scored rubric output.

## Phase 5: Delta Analysis

Compare the original model's self-assessment (if any) vs. the reviewer's scores:
- Flag dimensions where scores differ by 2+ points
- Summarize top issues from the reviewer
- Recommend whether to: accept, revise specific sections, or reject and regenerate

Output format:

```
## Cross-Model Review Result

| Dimension          | Reviewer Score | Self-Score | Delta |
|--------------------|---------------|------------|-------|
| Factual accuracy   | 4/5           | 5/5        | -1    |
| Logical coherence  | 3/5           | 4/5        | -1    |
| Completeness       | 2/5           | 4/5        | -2 ⚠  |

**Critical gaps** (from reviewer):
- [issue 1]
- [issue 2]

**Recommendation**: Accept / Revise [sections] / Reject
```

Flag any dimension with delta ≥ 2 as a high-priority gap.

## Notes

- The pattern works best when reviewer and author are from different providers — same-provider models often share systematic biases.
- Rubric design is the highest-leverage step; a vague rubric produces vague scores.
- For recurring workflows, save the rubric as a reusable template.
- Models with strong self-promotion tendencies (tend to rate themselves higher) and models that undersell themselves exist — the pattern catches both directions of bias.

## Source

Extracted from Nate Kadlac newsletter (2026-04-21) — Opus 4.7 evaluation: cross-model peer review as the only reliable error-detection pattern for consequential agentic outputs. Finding: Opus self-review scored 3.5/5; cross-model peer review scored 2.7/5 on the same output.
