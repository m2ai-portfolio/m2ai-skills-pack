---
name: failure-postmortem
description: Guide a structured AI system failure post-mortem using 6 named failure patterns, producing a publishable incident report.
---

# Failure Post-Mortem Builder

Build a structured post-mortem for an AI system failure. Walks through diagnosis using 6 named failure patterns and produces a publishable incident report.

## Trigger

Use when the user says "post-mortem", "failure analysis", "what went wrong with the agent", "debug this failure", or describes an AI system that produced bad output.

## Phase 1: Incident Capture

Ask the user for:
1. **What happened** -- the observed bad behavior or output
2. **What was expected** -- the correct behavior
3. **System context** -- which agent/model/pipeline, what inputs triggered it
4. **Impact** -- who was affected, what was the blast radius

Keep questions tight. One round of clarification max.

## Phase 2: Failure Pattern Classification

Classify the failure against these 6 patterns (multiple can apply):

| Pattern | Description | Diagnostic Signal |
|---------|-------------|-------------------|
| **Context Degradation** | Agent lost track of critical context mid-task due to window limits, compaction, or prompt structure | Output quality dropped partway through; early steps were fine |
| **Specification Drift** | The spec/prompt was ambiguous or incomplete; agent filled gaps with assumptions | Agent did something "reasonable" but wrong; spec didn't define the edge case |
| **Sycophantic Confirmation** | Agent agreed with flawed premises or user errors instead of pushing back | User provided wrong info; agent incorporated it without challenge |
| **Tool Selection Error** | Agent chose the wrong tool, wrong API, or wrong approach for the task | Right intent, wrong execution method; tool existed but wasn't selected |
| **Cascade Failure** | One error propagated through multiple steps, each compounding the damage | Small initial mistake; large final deviation; intermediate steps didn't catch it |
| **Silent Failure** | Agent completed without errors but output was wrong; no signal that anything failed | "Success" with bad results; no errors, no warnings, no escalation |

For each matching pattern, explain:
- Why this pattern fits
- Which specific moment in the execution triggered it
- What guardrail was missing

## Phase 3: Root Cause

Identify the deepest cause. Use the "5 Whys" technique:
1. Why did the failure occur? -> [pattern-level answer]
2. Why was that possible? -> [missing guardrail / spec gap]
3. Why was that guardrail missing? -> [process / design gap]
4. Continue until you hit a systemic cause
5. State the root cause in one sentence

## Phase 4: Post-Mortem Report

Generate a structured report:

```markdown
# AI Failure Post-Mortem: [Short Title]

**Date**: [date]
**System**: [agent/pipeline name]
**Severity**: [LOW / MEDIUM / HIGH / CRITICAL]
**Status**: [investigating / mitigated / resolved]

## Incident Summary
[2-3 sentences: what happened, what was expected, what was the impact]

## Timeline
- [timestamp/step] -- [what happened]
- ...

## Failure Patterns Identified
### [Pattern Name]
[explanation, evidence, missing guardrail]

## Root Cause
[one-sentence root cause from 5 Whys]

## Corrective Actions
| Action | Type | Priority | Owner |
|--------|------|----------|-------|
| [specific fix] | [prevent / detect / mitigate] | [P0-P3] | [who] |

## Lessons Learned
- [insight that applies beyond this specific incident]
```

## Phase 5: Verification

- Confirm the report captures the user's understanding of what happened
- Ask if any corrective actions should be implemented now
- Offer to save the report to the vault or a project directory

## Source

Extracted from Nate Kadlac newsletter (2026-03-26) -- "The K-Shaped AI Labor Market" -- failure pattern taxonomy for AI system quality judgment.
