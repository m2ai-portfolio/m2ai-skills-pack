---
name: knowledge-work-tests
description: Generate evaluation criteria, acceptance checks, and scoring rubrics for knowledge work outputs -- the missing "test suite" for non-code deliverables. Given a task spec (brief, memo, analysis, report, strategy doc), produce a rubric an agent can self-evaluate against before delivering. Use when defining quality gates for agent outputs, building acceptance criteria for delegated work, or reviewing knowledge work deliverables.
---

# Knowledge Work Test Suite Generator

Knowledge work has no compiler. No linter. No test runner. This skill fills that gap by generating structured evaluation criteria for any knowledge work output, so agents (and humans) can verify quality before delivery.

## Trigger

Use when the user says "test suite for this", "knowledge work tests", "how do I evaluate this output", "quality rubric", "acceptance criteria", "grade this deliverable", "define done for this task", or is about to delegate knowledge work and needs a way to verify the result.

## Phase 1: Understand the Deliverable

Collect:

1. **Task type** -- classify the output:
   - Analysis / Research (insight extraction, market research, competitive analysis)
   - Communication (email, memo, brief, proposal, pitch)
   - Strategy (plan, roadmap, decision framework, recommendation)
   - Creative (content, copy, design brief, messaging)
   - Operational (process doc, runbook, checklist, SOP)
   - Synthesis (summary, digest, briefing, executive overview)

2. **Task spec** -- what was asked for? Accept:
   - A prompt/brief the agent will receive
   - A description of the expected output
   - An example of a good output (gold standard)

3. **Audience** -- who consumes the output?
   - Executive (concise, decision-focused)
   - Technical (detailed, evidence-backed)
   - Client-facing (polished, persuasive)
   - Internal team (actionable, specific)

4. **Stakes** -- what happens if the output is wrong?
   - Low (internal note, no decisions hinge on it)
   - Medium (shared externally, influences decisions)
   - High (client deliverable, financial/strategic impact)
   - Critical (public-facing, legal/regulatory implications)

## Phase 2: Generate Structural Tests

Tests that check whether the output has the right shape, regardless of content quality:

```yaml
structural_tests:
  - name: "Completeness"
    check: "All sections/components from the spec are present"
    items:
      - "Has [required section 1]"
      - "Has [required section 2]"
      - "Has [required section N]"
    scoring: binary  # pass/fail per item, count passes

  - name: "Format compliance"
    check: "Output matches expected format and length"
    items:
      - "Length within [min]-[max] words/pages"
      - "Uses required format (bullets/prose/table/etc.)"
      - "Headers follow expected hierarchy"
      - "Citations/sources included where claimed"
    scoring: binary

  - name: "Audience alignment"
    check: "Tone, detail level, and vocabulary match the target audience"
    items:
      - "Jargon level appropriate for [audience]"
      - "Detail depth matches [audience] expectations"
      - "Actionability level matches [audience] needs"
    scoring: 1-3 scale (misaligned / acceptable / well-aligned)
```

## Phase 3: Generate Content Tests

Tests that evaluate whether the content is actually good:

```yaml
content_tests:
  - name: "Accuracy"
    check: "Claims are factually correct and verifiable"
    method: "For each factual claim, can it be traced to a source?"
    items:
      - "No unsupported assertions"
      - "Statistics/numbers are sourced"
      - "Dates and names are correct"
      - "No hallucinated references"
    scoring: count_violations  # fewer = better

  - name: "Insight depth"
    check: "Analysis goes beyond surface-level summary"
    method: "Does the output tell the reader something they didn't already know?"
    items:
      - "Contains at least [N] non-obvious insights"
      - "Connects dots across multiple sources/data points"
      - "Identifies second-order effects or implications"
      - "Addresses 'so what?' for each finding"
    scoring: 1-5 scale

  - name: "Logical coherence"
    check: "Arguments follow logically, no contradictions"
    method: "Read conclusion first, then check if the body supports it"
    items:
      - "Conclusion follows from evidence presented"
      - "No internal contradictions"
      - "Counterarguments acknowledged (if applicable)"
      - "Assumptions stated explicitly"
    scoring: 1-5 scale

  - name: "Actionability"
    check: "Reader knows what to do after reading"
    method: "Can the reader take a specific action based on this output?"
    items:
      - "Clear recommendations or next steps"
      - "Recommendations are specific (not 'consider X')"
      - "Prioritization provided when multiple actions"
      - "Dependencies or prerequisites noted"
    scoring: 1-5 scale
```

