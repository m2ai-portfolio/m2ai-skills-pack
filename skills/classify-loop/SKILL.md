---
name: classify-loop
description: Classify an agent workflow by the loop it operates in (code-generation, operational, supervisory, or fully-autonomous) and map each loop type to appropriate controls, approval requirements, and rollback paths. Use when designing a new agent workflow, auditing an existing agent deployment, or when someone asks "what loop is my agent in?", "how autonomous should this agent be?", "/classify-loop", or "classify this agent workflow".
---

# Agent Loop Classifier

Classifies any agent workflow by the operational loop it runs inside, then maps that loop to the controls it needs. The question used to be "can the model do the task?" — the better question is "what loop is the agent inside?" because that determines what governance is appropriate.

## Trigger

Use when the user says "/classify-loop", "classify my agent", "what loop is this agent in", "how autonomous should this be", "agent loop type", "categorize this workflow", or when reviewing an agent design for governance gaps.

## Phase 1: Workflow Description

Ask the user to describe the agent workflow. Collect:

1. **What does the agent do?** (task description, inputs, outputs)
2. **Who consumes the output?** (another agent, a human who reviews it, a production system directly)
3. **How long does a run take?** (seconds / minutes / hours)
4. **What happens if the agent is wrong?** (a human catches it / it silently propagates / it causes visible harm)
5. **Is there a human in the loop during execution?** (watching in real-time / notified after / not notified)

## Phase 2: Loop Classification

Classify the workflow into one of four loop types:

### Loop A — Code Generation (Write-for-Human)
**Pattern**: Agent produces an artifact (code, document, plan) that a human reviews before it takes effect.
**Key signal**: Human is the final gate before anything executes or publishes.
**Examples**: PR generation, document drafting, spec writing, test scaffolding
**Autonomy level**: Low — agent is a draft generator, human is the decision-maker
**Risk profile**: Low blast radius; human review catches errors before they propagate

### Loop B — Operational (Execute-and-Report)
**Pattern**: Agent executes actions and reports results. Human reviews the report after the fact, not before.
**Key signal**: Agent takes real actions autonomously; human sees results in a dashboard, log, or summary.
**Examples**: Scheduled data pipelines, recurring report generation, automated test runs, monitoring sweeps
**Autonomy level**: Medium — agent acts, human audits
**Risk profile**: Medium; errors run to completion before human sees them. Requires idempotency and rollback.

### Loop C — Supervisory (Human-Watches-Agent-Drives)
**Pattern**: Agent drives a complex workflow while a human watches and can intervene at any step.
**Key signal**: Human is present but mostly passive; agent leads. Human has an override path.
**Examples**: Guided deployments, interactive debugging sessions, assisted code review, live research tasks
**Autonomy level**: Medium-High — agent drives, human supervises
**Risk profile**: Medium-High; requires clear human override mechanism and checkpoints

### Loop D — Fully Autonomous
**Pattern**: Agent runs end-to-end with no human in the loop during execution. Human sets the goal and reviews the outcome.
**Key signal**: Agent runs to completion before any human sees anything.
**Examples**: Overnight pipeline runs, scheduled multi-step workflows, autonomous agent teams
**Autonomy level**: High — agent owns execution
**Risk profile**: High; errors can compound across many steps before detection. Requires robust guardrails, automatic pause conditions, and post-run audit.

## Phase 3: Classification Output

Produce a structured classification:

```
AGENT LOOP CLASSIFICATION
Workflow: [name or description]
Date: [date]

Loop Type: [A / B / C / D] — [Name]
Confidence: [High / Medium — note if uncertain]

Evidence:
  - [observation 1 that supports this classification]
  - [observation 2]

Misclassification risk: [note if the workflow could shift to a different loop type under changed conditions]
```

## Phase 4: Controls Map

For the classified loop type, emit the required controls:

| Control | Loop A | Loop B | Loop C | Loop D |
|---------|--------|--------|--------|--------|
| Human review gate | Required (before effect) | Post-hoc audit | Available (override) | Post-run audit |
| Rollback path | Not needed (draft only) | Required | Required | Required + tested |
| Approval to proceed | On human review | On schedule/trigger | Continuous monitoring | Pre-run goal approval |
| Error containment | Human review | Idempotency + retry limits | Override path | Automatic pause conditions |
| Audit trail | Optional | Recommended | Recommended | Required |
| Action-class policy | Tier 0-1 typical | Tier 1-2 typical | Tier 1-3 typical | Tier 2-3 required |

Output a concrete controls checklist for the classified loop:

```
CONTROLS CHECKLIST FOR LOOP [TYPE]

Required:
  [ ] [control 1 specific to this workflow and loop type]
  [ ] [control 2]

Recommended:
  [ ] [control 3]

Gaps identified in current workflow:
  - [gap 1]: [recommendation]
  - [gap 2]: [recommendation]
```

## Phase 5: Loop Stability Check

Flag conditions that would cause the workflow to shift to a higher-autonomy loop (more risk):

- **Volume increase**: If the agent runs 10× more often, does the Loop B audit process still scale?
- **Scope expansion**: If the agent gains write access to a new system, does it stay in the same loop?
- **Model upgrade**: If the model improves, is there pressure to remove human checkpoints?
- **Reliability trust**: If the agent performs well for 3 months, is there organizational pressure to remove oversight?

For each flag: note the condition and the recommended governance response (e.g., "re-run classification if scope expands beyond current system list").

## Notes

- This classification is distinct from architecture classification (what kind of agent is it?). Loop type is about governance, not structure.
- Many workflows span multiple loops — e.g., a pipeline that is Loop B for data processing but Loop A for the final report it generates. Classify each distinct segment separately.
- A Loop D workflow does not mean "no oversight" — it means oversight happens before and after, not during.
- When uncertain between two loop types, classify at the higher-autonomy level and design controls for that level.

## Source

Derived from Nate Kadlac newsletter (2026-05-25): "AI made your app teams 10x faster. Nobody gave your platform team 10x the headcount." — "the question used to be: can the model do the task? Now it's: what loop is the agent inside?" as the central reframe for agent governance.
