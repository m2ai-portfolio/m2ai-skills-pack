---
name: compensating-complexity-auditor
description: Audit system prompts and agent pipelines for compensating complexity — scaffolding, procedural hacks, and duct tape built around previous model limitations that should be tested for deletion before a model upgrade. Use when upgrading models, reviewing system prompts, or preparing for model migration. Trigger on "audit prompt", "compensating complexity", "model upgrade prep", "prompt scaffolding", "what can I delete".
---

# Compensating Complexity Auditor

Analyze a system prompt or agent pipeline configuration line by line. Categorize every component and recommend deletion tests.

## Phase 1: Intake

Ask the user to provide ONE of:
- A system prompt (paste or file path)
- A pipeline/agent configuration
- A CLAUDE.md or similar instruction file

If the user says "audit this project", read the project's CLAUDE.md and any system prompts found in the codebase.

## Phase 2: Line-by-Line Classification

Walk through every instruction, constraint, or configuration block. Classify each as:

| Category | Definition | Action |
|----------|-----------|--------|
| **Outcome Logic** | Defines WHAT the system should achieve | KEEP — this is the core |
| **Constraint** | Business rule, compliance, safety, or quality gate | KEEP — these survive any model |
| **Scaffolding** | Step-by-step procedures that encode HOW to do something the model can figure out | TEST FOR DELETION |
| **Duct Tape** | Workarounds for specific model failures (hallucination patches, format hacks, retry logic for known weaknesses) | TEST FOR DELETION |
| **Coordination** | Multi-agent routing, handoff logic, tool selection rules | EVALUATE — some may be scaffolding |

Output a table with: line/section reference, classification, confidence (high/medium/low), and rationale.

## Phase 3: Deletion Test Plan

For every SCAFFOLDING and DUCT TAPE item:
1. State what the item compensates for
2. Propose a deletion test: remove it, run against the target model, measure specific output quality
3. Rate deletion risk: LOW (safe to try), MEDIUM (test carefully), HIGH (has downstream dependencies)
4. Suggest what to REPLACE it with (often: nothing — just the outcome spec)

## Phase 4: Summary Report

Output a structured report:

```
## Audit Summary
- Total components analyzed: N
- Outcome Logic: N (keep)
- Constraints: N (keep)
- Scaffolding: N (test for deletion)
- Duct Tape: N (test for deletion)
- Coordination: N (evaluate)

## Complexity Ratio
- Essential complexity: X% (outcome + constraints)
- Compensating complexity: Y% (scaffolding + duct tape)

## Top 3 Quick Wins (30-min deletion tests)
1. ...
2. ...
3. ...

## Deletion Test Backlog (prioritized)
...
```

## Verification

- Every component in the input must appear in the classification table (no items skipped)
- Classifications must include rationale, not just labels
- Deletion tests must be specific and measurable, not generic "test it"
- Quick wins must be genuinely achievable in 30 minutes

## Source

Nate's Newsletter (2026-04-01): "Every workaround you built for the last model is now breaking the next one" — compensating complexity framework for model step-changes.
