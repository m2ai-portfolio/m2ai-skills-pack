---
name: institutional-taste-encoder
description: Formalize implicit quality judgments, style preferences, and "taste" into structured constraint specifications that agents can follow. Turns the unwritten rules in someone's head into grep-able, enforceable constraints. Use when the user says "encode my taste", "formalize quality rules", "taste encoder", "write my style constraints", "capture my preferences", "turn my judgment into rules", or wants to create a taste profile, style guide, or quality spec that agents can reference.
---

# Institutional Taste Encoder

Extract implicit quality judgments from a human's head and formalize them into structured constraint specifications that agents can follow. The hardest and highest-value skill in the agent stack: encoded judgment is a moat.

## Source

Nate's Newsletter, 2026-04-16: "Encoded judgment is a moat." This is the practical implementation of that thesis.

## Trigger

Use when the user wants to formalize quality standards, capture style preferences, create taste profiles, or build constraint specs for agents.

## Prerequisites

- User must be available for an interactive interview (this is not a batch process)
- Target domain must be identified: code style, writing style, design decisions, business rules, etc.
- Output format: structured YAML/markdown constraints file

## Phase 1: Domain Scoping

Identify what domain of taste to encode:

| Domain | Examples |
|--------|----------|
| **Code** | Naming conventions, architecture preferences, anti-patterns, complexity thresholds |
| **Writing** | Tone, structure, word choices, formatting rules, audience assumptions |
| **Design** | Visual hierarchy, spacing rules, color usage, component patterns |
| **Business** | Decision criteria, risk tolerance, communication style, priority frameworks |
| **Operations** | Deployment standards, monitoring thresholds, incident response style |

Ask: "What domain are we encoding taste for?"

Then ask: "Think of the last 3 times you rejected or significantly revised something in this domain. What was wrong with the original?"

## Phase 2: Structured Elicitation

Run a systematic interview using these probe types:

### Probe Type 1: Exemplar Pairs
Show or ask for examples of "good" vs. "bad" output. For each pair:
- What makes the good one good?
- What specifically is wrong with the bad one?
- Is this a hard rule or a preference?

### Probe Type 2: Boundary Cases
Present edge cases and ask for judgments:
- "Would you accept X?"
- "What about Y -- same rule or different?"
- "Where's the line between acceptable and not?"

### Probe Type 3: Priority Stack
When rules conflict:
- "If you had to choose between [Rule A] and [Rule B], which wins?"
- "What's the top 3 things you'd check first?"

### Probe Type 4: Anti-Pattern Catalog
- "What makes you immediately reject something?"
- "What's the most common mistake you see?"
- "What do you wish agents would stop doing?"

Capture each response as a candidate constraint.

## Phase 3: Constraint Formalization

Convert interview responses into structured constraints. Each constraint follows this schema:

```yaml
- id: DOMAIN-NNN
  rule: "Clear, imperative statement of the constraint"
  severity: hard | soft | preference
  # hard = violation is always wrong
  # soft = violation needs justification
  # preference = follow unless there's a reason not to
  examples:
    good: "Example of correct behavior"
    bad: "Example of violation"
  rationale: "Why this rule exists (from the user's words)"
  detection: "How to check for violations (grep pattern, lint rule, or review checklist item)"
  conflicts_with: []  # IDs of rules this might conflict with
  priority: 1-10  # relative to other rules in this domain
```

## Phase 4: Conflict Resolution

Review the constraint set for:
1. **Contradictions**: two rules that can't both be true
2. **Ambiguity**: rules that different people would interpret differently
3. **Over-specification**: rules so narrow they'll break on edge cases
4. **Under-specification**: rules so vague they're unenforceable

For each issue found, present it to the user and ask for a resolution. Update the constraint.

## Phase 5: Output Generation

Produce two artifacts:

### Artifact 1: Taste Profile (for agents)
A structured file (`taste-profile-DOMAIN.yaml` or appended to existing `taste-profile.md`) containing:
- Domain identifier
- All constraints in the schema above
- Priority-ordered summary (top 5 rules)
- Conflict resolution notes

### Artifact 2: Verification Checklist (for humans)
A markdown checklist that a human reviewer can use to verify agent output matches the encoded taste:
- [ ] Check 1: [derived from highest-priority constraint]
- [ ] Check 2: [derived from second-priority constraint]
- ...

## Phase 6: Validation Loop

Test the encoded taste by having the user evaluate 2-3 hypothetical outputs against the new constraints:
1. Present a scenario: "An agent produced X. According to the taste profile, is this acceptable?"
2. Check if the constraint set correctly predicts the user's judgment
3. If mismatch: refine the constraints and re-test

Iterate until the user confirms: "Yes, if an agent followed these rules, I'd accept its output."

## Verification

- Every constraint has at least one good and one bad example
- No unresolved contradictions in the constraint set
- Detection method specified for every hard rule (soft rules may be judgment-based)
- User has validated the constraint set against at least 2 test cases
- Output file is in a format that can be referenced by agents (YAML or markdown, not prose)

## Output Format

Write the taste profile to the user's preferred location. Default: `~/.claude/taste-profile-{domain}.yaml` for Claude Code, or project-level for project-specific taste.

If a `taste-profile.md` already exists, ask whether to merge or create a separate domain file.
