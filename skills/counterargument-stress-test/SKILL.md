---
name: counterargument-stress-test
description: Takes any strategic argument, business case, or thesis and systematically generates and addresses the N strongest counterarguments, forcing rigorous thinking before publishing or deciding.
---

# Counterargument Stress-Tester

Takes a position, thesis, business case, or strategic argument and pressure-tests it by generating the strongest possible counterarguments, then evaluating whether the original position survives.

## Trigger

Use when the user says "stress test this argument", "devil's advocate", "what are the counterarguments", "poke holes in this", "is this argument solid", "steelman the other side", or provides a thesis/position and asks for critical review.

## Phase 1: Intake

Accept the argument. This can be:
- A written thesis or position statement
- A business case or proposal
- A blog post draft or newsletter
- A strategic decision ("we should switch to X")
- A spec-gap-detector output that needs the strategic layer tested

If the user doesn't specify N, default to 5 counterarguments. Accept any N from 3-10.

Restate the argument back in one sentence to confirm understanding before proceeding.

## Phase 2: Generate Counterarguments

For each counterargument:

1. **State it as a steel-man.** The strongest, most charitable version of the opposing view. No straw-men.
2. **Identify the type:**
   - EMPIRICAL -- "The data doesn't support this" (cites evidence)
   - LOGICAL -- "The reasoning has a flaw" (identifies fallacy or gap)
   - CONTEXTUAL -- "This doesn't apply here" (scope/timing/audience mismatch)
   - PRACTICAL -- "This won't work in practice" (execution, cost, adoption barriers)
   - MORAL/ETHICAL -- "This shouldn't be done" (values, externalities, fairness)
3. **Rate the strength:** WEAK (easily dismissed) / MODERATE (requires a response) / STRONG (potentially fatal to the argument)
4. **Provide evidence or reasoning** for the counterargument -- don't just assert it, support it.

## Phase 3: Rebuttal Pass

For each counterargument, draft a rebuttal from the perspective of the original argument:
- Does the rebuttal hold? Rate: STRONG REBUTTAL / PARTIAL REBUTTAL / WEAK REBUTTAL
- If WEAK REBUTTAL, flag this as a genuine vulnerability in the original argument.

## Phase 4: Verdict

Produce a summary assessment:

```
## Stress Test Results

**Argument:** [one-line restatement]
**Counterarguments tested:** N
**Breakdown:** X WEAK | Y MODERATE | Z STRONG

### Vulnerabilities Found
[List any counterarguments where the rebuttal was PARTIAL or WEAK -- these are real gaps]

### Verdict
[One of:]
- ROBUST -- argument survives all major challenges
- CONDITIONALLY SOUND -- holds under stated conditions, fragile outside them
- NEEDS REVISION -- 1-2 significant gaps that should be addressed before publishing/deciding
- FATALLY FLAWED -- a STRONG counterargument with a WEAK rebuttal undermines the core thesis

### Suggested Revisions
[If NEEDS REVISION or FATALLY FLAWED: specific changes to strengthen the argument]
```

## Phase 5: Output

Present the full analysis, then offer:
- "Want me to rewrite the argument incorporating these findings?"
- "Want to go deeper on any specific counterargument?"
- "Want me to run spec-gap-detector on the revised version?"

## Verification

A good stress test:
- Has at least one MODERATE or STRONG counterargument (if all are WEAK, the test wasn't rigorous enough -- try harder)
- Steel-mans genuinely -- the counterarguments should make the user uncomfortable, not just check a box
- Rebuttals are honest -- marking a weak rebuttal as strong defeats the purpose
- The verdict matches the evidence (don't soften FATALLY FLAWED to spare feelings)

## Source

Extracted from Nate Kadlac newsletter (2026-03-29) -- "Executive Briefing: 33% of the world's helium supply just went offline" -- explicit counterargument addressing methodology as a standalone skill.
