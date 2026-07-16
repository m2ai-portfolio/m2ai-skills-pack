---
name: sensemaking-concentrator
description: Audit a multi-agent system for distributed sensemaking anti-patterns and recommend where to concentrate interpretation into a single agent, reducing conflicting signals and improving decision quality.
---

# Sensemaking Concentrator Audit

Analyzes a multi-agent architecture for the distributed sensemaking anti-pattern -- where multiple agents independently interpret the same ambiguous signals and produce conflicting actions. Recommends where to concentrate interpretation into a single sensemaking agent that maintains context and resolves conflicts.

## Trigger

Use when the user says "sensemaking audit", "agents are conflicting", "who interprets this signal", "concentrate sensemaking", "agent conflict resolution", "signal interpretation audit", or when debugging a multi-agent system where agents propose contradictory actions from the same input.

## Phase 1: Intake

Accept the multi-agent system description. This can be:
- An agent manifest or architecture diagram (agent.yaml, CLAUDE.md, or verbal description)
- A specific incident where agents produced conflicting outputs
- A codebase path containing agent definitions
- A the agent platform-style multi-agent setup

If working with a codebase, use Glob and Read to find agent definitions, dispatch logic, and shared data sources.

Identify:
1. All agents in the system
2. Their declared responsibilities
3. Shared inputs (data sources, signals, events that multiple agents can see)

## Phase 2: Map Signal Flow

For each shared input or signal:

1. **List all agents that read it.** If more than one agent reads the same signal and can act on it, flag it as a potential sensemaking conflict zone.
2. **Classify each agent's role with that signal:**
   - ROUTING -- agent passes the signal along without interpretation (automatable, low conflict risk)
   - SENSEMAKING -- agent interprets the signal, decides what it means, and acts on interpretation (high conflict risk when distributed)
   - ACCOUNTABILITY -- agent checks whether the signal was handled correctly (should remain distributed)
3. **Identify conflict scenarios** -- concrete examples where two agents could interpret the same signal differently and take contradictory actions.

Output a signal flow map:

```
Signal: [description]
  -> Agent A: SENSEMAKING (interprets as X, would do Y)
  -> Agent B: SENSEMAKING (interprets as X', would do Y')
  -> CONFLICT: Y and Y' are contradictory
```

## Phase 3: Concentration Recommendations

For each conflict zone, recommend one of:

### Option A: Designate a Sensemaking Owner
One agent becomes the sole interpreter for this signal class. Other agents receive the interpretation as a fact, not raw signal.

### Option B: Add a Sensemaking Concentrator Agent
A new dedicated agent that receives all ambiguous signals, maintains cross-signal context, and emits resolved interpretations. Other agents subscribe to its outputs.

### Option C: Conflict Resolution Protocol
Keep distributed interpretation but add an explicit resolution mechanism (voting, priority ranking, escalation to human) for when interpretations diverge.

For each recommendation, specify:
- Which agent should own sensemaking (and why)
- What interface the resolved interpretation should have
- What context the sensemaking agent needs to maintain
- What happens when the sensemaking agent is uncertain (escalation path)

## Phase 4: Output

Present findings as:

```
# Sensemaking Concentration Audit

## System: [name]
**Agents:** [count]
**Shared signals:** [count]
**Conflict zones found:** [count]

## Signal Flow Map
[from Phase 2]

## Conflict Zones

### Zone 1: [signal description]
**Agents involved:** [list]
**Conflict type:** [interpretation divergence / action contradiction / priority conflict]
**Recommendation:** [A/B/C] -- [rationale]
**Implementation:** [specific changes]

## Summary
- Signals safely distributed (routing only): N
- Signals needing concentration: N
- Recommended new sensemaking agents: N
- Estimated conflict reduction: [qualitative assessment]
```

## Verification

A good audit has:
- Every shared signal mapped to its reading agents
- Every multi-reader signal classified by role (routing/sensemaking/accountability)
- Concrete conflict scenarios, not abstract warnings
- Recommendations that are specific enough to implement (name the agent, describe the interface)
- No recommendation to centralize accountability (accountability should stay distributed)

## Source

Extracted from Nate Kadlac newsletter (2026-04-12) -- management function decomposition (routing/sensemaking/accountability) applied to multi-agent system design. Based on the insight that distributing sensemaking causes the same failure mode in agent systems as in flat organizations.
