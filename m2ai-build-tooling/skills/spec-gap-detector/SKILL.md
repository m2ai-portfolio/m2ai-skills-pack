---
name: spec-gap-detector
description: Stress-test any agent prompt or specification for ambiguity, missing constraints, and edge cases that would cause random behavior at scale.
---

# Specification Gap Detector

Takes any prompt, spec, or instruction set written for an AI agent and stress-tests it for gaps that would cause unpredictable behavior at scale.

## Trigger

Use when the user says "check this spec", "review this prompt", "stress test this", "is this spec tight enough", "spec review", or provides a prompt/instruction set and asks if it's ready for production.

## Phase 1: Intake

Accept the specification. This can be:
- A prompt or system prompt for an agent
- A SKILL.md file
- A CLAUDE.md section
- A task description for a mission/scheduled task
- Any structured instruction set

If the user points to a file, read it. If they paste it, use it directly.

## Phase 2: Gap Analysis

Analyze the spec across 7 dimensions. For each, identify specific gaps:

### 1. Ambiguous Edge Cases
- Where could two reasonable interpretations exist?
- What inputs would make the agent guess?
- Flag any "use your judgment" without bounds

### 2. Missing Success Criteria
- How does the agent know it succeeded?
- Are there measurable outputs defined?
- Is "done" clearly defined?

### 3. Unclear Hard vs. Soft Constraints
- Which rules are absolute (MUST/NEVER) vs. preferences (SHOULD/prefer)?
- Are there implicit constraints that aren't stated?
- Could the agent reasonably violate an unstated rule?

### 4. Missing Error Handling
- What should happen when the agent can't complete a step?
- Are fallback behaviors defined?
- Is escalation to human specified for uncertain cases?

### 5. Context Dependencies
- Does the spec assume context that may not be present?
- Are external dependencies (APIs, files, services) explicitly listed?
- What happens if a dependency is unavailable?

### 6. Scale Behavior
- Would this produce consistent results across 100 runs?
- Are there non-deterministic paths that should be constrained?
- Could token/context limits cause mid-task degradation?

### 7. Security & Trust Boundaries
- Can the agent access more than it needs?
- Are destructive operations gated?
- Is there PII/credential exposure risk?

## Phase 3: Scoring

Score the spec:

| Dimension | Score (1-5) | Critical Gaps |
|-----------|-------------|---------------|
| Edge Cases | X | [list] |
| Success Criteria | X | [list] |
| Constraints | X | [list] |
| Error Handling | X | [list] |
| Context Deps | X | [list] |
| Scale Behavior | X | [list] |
| Trust Boundaries | X | [list] |
| **Overall** | **X/5** | |

**Rating scale**: 1 = will break immediately, 2 = breaks at scale, 3 = works but fragile, 4 = production-ready with minor gaps, 5 = bulletproof

## Phase 4: Tightening Suggestions

For each gap scored 3 or below, provide a specific rewrite or addition:

```
GAP: [description]
RISK: [what goes wrong without this]
FIX: [exact text to add/change in the spec]
```

Limit to the top 5 most impactful fixes. Prioritize gaps that would cause the worst outcomes at scale.

## Phase 5: Output

Present the full analysis, then offer:
- "Want me to apply the fixes directly?" (if editing a file)
- "Want the tightened spec as a new file?"
- "Want just the fixes as a checklist?"

## Source

Extracted from Nate Kadlac newsletter (2026-03-26) -- "The K-Shaped AI Labor Market" -- specification precision as a core AI-native skill.
