---
name: recognizable-quality-test-generator
description: Generate an LLM-as-judge quality rubric from a workflow description and historical examples. Use when building an agent that needs verifiable success criteria — converts "I know good when I see it" into a prompt-based pass/fail test the agent can run on its own output.
---

# Recognizable Quality Test Generator

Takes a workflow and 3–5 historical examples of its output (good and bad) and produces a structured quality rubric. The rubric is formatted as an LLM-as-judge prompt so it can be embedded directly into an agent's evaluation step or used by a human reviewer.

## Trigger

Use when the user says "/recognizable-quality-test-generator", "generate a quality rubric", "create judge prompt", "define success criteria", "how do I know if the agent did this right", or when building an agent and the success criteria are undefined.

## Phase 1: Intake

Collect:
1. **Workflow description** — what the workflow does and who consumes its output.
2. **3–5 historical examples** — at least 2 good outputs and 1 bad output. If the user has no examples, offer to walk through a structured elicitation (Phase 1b).
3. **Strictness level** — how harsh should failures be scored?
   - `strict` — any criterion failure = fail
   - `weighted` — criteria have relative weights; partial credit allowed
   - `binary` — pass/fail only, no partial credit

Default: `weighted`.

### Phase 1b: Example Elicitation (if user has no examples)

Ask:
1. "Describe the last time this workflow produced output you were happy with. What made it good?"
2. "Describe a time it produced something you had to redo. What was wrong?"
3. "What's the most common mistake?" (repeat for up to 3 mistakes)

Use answers to synthesize a proxy example set before proceeding.

## Phase 2: Criterion Extraction

Analyze the examples and extract 4–8 evaluation criteria. For each criterion:

- **Name** — short label (e.g., "Completeness", "Tone match", "Data accuracy")
- **Description** — one sentence: what the criterion tests
- **Pass condition** — observable, falsifiable statement of what counts as passing
- **Fail condition** — observable, falsifiable statement of what counts as failing
- **Weight** (for `weighted` mode) — 1–3 (3 = critical, 1 = nice-to-have)

Show extracted criteria to the user before generating the rubric. Allow edits.

## Phase 3: Generate the Judge Prompt

Format the rubric as a self-contained LLM-as-judge prompt. The prompt must:

1. State the workflow context (one sentence).
2. List each criterion with pass/fail conditions.
3. Instruct the judge to evaluate the output against each criterion, assign a score (0 or 1 per criterion, or 0–1 for weighted), and return a structured verdict.
4. Include a `FINAL_VERDICT: PASS | FAIL` field.
5. Include a `CONFIDENCE: HIGH | MEDIUM | LOW` field and instructions to return LOW when the criterion is borderline.

### Output format

Provide the judge prompt in a fenced code block, ready to copy-paste:

```
WORKFLOW QUALITY JUDGE

You are evaluating the output of the following workflow:
{workflow_description}

Score the output against each criterion. Return your evaluation in the format shown.

CRITERIA
{for each criterion:}
  [{weight}] {name}: {description}
  PASS if: {pass_condition}
  FAIL if: {fail_condition}

OUTPUT TO EVALUATE
{output}

EVALUATION
{for each criterion:}
  {name}: {PASS|FAIL} — {one-sentence evidence}

SCORE: {weighted_score}/{max_score}
FINAL_VERDICT: {PASS|FAIL}
CONFIDENCE: {HIGH|MEDIUM|LOW}
NOTES: {optional — flag ambiguous cases or missing context}
```

## Phase 4: Calibration Check

Run the generated judge prompt against the user's provided examples (one call per example). Show the verdicts. If any good example fails or any bad example passes, surface the discrepancy and offer to adjust the criteria.

Do not auto-adjust — show the gap and let the user decide which criterion needs revision.

## Phase 5: Delivery

Provide:
1. The calibrated judge prompt (fenced, copy-pasteable).
2. A one-paragraph integration note: how to embed this into an agent's evaluation step (pass output → judge call → check FINAL_VERDICT → escalate if FAIL).
3. A maintenance note: "Re-calibrate this rubric when you collect 10+ new examples or the workflow changes materially."

## What This Does NOT Do

- Does not run the workflow being evaluated — only evaluates its output.
- Does not guarantee the rubric catches all failure modes — calibration is probabilistic.
- Does not replace domain expert review for high-stakes outputs (medical, legal, financial).
- Does not generate the workflow itself — use the build-spec-generator skill for that.

## Source

Extracted from Nate Kadlac newsletter (2026-04-27): "Your team spends 5 hours a week on work a sales consultant automated in an afternoon." Property 2 of Nate's 5-property framework — "you've done it by hand long enough to spot good vs bad output" — surfaces the need for an explicit quality rubric before automating. This skill operationalizes that requirement.
