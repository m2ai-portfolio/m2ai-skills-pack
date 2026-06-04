---
name: tool-migration-brief
description: Converts enterprise tool audit results (which tools fail agent-infrastructure tests) into a leadership-ready migration brief — covering what to replace, build, or wrap, with risk, sequencing, and budget framing. Output is a 1–2 page executive document suitable for a CTO, VP Engineering, or department head. Use when the user says "write a migration brief", "make this exec-ready", "brief for leadership on tool migration", or has scored their stack and needs to present the decision.
---

# Tool Migration Brief Writer

Transforms a stack audit or tool evaluation into a structured, leadership-readable migration brief. Designed to support decisions about which enterprise tools to keep as agent infrastructure, which to MCP-wrap, and which to replace.

## Trigger

Use when the user:
- Has completed a stack scoring pass and wants to present findings to leadership
- Says "write a migration brief", "exec brief for our tools", "make this leadership-ready", or "migration roadmap document"
- Provides a list of tools with verdicts (keep / wrap / replace) and needs a framed recommendation
- Is preparing for a budget cycle, architectural review, or vendor contract renewal

## Phase 1: Intake

Accept one of:
1. **Scored stack output** — a table of tools with verdicts (agent infrastructure / wrappable / legacy)
2. **Unstructured list** — tool names and the user's informal assessment of each
3. **Single tool** — one legacy tool and why it needs to be replaced

If the user provides an unstructured list, ask for each tool's verdict before proceeding. If they have no prior scoring, recommend running the stack scoring diagnostic first.

Also ask:
- **Audience** — CTO, VP Engineering, department head, or board? (determines technical depth)
- **Constraint** — budget cap, timeline, team size, or risk tolerance to frame around?
- **Urgency driver** — what is forcing this decision now? (contract renewal, incident, new AI initiative, audit)

## Phase 2: Failure Analysis

For each tool marked Wrappable or Legacy, document:

```
Tool: [Name]
Verdict: [Wrappable | Legacy]
Failing tests: [list which of the 5 structural tests it fails]
Business impact: [what this failure costs in agent-workflow terms — manual steps, latency, errors]
Current spend: [license cost or LOE if known; leave blank if unknown]
Vendor trajectory: [is the vendor adding MCP support? Acquired? Declining?]
```

Be specific about business impact — "agents can't read state transitions without a human click" is better than "limited API".

## Phase 3: Replacement Options

For each failing tool, identify the decision:

### Option A: Wrap (build MCP server)
- **When to choose**: tool passes 3–4 of 5 tests; vendor has a stable API; replacement cost is high
- **Effort**: estimate in engineer-weeks
- **Risk**: API stability, auth complexity, maintenance burden

### Option B: Replace with agent-native alternative
- **When to choose**: tool passes 0–2 tests; vendor is declining or locked; a better-scoring alternative exists
- **Alternatives**: name 1–2 specific tools that score higher on the diagnostic
- **Migration cost**: data export/import, retraining, contract break penalty

### Option C: Defer
- **When to choose**: low usage, not on a critical agent workflow path, replacement cost is high now
- **Condition for revisit**: name the trigger (contract renewal date, next planning cycle, vendor news)

## Phase 4: Risk and Sequencing

Produce a prioritized migration sequence:

```
## Migration Sequence

Phase 1 (0–90 days): Quick wins
- [Tool] → Wrap: engineer-weeks [N], risk LOW
  Rationale: [why this is the first move]

Phase 2 (90–180 days): Replacements
- [Tool] → Replace with [Alternative]: effort [N], risk MEDIUM
  Rationale: [why this comes second]

Phase 3 (180–365 days): Deferred
- [Tool] → Defer until [condition]
  Rationale: [why deferral is acceptable]
```

Flag any dependency: if Tool A is blocked by Tool B being replaced first, call it out.

## Phase 5: Budget Framing

Produce a simple cost table:

```
| Initiative | Type | Effort | License Delta | Priority |
|-----------|------|--------|--------------|----------|
| Wrap [Tool] | Build | [N weeks] | $0 | High |
| Replace [Tool] with [Alt] | Buy | [N weeks migration] | +$X/yr (save $Y) | Medium |
| Defer [Tool] | — | — | $0 | Low |

Estimated total investment: [N] engineer-weeks + $[X]/yr net delta
```

If exact costs are unknown, use ranges and flag as estimates. Do not invent numbers.

## Phase 6: Executive Brief Output

Assemble into a complete brief:

```markdown
# Tool Migration Brief: [Stack or Initiative Name]
**Prepared for:** [Audience]
**Date:** [Date]
**Urgency driver:** [What forced this decision]

## Executive Summary
[2–3 sentences: what we found, what we recommend, what it costs and when.]

## What We Found
[Paste the scored tool table — verdicts, scores, key failing tests.]

## Recommended Actions

### Immediate (0–90 days)
- [Action] — [Tool] — [Effort] — [Why now]

### Near-term (90–180 days)
- [Action] — [Tool] — [Effort] — [Why this sequencing]

### Deferred
- [Tool] — defer until [condition] — [Why acceptable to wait]

## Investment Summary
[Paste budget table.]

## Risks
1. [Risk] — [Mitigation]
2. [Risk] — [Mitigation]

## Decision Requested
[Specific ask: budget approval, headcount, vendor contract action, architectural sign-off.]
```

Keep the total brief to 1–2 pages. If it exceeds that, trim Phase 2 detail — executives need the recommendation and the ask, not the full failure analysis.

## Verification

A good migration brief:
- Opens with the recommendation, not the background
- Every "Replace" recommendation names a specific alternative, not just "find a better tool"
- Budget table uses ranges with explicit uncertainty labels rather than invented precision
- Ends with a specific decision requested — not "we should think about this"
- Audience calibration is visible: brief for a CTO uses different technical depth than brief for a board

## Source

Extracted from Nate's Newsletter (natesnewsletter@substack.com), 2026-05-02 — "AI agents are about to route around every tool that can't pass 5 structural tests. Here's the diagnostic." Technique: leadership migration brief as the output layer of an enterprise stack scoring exercise.
