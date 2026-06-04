---
name: spec-driven-dev-enforcer
description: Enforce a spec-first development workflow that gates code generation behind explicit specification approval. Before any code is written, forces creation of (1) a requirements doc, (2) a design doc, (3) a task decomposition. Each phase produces a reviewable artifact. Code generation only begins after specs are approved. Use when the user says "spec first", "spec driven", "write the spec before coding", "requirements first", "design doc first", "no code until spec", "enforce specs", or wants to prevent AI from jumping straight to implementation.
---

# Spec-Driven Development Enforcer

Inverts the normal AI coding flow: instead of jumping to implementation, this skill forces creation and approval of specifications before any code is generated. Each phase produces a reviewable artifact that must be explicitly approved before proceeding.

This directly addresses the "dark code" problem where AI generates code that no human ever understood at any point in its lifecycle. By requiring specs first, the human maintains comprehension of *what* is being built and *why* before the AI builds it.

## Prerequisites

- A feature request, bug fix, or implementation task described in natural language
- A human available to review and approve each phase (this is NOT auto-approve)

## Phase 1: Requirements Document

Before writing any code, produce a requirements document:

```markdown
# Requirements: <feature_name>

## Problem Statement
What problem does this solve? Who has this problem? What happens if we don't solve it?

## Success Criteria
- [ ] Criterion 1 (measurable, testable)
- [ ] Criterion 2
- [ ] Criterion 3

## Scope
### In Scope
- Specific capability 1
- Specific capability 2

### Out of Scope
- Thing we are NOT building (and why)
- Future enhancement explicitly deferred

## Constraints
- Performance: <latency, throughput requirements>
- Security: <auth, data sensitivity requirements>
- Compatibility: <existing systems this must work with>
- Dependencies: <external services, packages required>

## User Stories / Use Cases
1. As a <role>, I want <capability> so that <benefit>
2. ...

## Open Questions
- [ ] Question that must be answered before design can begin
```

**Gate**: Present the requirements doc to the user. Ask: "Does this accurately capture what you want built? Any missing requirements or wrong assumptions?" Do NOT proceed to Phase 2 until the user explicitly approves.

## Phase 2: Design Document

After requirements approval, produce a design document:

```markdown
# Design: <feature_name>

## Approach
High-level description of the solution strategy. Why this approach over alternatives?

## Alternatives Considered
| Approach | Pros | Cons | Why Not |
|----------|------|------|---------|
| Option A | ... | ... | Selected |
| Option B | ... | ... | <reason> |
| Option C | ... | ... | <reason> |

## Architecture
- Where does this fit in the existing system?
- What modules/files will be created or modified?
- Data flow diagram (text-based):

```
[Input] --> [Module A] --> [Module B] --> [Output]
                |
                v
          [Side Effect]
```

## Interface Design
- Public API / function signatures
- Input/output types
- Error cases and how they're handled

## Data Model
- New tables, columns, or data structures
- Migration strategy for existing data (if applicable)

## Testing Strategy
- Unit test coverage targets
- Integration test scenarios
- Edge cases to cover

## Rollback Plan
- How to undo this change if it breaks production
- Is the change reversible without data loss?
```

**Gate**: Present the design doc to the user. Ask: "Does this design make sense? Any concerns about the approach, interface, or testing strategy?" Do NOT proceed to Phase 3 until the user explicitly approves.

## Phase 3: Task Decomposition

After design approval, break the work into discrete, ordered tasks:

```markdown
# Task Decomposition: <feature_name>

## Tasks (in implementation order)

### Task 1: <name>
- **Files**: <files to create or modify>
- **Description**: <what this task does>
- **Dependencies**: none
- **Verification**: <how to confirm this task is done correctly>
- **Estimated complexity**: trivial / small / medium / large

### Task 2: <name>
- **Files**: <files to create or modify>
- **Description**: <what this task does>
- **Dependencies**: Task 1
- **Verification**: <how to confirm this task is done correctly>
- **Estimated complexity**: trivial / small / medium / large

...

## Implementation Order
1. Task 1 (no dependencies)
2. Task 2 (depends on Task 1)
3. Task 3 (depends on Task 1)
4. Task 4 (depends on Task 2 + 3)

## Checkpoint Plan
- After Task 2: run tests, verify <specific behavior>
- After Task 4: full integration test
```

**Gate**: Present the task decomposition to the user. Ask: "Does this breakdown look right? Any tasks missing or misordered?" Do NOT begin coding until the user explicitly approves.

## Phase 4: Implementation (Code Generation Begins)

Only after all three specs are approved:

1. Execute tasks in the decomposition order
2. After each task, verify against the task's verification criteria
3. At each checkpoint, pause and report status to the user
4. If implementation reveals a spec gap (something the design didn't account for), STOP and go back to update the relevant spec before continuing

## When to Use This Skill

- **New features**: Always. Specs prevent scope creep and ensure the human understands what's being built.
- **Bug fixes**: For non-trivial bugs. A "requirements" doc for a bug fix is: root cause analysis, fix strategy, regression test plan.
- **Refactors**: Always. Design doc is critical -- refactors without design docs are how you introduce regressions.

## When to Skip (User Override)

The user can explicitly say "skip specs, just build it" for:
- Trivial one-line fixes
- Prototype/throwaway code explicitly marked as such
- Time-critical hotfixes (but document the spec debt)

Log the skip: "Spec enforcement skipped by user request. Reason: <reason>."

## Integration with Existing Skills

- **marks-plan**: Complements planning mode -- marks-plan explores options, spec-enforcer documents the chosen option formally
- **l5-sprint**: Can replace or augment the Planner phase -- spec-enforcer produces the artifacts that the Builder consumes
- **preflight-check**: Run preflight before Phase 4 (implementation) to verify clean repo state

## Source Attribution

Extracted from Nate Kadlac's newsletter digest (2026-04-13) -- "Dark Code" essay on spec-driven development as the first layer of defense against AI-generated code no one understands. Idea #5: Workflow skill that inverts the coding flow to require specs before code.
