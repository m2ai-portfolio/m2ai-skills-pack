---
name: mismatch-check
description: >
  Diagnose whether your current agent tooling matches your actual problem. Detects expensive
  architecture mismatches where you've built a solution to the wrong question. Use when
  evaluating an existing agent setup, troubleshooting why an agent isn't delivering, or
  when someone says "why isn't this working?", "is this the right approach?", or "/mismatch-check".
---

# Agent Mismatch Detector

Takes a description of your current tooling AND your actual problem, then diagnoses whether you've built an expensive solution to the wrong question.

## Common Anti-Patterns

| What You Built | What You Actually Need | Symptom |
|---|---|---|
| Orchestration framework | Coding harness | Agents pass data to each other but the real bottleneck is isolated code generation |
| Auto research loop | Dark factory | You're optimizing metrics but the real issue is spec ambiguity |
| Coding harness | Orchestration framework | Tasks keep conflicting because they actually need sequential coordination |
| Dark factory | Auto research | You wrote precise specs but there's no convergence -- you need exploratory iteration |
| Any architecture | Simpler tool | The problem doesn't need agents at all -- a script, a prompt, or a human would be faster |

## Phases

### Phase 1: Describe Current Setup
Ask the user for:
1. What tools/frameworks are you using? (e.g., "Claude Code with parallel workers", "CrewAI pipeline", "custom loop")
2. What problem are you trying to solve? (the actual goal, not the tool's purpose)
3. What's frustrating you? (the symptom that triggered this check)

### Phase 2: Classify Current Architecture
Map the described setup to one of the four architectures:
- **Coding Harness**: Isolated task execution, git worktrees, parallel code generation
- **Dark Factory**: Spec-driven autonomous builds, convergence testing, holdout scenarios
- **Auto Research**: Benchmark loops, experiment-measure-commit cycles, metric optimization
- **Orchestration Framework**: Multi-agent pipelines, handoff protocols, sequential coordination

### Phase 3: Classify Actual Problem
Analyze the stated problem and frustration against the same four categories. The frustration symptom is the strongest signal -- it reveals what the current architecture can't handle.

### Phase 4: Mismatch Diagnosis
Compare current architecture vs. actual need:

- **Match**: Architecture fits the problem. Issue is likely implementation, not architecture. Suggest specific tuning.
- **Mismatch**: Architecture doesn't fit. Explain WHY it's wrong (which governing principle is violated), what the RIGHT architecture is, and what a migration path looks like.
- **Overengineered**: The problem doesn't need agents. Suggest the simpler alternative.

### Phase 5: Output Report
```
CURRENT ARCHITECTURE: [type]
ACTUAL NEED: [type]
DIAGNOSIS: [Match | Mismatch | Overengineered]

[If mismatch]
WHY IT'S WRONG: [which governing principle is violated]
RIGHT ARCHITECTURE: [type + governing principle]
MIGRATION PATH: [2-3 concrete steps to shift]

[If overengineered]
SIMPLER ALTERNATIVE: [what to use instead]
ESTIMATED SAVINGS: [time/cost/complexity reduction]
```

## Verification
- Diagnosis is one of: Match, Mismatch, Overengineered
- If Mismatch, the violated governing principle is named explicitly
- Migration path contains actionable steps, not vague advice
- Never recommends adding complexity to fix a mismatch -- simplify first

## Source
Nate Kadlac, "There are 4 kinds of agents and you're probably using the wrong one", natesnewsletter.substack.com, 2026-03-25.
