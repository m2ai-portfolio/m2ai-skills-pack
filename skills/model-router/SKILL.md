---
name: model-router
description: Classify a task and recommend the optimal model tier (Opus/Sonnet/Haiku) based on reasoning complexity, output length, and cost sensitivity. Produces a routing decision with rationale and estimated cost delta.
---

# Model Router

Analyzes a task description and recommends which model tier to use. Prevents the common pattern of using Opus for everything (expensive) or Haiku for everything (quality loss).

## Trigger

Use when the user says "which model should I use", "model router", "route this task", "is this an Opus task", "Haiku or Sonnet for this", "model selection", or describes a task and asks about the right model tier.

## Phase 1: Task Classification

Analyze the task against these dimensions:

### Reasoning Depth
- **Low**: Formatting, cleanup, simple transforms, template filling
- **Medium**: Standard code generation, bug fixes, content writing, data extraction
- **High**: Architecture decisions, multi-step reasoning, novel algorithm design, nuanced analysis

### Output Complexity
- **Structured**: JSON, YAML, tables, lists -- predictable format
- **Creative**: Prose, explanations, design docs -- open-ended
- **Code**: Functions, classes, full files -- needs correctness

### Context Requirements
- **Minimal** (<5K tokens): Self-contained task, no project context needed
- **Moderate** (5K-50K): Some files/docs for reference
- **Heavy** (50K+): Full codebase context, long documents, multi-file analysis

### Error Tolerance
- **High**: Draft content, brainstorming, exploration -- mistakes are cheap to fix
- **Medium**: Code that will be reviewed, content with editing pass
- **Low**: Production code, client deliverables, one-shot outputs

## Phase 2: Routing Decision

Apply this decision matrix:

| Reasoning | Output | Error Tolerance | Recommended Model |
|-----------|--------|-----------------|-------------------|
| Low | Structured | Any | **Haiku** |
| Low | Creative | High | **Haiku** |
| Low | Creative | Low | **Sonnet** |
| Low | Code | Any | **Sonnet** |
| Medium | Any | High | **Sonnet** |
| Medium | Any | Medium | **Sonnet** |
| Medium | Any | Low | **Sonnet** (with review pass) |
| High | Any | High | **Sonnet** |
| High | Any | Medium | **Opus** |
| High | Any | Low | **Opus** |

### Override Rules
- If the task involves **planning or architecture**: always Opus
- If the task is **pure formatting/cleanup**: always Haiku
- If the task requires **long output** (>2K tokens) of code: Sonnet minimum
- If the user says **"make it good"** or similar quality signal: upgrade one tier
- If the user says **"quick and dirty"** or similar speed signal: downgrade one tier

## Phase 3: Cost Comparison

Show what each tier would cost for this task (estimate):

```
Task: [short description]
Estimated input:  ~XXK tokens
Estimated output: ~XXK tokens

| Model  | Input Cost | Output Cost | Total   | Quality |
|--------|-----------|-------------|---------|---------|
| Haiku  | $X.XXX    | $X.XXX      | $X.XXX  | [risk]  |
| Sonnet | $X.XXX    | $X.XXX      | $X.XXX  | [ok]    |
| Opus   | $X.XXX    | $X.XXX      | $X.XXX  | [best]  |

Recommendation: **[Model]** -- [one-line rationale]
Savings vs Opus: $X.XX per call / $X.XX per day at [N] calls
```

Use current pricing (verify via /chub before citing -- do not assume from training data).

## Phase 4: Batch Routing (Optional)

If the user describes a multi-step pipeline, route each step independently:

```
Pipeline: [name]
Step 1: [task] -> Haiku  ($X.XX/call)
Step 2: [task] -> Sonnet ($X.XX/call)
Step 3: [task] -> Opus   ($X.XX/call)
Total per run: $X.XX
vs all-Opus:   $X.XX (XX% savings)
```

## Phase 5: Agent Harness Integration (Optional)

If the user is building an agent pipeline (YCE harness, ClaudeClaw, etc.), suggest a routing function pattern matching task types to model tiers.

## Output Format

Lead with the recommendation. Show the cost table. Keep rationale to one line. Don't over-explain the obvious.

## Source Attribution

Technique derived from Nate's Newsletter (2026-04-02): "You're Loading 66,000 Tokens of Plugins Before You Even Type" -- model tier routing as a token cost optimization strategy, formalized into a decision framework.
