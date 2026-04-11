---
name: bitter-lesson-scorecard
description: Score an agent system design against the Bitter Lesson principle — how much "how" is encoded vs "what", how much bets on model improvement vs locks in current limitations. Flags procedural lock-in, hardcoded orchestration, and domain hacks. Produces a simplification roadmap. Use when designing new agent systems, reviewing agent architecture, or deciding what to simplify. Trigger on "bitter lesson", "score architecture", "agent complexity audit", "simplification roadmap", "how vs what ratio", "are we fighting the model".
---

# Bitter Lesson Scorecard for Agent Architectures

Score an agent system against the Bitter Lesson: computation and learning beat hand-engineering. Systems that encode "how" instead of "what" get worse as models improve.

## Phase 1: Intake

Ask the user to provide ONE of:
- An agent system description or architecture doc
- A codebase path (will scan for orchestration patterns)
- A CLAUDE.md or system prompt describing an agent workflow

If given a codebase path, look for: orchestration files, state machines, routing logic, prompt templates, tool definitions, multi-agent coordination code.

## Phase 2: Component Inventory

Map every architectural component into one of these categories:

| Category | Bitter Lesson Alignment | Examples |
|----------|------------------------|---------|
| **Outcome Spec** | ALIGNED — says "what" | Goal definitions, success criteria, quality thresholds |
| **Tool Interface** | ALIGNED — extends capability | API wrappers, file access, search tools |
| **Hard Constraint** | NEUTRAL — business necessity | Auth, rate limits, compliance rules, safety gates |
| **Procedural Orchestration** | MISALIGNED — encodes "how" | State machines, fixed step sequences, hardcoded agent routing |
| **Model Compensation** | MISALIGNED — bets against improvement | Chunking strategies, re-ranking, format enforcement, retry heuristics |
| **Domain Hack** | MISALIGNED — freezes current knowledge | Hardcoded few-shot examples, domain-specific parsing, manual entity extraction |

## Phase 3: Scoring

Calculate three scores (0-100):

### Alignment Score
`(outcome_specs + tool_interfaces + hard_constraints) / total_components * 100`

Higher = more aligned with the Bitter Lesson.

### Lock-In Score
`(procedural_orchestration + model_compensation + domain_hacks) / total_components * 100`

Higher = more locked into current model limitations. This is the number to REDUCE.

### Improvement Leverage
Estimate: if the underlying model improves 2x in capability, what percentage of the system becomes unnecessary?

High leverage = the system will naturally simplify with better models.
Low leverage = the system fights improvement.

## Phase 4: Scorecard Output

```
## Bitter Lesson Scorecard: [System Name]

| Metric | Score | Rating |
|--------|-------|--------|
| Alignment | XX/100 | [STRONG/MODERATE/WEAK] |
| Lock-In | XX/100 | [LOW/MODERATE/HIGH] |
| Improvement Leverage | XX% | [HIGH/MODERATE/LOW] |

## Component Breakdown
| Category | Count | % of System |
|----------|-------|-------------|
| Outcome Specs | N | X% |
| Tool Interfaces | N | X% |
| Hard Constraints | N | X% |
| Procedural Orchestration | N | X% |
| Model Compensation | N | X% |
| Domain Hacks | N | X% |

## Top Bitter Lesson Violations
1. [Component] — [Why it bets against improvement]
2. ...
3. ...

## Simplification Roadmap
### Quick wins (delete now, test)
- ...

### Medium-term (replace orchestration with outcome specs)
- ...

### Strategic (requires model capability validation)
- ...
```

## Phase 5: Recommendations

For each MISALIGNED component, suggest:
1. What it would look like as an outcome spec instead of a procedure
2. What model capability would need to exist to delete it
3. Whether that capability likely already exists in current models

## Verification

- Every component in the system must be classified (nothing skipped)
- Scores must be mathematically consistent with component counts
- Simplification roadmap must have at least one item in each tier
- Recommendations must be specific to the system, not generic advice

## Source

Nate's Newsletter (2026-04-01): The Bitter Lesson applied as a practical audit tool for agent architectures — scoring systems on "how" vs "what" encoding and producing simplification roadmaps.
