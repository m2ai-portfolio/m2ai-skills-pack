---
name: anticipation-gap-audit
description: Scores any agent definition or skill manifest against the four consumer-AI breakthrough problems (context, reliability, permission, judgment) plus a reactive-vs-anticipatory axis. Outputs a heatmap and ranked vulnerability list.
---

# Anticipation Gap Audit

Evaluates an agent or skill manifest against the five-axis framework that separates reactive AI products from genuinely anticipatory ones. Produces a scored heatmap and a ranked list of where the subject is purely reactive vs where it could legitimately initiate without prompting.

## Trigger

Use when the user says "anticipation audit", "score this agent", "how anticipatory is this", "gap audit", "reactive vs anticipatory check", "audit this skill for anticipation", or provides an agent definition and asks whether it could proactively help users.

## Phase 1: Intake

Accept the subject. This can be:
- An agent definition file (agent.yaml, agent.config.json, AGENT.md)
- A skill manifest (SKILL.md)
- A plain-text description of an agent or product
- A product landing page pasted as text

Ask clarifying questions only if the subject is ambiguous. Otherwise proceed immediately.

## Phase 2: Score Each Axis

Score the subject on all five axes. For each axis, assign:
- **GREEN (2)** — fully addressed; agent handles this without human prompting
- **YELLOW (1)** — partially addressed; works but degrades or requires human scaffolding
- **RED (0)** — not addressed; agent is purely reactive on this dimension

### Axis 1: Context

Does the agent maintain persistent, queryable awareness of user state across sessions and surfaces?

Indicators:
- Has access to memory, prior conversation state, or persistent storage
- Can recall what the user last did without being re-briefed
- Context survives session resets and context-window limits
- Handles multi-device or multi-agent state (what one agent did is visible to another)

### Axis 2: Reliability

Does the agent behave deterministically enough to be trusted without supervision?

Indicators:
- Same inputs produce consistent outputs across N runs
- Gracefully handles unexpected inputs without silent failure
- Has a fallback or abort path when confidence is low
- Error messages are actionable, not generic
- Has been validated by a test suite or regression check (see `agent-reliability-calculator`)

### Axis 3: Permission

Does the agent have bounded authority to act on behalf of the user without per-action approval?

Indicators:
- Has explicit permission scopes (e.g., "auto-act under threshold X, ask above it")
- Permission boundaries are documented and machine-readable
- The agent does not request permissions it doesn't need
- User can audit what the agent has done post-hoc

### Axis 4: Judgment

Does the agent know when to act vs ask vs queue vs abort?

Indicators:
- Classifies actions by reversibility before executing
- Has a cost-boundary check before spending user resources
- Detects when the user is observing and adjusts behavior accordingly
- Has an explicit "ask-first" path for high-stakes or ambiguous actions

### Axis 5: Reactive-vs-Anticipatory

Does the agent initiate at the right moment without being prompted, or only when explicitly invoked?

Indicators:
- Has trigger conditions (schedule, event, threshold) beyond "user typed a command"
- Monitors state and fires when conditions are met
- Produces outputs before the user notices a problem, not after
- Has been deployed in a scheduled or event-driven mode (not only interactive)

## Phase 3: Heatmap Output

```
## Anticipation Gap Audit — [Subject Name]

| Axis         | Score | Status  | Gap Summary                          |
|--------------|-------|---------|--------------------------------------|
| Context      |  X/2  | COLOR   | [one line]                           |
| Reliability  |  X/2  | COLOR   | [one line]                           |
| Permission   |  X/2  | COLOR   | [one line]                           |
| Judgment     |  X/2  | COLOR   | [one line]                           |
| Anticipatory |  X/2  | COLOR   | [one line]                           |
| **Total**    | XX/10 |         |                                      |

### Verdict

[One of:]
- ANTICIPATORY READY (8-10): Agent can initiate without prompting. Gaps are minor.
- SCAFFOLDED (5-7): Agent works well reactively. Anticipation requires human setup or cron scaffolding.
- REACTIVE ONLY (3-4): Agent is another inbox. Core problems unsolved.
- NOT DEPLOYABLE (0-2): Critical gaps in reliability or permission block safe autonomous use.

### Ranked Vulnerabilities

[List RED axes first, then YELLOW. For each:]
1. [Axis name] — [specific gap] — [what would fix it]

### Upgrade Path

[Concrete next steps ordered by effort-to-impact:]
1. [Highest-leverage fix — usually the lowest-scoring axis]
2. [Second fix]
3. [Third fix]
```

## Phase 4: Follow-Up Options

Offer:
- "Want me to draft the permission scope DSL for the Permission axis?"
- "Want me to run `failure-asymmetry` to find the human-vs-agent invocation gap?"
- "Want me to generate a test suite for the Reliability axis?"

## Verification

A good audit:
- Has at least one RED or YELLOW finding (a perfect 10/10 means the subject wasn't scrutinized)
- Gap summaries name specific missing components, not vague categories
- Upgrade path is ordered by effort-to-impact, not alphabetically
- Verdict matches the numeric total without softening

## Source

Extracted from Nate Kadlac newsletter (2026-05-05) — "The Anticipation Gap: Why 4 Problems Have to Be Solved Together for Consumer AI to Work" — four-problem framework for consumer AI breakthrough, extended to a fifth axis.
