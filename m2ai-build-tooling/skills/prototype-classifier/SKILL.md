---
name: prototype-classifier
description: "Classify any software tool, script, or AI artifact onto a 4-rung production-class ladder (Personal Tool → Team Beta → Supported Internal → Customer-Facing) using evidence-based thresholds. Never rounds up on aspiration — only classifies at the highest rung the artifact fully qualifies for. Trigger phrases: \"classify this tool\", \"what class is this\", \"prototype classifier\", \"production tier\", \"what rung is this\"."
---

# Prototype Classifier

Assesses a software tool, script, or AI artifact against a 4-rung production-class ladder and assigns the highest class the artifact *fully* qualifies for — based on evidence, not aspiration.

## Trigger

Use when:
- You need to know the production class of an existing tool or artifact
- You are deciding whether to invest in hardening, documentation, or support for something
- You want to understand what specific requirements must be met to promote a tool to the next rung

Trigger phrases: "classify this tool", "what class is this", "prototype classifier", "production tier", "what rung is this", "/classify-tool"

## The 4-Rung Ladder

| Rung | Class | Threshold |
|------|-------|-----------|
| 1 | Personal Tool | 1 user; no external dependencies; owner = user; loss is an inconvenience, not an outage |
| 2 | Team Beta | 3+ users for 4+ consecutive weeks; informal support from the owner; outage is disruptive but survivable |
| 3 | Supported Internal | 10+ users OR a meaningful outage cost (team productivity, revenue, compliance impact); has a named owner AND a named backup; documented; outage has a formal remediation path |
| 4 | Customer-Facing | Any external user, revenue dependency, contract reference, or public documentation; requires SLA, security review, external support channel, and external-readiness review |

**Classification rule**: Assign the highest rung the artifact *fully* qualifies for. Never round up based on intent, roadmap, or aspiration. A tool in use by 8 people with no backup owner is Rung 2, not Rung 3, even if the owner plans to write docs next week.

## Phase 1: Intake (6 Questions)

Collect answers to all 6 before classifying:

1. **User count**: How many distinct people use this artifact today? (Not "could use" — actively use.)
2. **Duration**: How long has it been in use at its current user count? (Days, weeks, months.)
3. **Outage cost**: If this artifact broke tomorrow and stayed broken for a week, what would the actual impact be? (Annoyance, lost productivity, revenue risk, compliance issue, contract breach.)
4. **Ownership**: Who is the primary owner? Is there a named backup who can operate it without the primary?
5. **External exposure**: Does any external user, customer, or partner interact with this artifact, depend on it, or have it referenced in a contract or public doc?
6. **Documentation**: Is there documentation a new user could read to understand how to use and maintain it? (Link or "none".)

If the user cannot answer a question, mark it UNKNOWN and apply the conservative threshold (assume the lower rung).

## Phase 2: Ladder Assessment

For each rung from 4 down to 1, check whether ALL thresholds are met:

**Rung 4 — Customer-Facing** (check first; if any external exposure exists, this rung must be assessed)
- Any external user, partner, or customer? → if yes, evaluate full rung-4 requirements
- Contract reference or public documentation? → if yes, evaluate full rung-4 requirements
- If classified here: confirm SLA, security review, external support channel, and external-readiness check are all present

**Rung 3 — Supported Internal**
- User count ≥ 10 OR outage produces meaningful cost (productivity, revenue, compliance)?
- Named owner AND named backup both confirmed?
- Documentation exists and is findable by a new user?
- If ANY of these is UNKNOWN or missing: cannot assign Rung 3

**Rung 2 — Team Beta**
- User count ≥ 3 AND in use for ≥ 4 consecutive weeks?
- Owner is reachable for informal support?
- If user count ≥ 3 but duration < 4 weeks: Rung 1 (still proving stability)

**Rung 1 — Personal Tool**
- Default rung. Assigned when no higher rung qualifies.

## Phase 3: Evidence Check

Before finalizing the classification, verify:
- User count comes from observation (logs, usage data, named list) — not from "I think about 10 people use it"
- Duration is measured in calendar time from first use, not "I built it a while ago"
- Outage cost is a concrete scenario, not "it would be bad"

If evidence is weak on a threshold that determines the rung, note the uncertainty explicitly in the output.

## Phase 4: Classification Output

```
## Prototype Classification

**Tool**: [name or description]
**Assigned Class**: Rung [N] — [Class Name]

### Evidence
- Users: [count], [duration in use]
- Outage cost: [description]
- Owner: [name], Backup: [name or "none"]
- External exposure: [yes/no/detail]
- Documentation: [exists/none/link]

### Why This Rung
[One paragraph: which thresholds were met and which were not. Cite the specific gap that blocked a higher classification.]

### Promotion Gap to Rung [N+1]
The specific requirements not yet met to qualify for the next rung:
1. [Requirement with metric — e.g., "Reach 10 active users (currently 6)"]
2. [Requirement — e.g., "Name a backup owner who can operate the tool without you"]
3. [Requirement — e.g., "Write documentation findable by a new user"]

### Governance Action
[One of: "No action required", "Monitor for promotion triggers", "Harden before next user-count milestone", "Demote — thresholds no longer met"]
```

## Phase 5: Promotion Gap Report (Optional)

If the user wants a focused plan to promote the tool to the next rung, produce:
- A checklist of missing requirements ordered by effort (easiest first)
- An estimate of the time and effort to close each gap
- Any prerequisite that must be closed before others can be addressed

## Source Attribution

Technique: Prototype Classifier — 4-rung production-class ladder
Source: Nate's Newsletter (natesnewsletter@substack.com), received 2026-05-29
Post: "Your prototype graveyard is leaking secrets. The Prototype Classifier + Demotion Audit decide what stays"
URL: https://natesnewsletter.substack.com/p/product-management-cheap-software-governance
Companion skill: demotion-audit (the downward counterpart — classifies toward demotion, not promotion)
