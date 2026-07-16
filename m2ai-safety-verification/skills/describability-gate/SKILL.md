---
name: describability-gate
description: Eight-field readiness gate that blocks any automation project until inputs, outputs, decision rules, exceptions, owner, success metric, failure mode, and rollback are explicitly defined. Use before kicking off any automation build, as a pre-dispatch check, or when reviewing automation specs. Trigger on "describability gate", "automation readiness", "is this ready to automate", "can I build this now".
---

# Describability Gate

Blocks any automation project from starting until eight fields are filled. An automation that can't be fully described can't be reliably built or safely deployed. This gate prevents under-specified automations from reaching production.

## When to trigger

- User says "describability-gate", "automation readiness", "is this ready to automate", "can I build this now"
- Before kicking off any build, sprint, or agent dispatch on an automation task
- As a pre-dispatch gate on automation missions
- Reviewing an automation spec or project brief for completeness

## The Eight Required Fields

| # | Field | Definition | Common failure mode |
|---|-------|-----------|-------------------|
| 1 | **Inputs** | What data, files, events, or triggers start the automation? | Vague: "user request" — no schema, no source |
| 2 | **Outputs** | What does a successful run produce? (record written, email sent, report generated) | "Does the thing" — no artifact defined |
| 3 | **Decision rules** | When the automation hits a fork, what logic governs the choice? | "Uses judgment" — no rules specified |
| 4 | **Exceptions** | What inputs or conditions should NOT be handled automatically? | Missing — automation silently processes things it shouldn't |
| 5 | **Owner** | Named human who is accountable for this automation's ongoing correctness | Missing — nobody to page when it breaks |
| 6 | **Success metric** | How do you measure whether the automation is working correctly? | "Runs without errors" — not a business metric |
| 7 | **Failure mode** | What does a wrong output look like? How will you detect it? | Missing — silent failures ship to production |
| 8 | **Rollback** | If the automation produces bad outputs, how do you reverse them? | Missing — irreversible automations have no recovery path |

## Phase 1: Accept the automation description

Accept:
- A free-form project brief or spec
- A task description for an agent mission
- A SKILL.md or automation spec file
- A paste of the intent ("I want to automate X so that Y")

## Phase 2: Extract and score each field

For each of the eight fields, determine:
- **Filled**: The field is explicitly defined with enough specificity to act on
- **Partial**: The field is addressed but too vague to constrain the build (flag the gap)
- **Missing**: No information provided for this field

A field is Filled only if a builder could implement it without asking a follow-up question.

## Phase 3: Gate decision

| Gate result | Condition |
|-------------|-----------|
| **PASS** | All 8 fields Filled |
| **CONDITIONAL** | All 8 fields present (some Partial) — proceed only after resolving flagged gaps |
| **BLOCK** | Any field Missing |

If BLOCK: do not suggest "you can probably figure it out during the build." Missing fields are hard blockers, not soft recommendations.

## Phase 4: Output

```
## Describability Gate

**Result: PASS / CONDITIONAL / BLOCK**

| Field | Status | Notes |
|-------|--------|-------|
| Inputs | Filled / Partial / Missing | [gap if not Filled] |
| Outputs | ... | ... |
| Decision rules | ... | ... |
| Exceptions | ... | ... |
| Owner | ... | ... |
| Success metric | ... | ... |
| Failure mode | ... | ... |
| Rollback | ... | ... |

### Gaps to resolve before proceeding
[For each Partial or Missing field: one specific question to ask the project owner]

### What to do next
- **PASS**: Proceed to build. Attach this gate output to the project spec as the acceptance record.
- **CONDITIONAL**: Resolve the X gaps above, then re-run.
- **BLOCK**: Do not start the build. The gaps above will cause the automation to fail in production.
```

## Rules

- Owner must be a named individual or named role — "the team" is not an Owner
- Rollback is required for any automation that writes records, sends messages, or modifies state. Read-only automations may mark this N/A with explicit justification
- Decision rules must be machine-implementable — "use good judgment" fails this gate
- If the user says "I'll figure it out later," count that as Missing, not Partial
- Apply this gate neutrally — do not soften a BLOCK because the user seems committed to the project

## Source

Nate's Newsletter, 2026-05-17 — "Executive Briefing: Stop asking if AI can do this. Start asking what shape the work is."
The Describability Gate closes the failure mode of under-specified automations reaching production before their requirements are understood. Eight fields that must be filled before any automation build begins.
