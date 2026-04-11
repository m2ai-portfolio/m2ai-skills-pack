---
name: prompt-rewriter
description: Rewrite system prompts to strip compensating complexity and produce clean outcome-based prompts. Takes audit output (from compensating-complexity-auditor or manual analysis) and produces a four-component prompt — outcome spec, constraints, tools, coordination pattern. Use when modernizing prompts after a model upgrade, simplifying over-engineered system prompts, or converting procedural instructions to outcome-based ones. Trigger on "rewrite prompt", "simplify prompt", "strip scaffolding", "outcome-based prompt", "modernize prompt".
---

# Outcome-Based Prompt Rewriter

Transform scaffolding-heavy system prompts into clean, outcome-based prompts that work with capable models.

## Phase 1: Input

Accept ONE of:
- Raw audit output from the `compensating-complexity-auditor` skill (preferred)
- A system prompt the user wants rewritten (will do a quick classification pass first)
- A file path to a system prompt or CLAUDE.md

If no audit exists, do a fast classification pass (outcome/constraint/scaffolding/duct-tape) before rewriting.

## Phase 2: Extract Essential Intent

From the classified components, extract:
1. **Outcomes** — What must the system achieve? (strip all "how")
2. **Hard constraints** — Business rules, safety, compliance, quality thresholds
3. **Available tools** — What tools/APIs/resources does the system have access to?
4. **Coordination pattern** — If multi-agent: who talks to whom, what are handoff conditions?

Discard:
- Step-by-step procedures (let the model figure out "how")
- Format micromanagement (unless format IS the business requirement)
- Retry/fallback logic for known model weaknesses
- Few-shot examples that teach capabilities the model already has

## Phase 3: Rewrite

Produce a clean prompt with exactly four sections:

```markdown
## Outcome
[What this system must achieve — measurable, specific]

## Constraints
[Hard rules that cannot be violated — business, safety, quality]

## Tools
[Available tools and when to use them — not how to use them]

## Coordination
[Multi-agent handoffs, escalation conditions — if applicable]
```

Rules for the rewrite:
- No imperative procedures ("First do X, then do Y")
- No "you are a..." role-play preambles unless they genuinely change behavior
- Constraints only include things that are NOT obvious to a capable model
- Tool descriptions say WHAT the tool does, not step-by-step usage
- Total length should be 30-60% of the original (if it's longer, you added complexity)

## Phase 4: Diff + Risk Assessment

Show a before/after comparison:
- What was kept (and why)
- What was deleted (and why)
- What was reworded (and what changed)
- **Risk items**: anything deleted that MIGHT still be needed — flag these as "test before deploying"

Output a length comparison: original line count vs. rewritten line count, with percentage reduction.

## Verification

- Rewritten prompt must be shorter than the original
- All outcome logic from the original must be preserved
- All hard constraints must be preserved
- No procedural scaffolding in the output
- Risk items explicitly flagged for testing

## Source

Nate's Newsletter (2026-04-01): Outcome-based prompt rewriting as the second step of the compensating complexity removal pipeline. Pairs with `compensating-complexity-auditor`.
