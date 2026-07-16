---
name: management-function-audit
description: Takes an org change description and classifies which management functions (routing, sensemaking, accountability) were removed, retained, or weakened. Predicts failure modes and recommends mitigations based on historical precedents.
---

# Management Function Audit

Takes an organizational change -- reorg, layer removal, restructuring -- and maps it against the three core management functions (routing, sensemaking, accountability). Identifies which functions were cut, which remain, and predicts failure modes based on the "flat-org graveyard" pattern.

## Trigger

Use when the user says "audit this reorg", "management function audit", "we're going flat", "we removed team leads", "restructuring analysis", "org change diagnostic", or describes any organizational restructuring and wants to understand what will break.

## Phase 1: Intake

Accept the org change description. This can be:
- A verbal description ("we removed all team leads, kept directors")
- A before/after org chart or role list
- A news article about a company restructuring
- A planning document for an upcoming reorg

Confirm understanding by restating the change in one sentence.

## Phase 2: Function Classification

Classify the roles/layers that were changed against three management functions:

### Routing
Moving information, decisions, and tasks to the right people. Examples: triaging bugs, assigning tickets, forwarding customer requests, scheduling cross-team syncs.

**Automation timeline:** Now. Routing is pattern-matching on metadata -- AI handles this today.

### Sensemaking
Interpreting ambiguous signals, resolving conflicting information, making judgment calls with incomplete data. Examples: deciding whether a customer complaint is a trend or an outlier, reading team morale, interpreting vague executive directives.

**Automation timeline:** 2-5 years. Requires contextual judgment, institutional memory, and reading between the lines.

### Accountability
Holding people to commitments, giving feedback, having difficult conversations, enforcing standards. Examples: performance reviews, 1:1s where problems are surfaced, code review culture enforcement, saying "this isn't good enough."

**Automation timeline:** Last. Requires interpersonal authority and willingness to create discomfort.

For each removed role or layer, classify which functions it primarily served:

```
| Role/Layer Removed | Routing | Sensemaking | Accountability | Primary Function |
|-------------------|---------|-------------|----------------|-----------------|
| Team leads        | 30%     | 40%         | 30%            | Sensemaking     |
| Project managers  | 70%     | 20%         | 10%            | Routing         |
```

## Phase 3: Failure Mode Prediction

Based on which functions were removed, predict failure modes:

**If routing was removed (and not automated):**
- Information bottlenecks within 2 weeks
- People spending 30%+ time figuring out who to talk to
- Duplicate work across teams
- *Precedent:* Medium's holacracy experiment -- meetings multiplied because nobody knew who owned what

**If sensemaking was removed (and not concentrated):**
- Conflicting interpretations of priorities within 1 month
- Best individual contributors promoted to de facto sensemakers (without training or comp)
- Strategic drift -- nobody connecting day-to-day signals to bigger picture
- *Precedent:* GitHub pre-acquisition -- "open allocation" meant nobody synthesized signals, product direction fragmented

**If accountability was removed (and not replaced):**
- Standards erode within 6 weeks
- Best people leave within 3-6 months (they self-select out when nobody enforces quality)
- "Lord of the Flies" dynamics -- social influence replaces formal authority
- *Precedent:* Valve's flat structure -- shipping bias toward safe projects because nobody could push hard calls

## Phase 4: Mitigation Recommendations

For each removed function, recommend a specific mitigation:

1. **Routing gaps:** Automate with existing tools (Slack workflows, ticket auto-assignment, AI triage). This is the cheapest fix.
2. **Sensemaking gaps:** Concentrate into fewer, explicitly designated roles. Do NOT distribute -- that creates the conflict pattern. Name the people or roles who will own interpretation.
3. **Accountability gaps:** Hardest to fix. Options: peer accountability rituals (blameless retros with teeth), explicit escalation paths, external coaches. Whatever you do, do NOT assume accountability will "emerge organically."

Sequence matters: fix routing first (quick win), then sensemaking (prevents drift), then accountability (prevents attrition).

## Phase 5: Output

Present as:

```
# Management Function Audit: [Company/Team]

## Change Summary
[One sentence description of the reorg]

## Function Impact Map
| Role/Layer | Routing | Sensemaking | Accountability | Status |
|-----------|---------|-------------|----------------|--------|
| [role]    | [%]     | [%]         | [%]            | REMOVED/WEAKENED/RETAINED |

## Risk Assessment
- Routing coverage: [COVERED / GAP / AUTOMATED]
- Sensemaking coverage: [CONCENTRATED / DISTRIBUTED (risky) / GAP]
- Accountability coverage: [RETAINED / WEAKENED / GAP]

## Predicted Failure Modes
[From Phase 3, with timeline estimates]

## Recommended Sequence
1. [Immediate -- week 1-2]: [routing fix]
2. [Near-term -- month 1]: [sensemaking fix]
3. [Ongoing -- month 2+]: [accountability fix]

## Historical Precedents
[Relevant cases from the flat-org graveyard]
```

## Verification

A good audit has:
- Every removed role classified against all three functions (not just the primary one)
- Percentage breakdowns that reflect reality, not round numbers for convenience
- Failure mode predictions tied to specific precedents, not generic warnings
- Mitigations that are sequenced (routing first, accountability last)
- No recommendation to "just distribute accountability" -- that never works

## Source

Extracted from Nate Kadlac newsletter (2026-04-12) -- "Executive Briefing: Valve Got Lord of the Flies. Zappos Got Paralysis. Your Reorg Is Next." Framework for decomposing management into routing/sensemaking/accountability functions with different automation timelines.
