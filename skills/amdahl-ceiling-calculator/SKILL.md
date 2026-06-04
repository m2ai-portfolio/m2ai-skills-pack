---
name: amdahl-ceiling-calculator
description: Map a workflow's time allocation between AI-accelerable and non-accelerable steps, calculate the theoretical maximum speedup via Amdahl's Law, and identify which tool-layer bottleneck to fix first. Use when the user says "amdahl ceiling", "workflow bottleneck", "max speedup", "where's my ceiling", "why isn't AI faster", "calculate speedup", or wants to understand why their AI-augmented workflow isn't as fast as expected.
---

# Amdahl Ceiling Calculator

Calculate the theoretical maximum AI speedup for any workflow by decomposing it into accelerable vs. non-accelerable steps. Identifies the single highest-ROI bottleneck to fix.

## Source

Nate's Newsletter, 2026-04-16: "You're Spending Six Figures on AI Models. The Bottleneck Is a 4-Minute CI Pipeline."

## Trigger

Use when the user asks about workflow speedup limits, AI bottlenecks, pipeline optimization priorities, or why their AI-augmented process isn't faster.

## Phase 1: Workflow Decomposition

Ask the user for their workflow. Accept either:
- **Free-text description**: "I write code, run tests, wait for CI, then deploy"
- **Structured list**: step names with approximate durations

If the user provides a free-text description, decompose it into discrete steps. For each step, estimate or ask:

| Step | Duration (est.) | AI-Accelerable? | Current AI Speedup |
|------|----------------|-----------------|-------------------|
| Step name | Xm | Yes/No/Partial | 1x (none) / Nx |

Categories for non-accelerable time:
- **Compile/Build**: compilation, bundling, asset processing
- **Test Execution**: test runner startup, fixture setup, actual test runtime
- **CI/CD Pipeline**: queue wait, pipeline stages, deployment
- **API Latency**: external API calls, auth handshakes, pagination
- **Human Review**: PR review, approval gates, manual QA
- **Environment Setup**: container spin-up, dependency install, cache warming

## Phase 2: Amdahl Calculation

Apply Amdahl's Law:

```
S_max = 1 / ((1 - P) + P/N)

Where:
  P = fraction of workflow that IS accelerable
  N = speedup factor for the accelerable portion
  S_max = maximum overall speedup
```

Calculate three scenarios:
1. **Current state**: actual speedup with current AI tooling
2. **Perfect AI**: N = infinity (model thinking is instant) -- shows the hard ceiling
3. **Realistic target**: N = 10x on accelerable portions

Present as:

```
Workflow: [name]
Total baseline time: Xm

Accelerable fraction (P): X%
Non-accelerable fraction: X%

Current speedup:     X.Xx  (from Xm to Xm)
Perfect AI ceiling:  X.Xx  (from Xm to Xm)  <-- HARD LIMIT
Realistic target:    X.Xx  (from Xm to Xm)
```

## Phase 3: Bottleneck Ranking

Rank the non-accelerable steps by impact. For each:

```
#1 BOTTLENECK: [Step name]
   Time: Xm (X% of total)
   Category: [CI/API/Build/etc.]
   If eliminated: ceiling moves from X.Xx to X.Xx (+X%)
   Fix complexity: [Weekend / Sprint / Quarter]
   Suggested fix: [specific recommendation]
```

Sort by "ceiling improvement if eliminated" descending. This tells the user exactly where to invest.

## Phase 4: Recommendations

Based on the bottleneck ranking, produce 3 concrete recommendations:

1. **Quick win** (weekend): the easiest bottleneck to eliminate
2. **Highest impact** (sprint): the bottleneck that moves the ceiling the most
3. **Strategic** (quarter): the infrastructure change that unlocks the next tier

For each recommendation, cite the specific Amdahl ceiling improvement.

## Verification

- Total step durations should sum to roughly the user's stated workflow time
- P + (1-P) = 1 (sanity check)
- S_max with perfect AI should always be >= current speedup
- Bottleneck ranking should be sorted by ceiling impact, not raw duration

## Output Format

Single report with all four phases. Keep it tight -- the user wants numbers, not prose. Use the table and formula formats above.