## Phase 4: Generate Stakes-Adjusted Rubric

Combine structural + content tests into a weighted rubric based on stakes level:

### Low Stakes
```
Pass threshold: 60%
Weight: Structural 60%, Content 40%
Auto-pass eligible: Yes (agent self-evaluates, no human review)
```

### Medium Stakes
```
Pass threshold: 70%
Weight: Structural 40%, Content 60%
Auto-pass eligible: Structural only; content needs human spot-check
```

### High Stakes
```
Pass threshold: 80%
Weight: Structural 30%, Content 70%
Auto-pass eligible: No; human reviews full output against rubric
```

### Critical Stakes
```
Pass threshold: 90%
Weight: Structural 20%, Content 80%
Auto-pass eligible: No; two reviewers, one domain expert
```

## Phase 5: Output the Test Suite

Deliver in two formats:

### Format 1: Agent-Executable Checklist

For the agent to self-evaluate before delivery:

```
Knowledge Work Test Suite: [Task Name]
=======================================
Stakes: [level] | Pass threshold: [X]%

STRUCTURAL TESTS (weight: [X]%)
[ ] Completeness: [items...]
[ ] Format: [items...]
[ ] Audience: [items...]
Structural score: __/__ ([X]%)

CONTENT TESTS (weight: [X]%)
[ ] Accuracy: [items...]
[ ] Insight depth: [items...]
[ ] Coherence: [items...]
[ ] Actionability: [items...]
Content score: __/__ ([X]%)

COMPOSITE SCORE: __% (threshold: [X]%)
VERDICT: [PASS / FAIL / NEEDS REVIEW]
```

### Format 2: Human Review Guide

For the human reviewer (when stakes require it):

```
Review Guide: [Task Name]
=========================
Time estimate: [X] minutes
Focus areas: [top 3 things to check]

Quick rejection criteria (check first):
- [ ] Missing required sections -> REJECT
- [ ] Wrong audience/tone -> REJECT
- [ ] Factual errors in first paragraph -> REJECT

Deep review (if quick checks pass):
1. [Most important content test for this task type]
2. [Second most important]
3. [Third most important]

Approval: Sign off with score and any caveats
```

## Phase 6: Generate Improvement Prompt

If the output fails the test suite, generate a specific revision prompt:

```
Revision needed: [Task Name]
Score: [X]% (threshold: [Y]%)

Failed tests:
1. [Test name]: [specific failure description]
   Fix: [concrete instruction]

2. [Test name]: [specific failure description]
   Fix: [concrete instruction]

Retain: [what was good and should not change]
```

This prompt can be fed directly back to the agent for revision.

## Verification

The test suite is valid if:
1. Every test has specific, observable criteria (no "is it good?")
2. Scoring method is defined for every test (binary, scale, or count)
3. Pass threshold is calibrated to stakes level
4. The test suite itself could be executed by someone unfamiliar with the task
5. Revision prompts are specific enough to produce improvement on first retry

## Source Attribution

Technique derived from Nate's Newsletter (2026-04-04): "I Tested Cowork, Lindy, Sauna, and Opal Against 3 Questions" -- the thesis that knowledge work's core problem is the absence of automated verification loops (compilers, linters, test runners) that make coding agents reliable. This skill provides the missing test infrastructure.
