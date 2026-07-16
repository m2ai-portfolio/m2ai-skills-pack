---
name: action-outcome-postmortem
description: Structured post-mortem for the failure mode where an agent executed the correct mechanical action but produced the wrong outcome — the action succeeded, the goal failed. Walks through what semantic context was missing, where to add it, and how to prevent recurrence. Use when an agent did exactly what it was told but the result was wrong, or the user says "/action-outcome-postmortem", "right action wrong result", "agent succeeded but outcome was bad", "mechanical success semantic failure".
---

# Action-Outcome Post-Mortem

Diagnose failures where the agent did the right thing mechanically but the wrong thing semantically. The action completed without error. The outcome was still wrong.

This is distinct from generic failure post-mortems. The failure mode here is not a bug, a crash, or a bad tool choice. It is a missing semantic layer: the agent lacked the context to understand what its action *meant*.

## Trigger

Use when:
- The agent completed its task without errors but the real-world result was wrong or harmful
- Something was moved/deleted/sent/committed/scheduled correctly but should not have been
- The agent had no way to know the action was a bad idea given the broader context
- User says "it did exactly what I asked but that was the wrong thing to do"

## Phase 1: Incident Capture

Ask for:
1. **What action did the agent take?** (the mechanical step that completed successfully)
2. **What was the expected outcome?** (what you wanted to happen in the world)
3. **What actually happened?** (the wrong real-world outcome)
4. **What did the agent not know?** (if already identified)
5. **Blast radius**: what was affected, what had to be undone, who noticed

## Phase 2: Semantic Gap Classification

Identify which layer of semantic context was missing. One or more may apply:

| Gap Type | Description | Example |
|----------|-------------|---------|
| **Dependency blindness** | The action was correct in isolation but broke a dependency the agent could not see | Rescheduled a meeting; didn't know it was a load-bearing sync for three other people |
| **State misread** | The agent read state correctly but lacked schema context to interpret its meaning | Deleted a record marked "inactive"; the system uses "inactive" to mean "pending review" |
| **Permission scope gap** | The agent had permission to do the thing but not the authority to decide it should be done | Had write access to the calendar; the calendar owner had a standing exception not encoded in the system |
| **Notification gap** | The action triggered side effects through human-only channels the agent could not see | Sent a message that auto-forwarded to a client; the forward rule was not in any machine-readable channel |
| **Commitment without staging** | The action was irreversible; no preview or confirm step existed | Submitted a payment; no dry-run endpoint existed for the agent to verify before committing |
| **Intent-action mismatch** | The agent correctly interpreted the instruction but the instruction underspecified the intent | "Cancel the meeting" meant "decline, but keep it on the calendar for reference" — not delete |

For each matching gap, state:
- Why this gap applies to this incident
- What information would have prevented the failure
- Where in the system that information lives (or does not exist yet)

## Phase 3: Root Cause

Apply "Why did the semantic layer fail?":
1. What did the agent know? (enumerated list)
2. What did the agent not know? (the gap)
3. Why didn't the agent know it? (encoding failure, missing schema, missing tool, prompt underspecification)
4. Could a human reasonably have known? (if yes, this is an encoding failure; if no, the gap is systemic)
5. Root cause in one sentence.

## Phase 4: Remediation

For each identified gap, assign a fix at the appropriate layer:

| Fix Layer | What changes | When to use |
|-----------|-------------|-------------|
| **Prompt layer** | Add explicit context rules to the agent's system prompt or task spec | Fast fix; agent already has access to the information |
| **Schema layer** | Extend the API/tool schema to encode the missing semantic field | When the information exists in the system but isn't exposed |
| **Validation layer** | Add a pre-action validation step (human-in-the-loop gate or automated check) | When the information cannot be reliably encoded and the action is high-stakes |
| **Tool layer** | Build or integrate a tool that reads the missing semantic context | When the information is in another system and needs a bridge |
| **Staging layer** | Add a stage-validate-commit pattern to the action | When the action is irreversible and the semantic gap cannot be closed quickly |

## Phase 5: Post-Mortem Report

```
# Action-Outcome Post-Mortem: [Short Title]
Date: [date]
System: [agent/pipeline name]
Severity: [LOW | MEDIUM | HIGH | CRITICAL]

## Incident Summary
Action taken: [what the agent did]
Expected outcome: [what should have happened]
Actual outcome: [what went wrong]
Blast radius: [who/what was affected]

## Semantic Gaps Identified
### [Gap Type]
What was missing: [the specific context the agent lacked]
Where it lives: [schema field, external system, human knowledge]
Why the agent couldn't access it: [encoding failure / missing tool / prompt gap]

## Root Cause
[One sentence]

## Corrective Actions
| Fix | Layer | Priority | Effort |
|-----|-------|----------|--------|
| [specific change] | [prompt/schema/validation/tool/staging] | [P0-P3] | [hours/days] |

## Prevention Pattern
[One-paragraph description of the general pattern this failure represents
and how to detect it in future agent task designs before deployment]
```

## Phase 6: Verification

- [ ] Root cause names a specific missing semantic primitive, not a generic "the agent didn't know"
- [ ] Each corrective action maps to a specific layer (prompt / schema / validation / tool / staging)
- [ ] If any action is Commitment without staging and severity >= HIGH, a staging-layer fix is in the action table
- [ ] Prevention pattern is general enough to apply beyond this specific incident

## Source

Extracted from Nate Jones newsletter (2026-05-06): "The next AI platform winner won't have the best model. They'll own something most companies don't even see yet." The semantic-layer framing surfaces a specific failure mode where agents succeed mechanically but fail semantically due to missing meaning primitives in the tools they use.
