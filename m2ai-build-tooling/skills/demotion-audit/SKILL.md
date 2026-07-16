---
name: demotion-audit
description: Three-phase audit to determine whether a software tool or artifact should be demoted down the production-class ladder (Customer-Facing → Supported Internal → Team Beta → Personal Tool → retired). Returns a Demote/Hold verdict with explicit trigger evidence, transition requirements, and a "maintenance cost no one is watching" estimate. Trigger on "demotion audit", "should I demote this tool", "is this tool still worth supporting", "downgrade this tool", "retire this tool".
---

# Demotion Audit

Audit a software tool against class-specific demotion triggers to produce a **Demote** or **Hold** verdict. Unlike a promotion decision (forward-looking), demotion is about recognizing when the organizational reality supporting a rung has quietly collapsed — and making the cost of continued support visible.

## When to trigger

- A tool hasn't been used in weeks but is still listed as Supported Internal
- User count has dropped but ownership and support obligations remain unchanged
- A recurring scheduled audit surfaces a tool past its next-review date
- The person responsible for a tool is no longer actively maintaining it
- User says "demotion audit", "should I demote this tool", "is this still worth keeping", "downgrade this tool", "retire this tool", "is anyone using this"

## Phase 1: Gather 4 audit facts

Collect these four facts before scoring. Do not accept vague answers — rung-crossing decisions require specific numbers.

1. **Current rung** — what rung is the tool currently classified at?  
   (Personal Tool / Team Beta / Supported Internal / Customer-Facing)
2. **Actual user count** — how many distinct users have used it in the last 30 days?  
   (Not "a few" — an actual count, or "unknown" stated explicitly)
3. **Last significant usage** — when did a user other than the owner last get value from it?
4. **Maintenance cost being absorbed** — who maintains this, how many hours per week, and is that cost visible in any planning or prioritization process?

If Fact 4 answer is "no cost — it just runs" — this is itself a demotion trigger signal. Tools absorbing hidden support time are the primary source of zombie tools at Rung 3.

## Phase 2: Apply class-specific demotion triggers

Check the triggers for the current rung. Any single trigger is sufficient for a **Demote** recommendation.

### Customer-Facing → Supported Internal

| Trigger | Evidence required |
|---------|------------------|
| External user count dropped to 0 | Last external login or API call date |
| Revenue dependency eliminated | Billing or contract record no longer references this tool |
| Contractual obligation expired or removed | Contract audit or legal confirmation |
| Public documentation removed | Docs site or changelog confirms removal |

### Supported Internal → Team Beta or Personal Tool

| Trigger | Evidence required |
|---------|------------------|
| Active user count below 10 for 8+ consecutive weeks | Usage logs or honest estimate |
| Named backup owner position is vacant | Org chart, CODEOWNERS, or responsible-party list |
| No documented incident response process | Written runbook or escalation path does not exist |
| Outage cost has dropped below meaningful threshold | No one escalated the last two outages |

### Team Beta → Personal Tool

| Trigger | Evidence required |
|---------|------------------|
| User count below 3 for 4+ weeks | Usage record |
| Only the owner uses it regularly | Honest usage report |
| No external dependencies or team reliance | Dependency audit |

### Any rung → Retired

| Trigger | Evidence required |
|---------|------------------|
| 0 users for 60+ days | Last-used record |
| Replaced by a different tool | Migration confirmation |
| Owner no longer with the org or team | Org change record |

## Phase 3: Produce Demote/Hold verdict

### DEMOTE

Issue when at least one trigger is confirmed.

- Current rung → target rung (one rung at a time; do not skip rungs unless "Any rung → Retired" triggers apply)
- Primary trigger that drove the decision
- **Transition requirements**: specific actions before or during demotion (notify current users, remove from docs, archive codebase, update classification record)
- **Maintenance cost no one is watching**: estimate of ongoing support time being absorbed — surface this even for Hold verdicts

### HOLD

Issue when no triggers are confirmed.

- Current rung confirmed
- The specific, measurable condition that would flip this to DEMOTE
- Next review date
- **Maintenance cost no one is watching**: same estimate required — a Hold that hides ongoing cost is not a clean Hold

## Output format

```
## Demotion Audit: [Tool Name]

**Current rung**: Rung [N] — [Rung Name]
**Verdict**: DEMOTE | HOLD

---

### Audit Facts
| Fact | Value |
|------|-------|
| Active users (last 30d) | [count or "unknown — escalate"] |
| Last significant usage | [date or estimate] |
| Maintenance cost absorbed | [hrs/week, by whom] |

### Trigger Check (Rung [N])
| Trigger | Evidence | Fired? |
|---------|---------|--------|
| [trigger description] | [evidence] | Yes / No |

---

## If DEMOTE

**Demotion path**: Rung [N] → Rung [N-1]
**Primary trigger**: [the specific trigger that fired]

**Transition requirements**:
- [ ] [Notify current users / archive / remove from docs / update classification record]
- [ ] [Tool-specific handoff item]

**Maintenance cost no one is watching**: [hrs/week] × [weeks running] = [cumulative estimate]

---

## If HOLD

**Hold reason**: [why no trigger fired]
**Flip condition**: [specific measurable event that would produce a DEMOTE verdict]
**Next review date**: [date]

**Maintenance cost no one is watching**: [estimate]
```

## Rules

- Never issue HOLD without a flip condition — an open-ended Hold is a postponed Demote
- Never skip rungs on demotion; do not jump directly from Rung 4 to retired unless "Any rung → Retired" triggers apply
- Always compute and surface the maintenance cost estimate, even for Hold verdicts — hidden support absorption is the primary reason zombie tools survive
- If user count is "unknown", treat it as a demotion trigger — an undocumented user count at Rung 3 or 4 is a governance failure
- Demotion is reclassification to the rung that matches current reality, not a failure verdict

## Verification

- [ ] All 4 audit facts collected (or "unknown" explicitly flagged)
- [ ] Class-specific triggers checked for the current rung
- [ ] Verdict is DEMOTE or HOLD (no ambiguous "maybe")
- [ ] If DEMOTE: transition requirements and maintenance cost estimate present
- [ ] If HOLD: flip condition and next review date present
- [ ] Maintenance cost estimate present in all outputs

## Source

Nate's Newsletter, 2026-05-29 — "Your prototype graveyard is leaking secrets. The Prototype Classifier + Demotion Audit decide what stays"  
URL: https://natesnewsletter.substack.com/p/product-management-cheap-software-governance  
The Demotion Audit is Nate's three-phase framework. Phase structure, trigger tables, and output schema reconstructed from the newsletter's prompt description.
