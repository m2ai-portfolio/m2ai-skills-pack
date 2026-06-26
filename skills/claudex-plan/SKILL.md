---
name: claudex-plan
description: "Enforced multi-round planning loop with a stop hook that blocks code execution until the plan survives adversarial review and receives explicit approval. Use when a task is high-stakes enough that a wrong plan is expensive to undo — the stop hook is the \"bouncer\" that prevents jumping straight to implementation. Trigger phrases: \"claudex plan\", \"enforce planning before coding\", \"stop hook planning gate\", \"plan must survive review before I build\", \"plan-first workflow\"."
---

# Claudex Plan — Stop-Hook Enforced Planning Gate

A stop hook acts as a bouncer: Claude cannot execute implementation until the plan
has been reviewed, adversarially tested, and explicitly approved.
This is the pattern when "start with a plan" isn't enough — you need a hard gate.

## When to Invoke

- Task is high-stakes: data migrations, auth flows, multi-service refactors
- Prior sessions have produced plans that were bypassed under time pressure
- User wants to enforce "no code until plan is reviewed" as a workflow discipline
- User says "I want to plan before building, and I want it enforced"

## Core Concept: The Stop Hook

A stop hook is a tool or mechanism that intercepts the transition from planning to execution.
Without explicit approval, the hook returns the session to planning mode.

The bouncer metaphor: the hook stands at the door. You can plan, revise, and iterate inside.
But the door to implementation doesn't open until you explicitly say "approved."

This can be implemented as:
- A Claude Code `PreToolUse` hook on Edit/Write that checks for an approval flag
- A slash command that sets an "approved" state before allowing file edits
- An explicit human-in-the-loop checkpoint the user must pass

## Phase 1: Plan Generation

Set round target upfront (default: 2 rounds). Each round = one adversarial review pass.

Generate a structured plan:

```markdown
## Plan: {task}
**Round target:** N adversarial rounds before approval gate
**Execution blocked until:** explicit /approve (or equivalent)

### Steps
1. {step} → exit criterion: {what done looks like}
2. ...

### Assumptions
- {assumption}

### Out of scope
- {explicit exclusion}
```

## Phase 2: Adversarial Rounds

For each round, attack the plan from the perspective of a senior engineer whose job it is to find the failure:

**Round template:**
```
Round {N}/{target}:
- Finding 1: {failure mode} [BLOCKER/SIGNIFICANT/MINOR]
- Finding 2: ...
- Plan revision required: YES / NO
```

If revisions required: update the plan, note what changed, start next round against the revised plan.
If no BLOCKER or SIGNIFICANT findings: round passes.

Exit adversarial loop when: all N rounds completed OR adversary has zero BLOCKER/SIGNIFICANT findings two rounds in a row.

## Phase 3: Approval Gate

Present the plan survival summary and stop. Do not proceed to implementation.

```
## Plan Survival Summary
Task: {task}
Rounds completed: N
Blockers found and resolved: X
Significant issues found: Y (Z resolved, W accepted)
Residual risks: {list or "none"}

---
EXECUTION BLOCKED — awaiting approval.

Options:
  approve   — accept plan and begin implementation
  review    — inspect current plan in full
  revise    — return to planning with a specific concern
  cancel    — abort the task
```

Wait for explicit user input before continuing.

## Phase 4: Execution

On approval:
1. Confirm the approved plan is the one being executed (read it back, one-line summary)
2. Tag implementation steps against plan steps (e.g., "Implementing step 3: {description}")
3. If a step requires a significant deviation from the approved plan, pause and surface it — do not silently deviate

On rollback request:
- Restore to the last approved plan state (undo file edits if not yet committed, or describe what must be manually reverted)
- Re-enter Phase 3 with the previous plan

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `round_target` | 2 | Number of adversarial rounds before approval gate |
| `block_on_edit` | true | Whether Edit/Write is blocked before approval |
| `require_written_approval` | true | Whether "approve" must be explicit text, not just implied |
| `rollback_on_cancel` | true | Whether cancel restores pre-plan file state |

## Slash Command Reference

| Command | Action |
|---------|--------|
| `plan` | Start a new plan with configured round target |
| `review` | Display current plan in full, with round history |
| `approve` | Unlock execution on current plan |
| `cancel` | Abort and optionally revert changes |
| `rollback` | Revert to previous approved plan state |

## Two Modes

**Plan-first** — complete all rounds and approval before any code is written. Best for risky tasks.

**Plan-during** — begin low-risk scaffolding steps while planning continues in parallel. The stop hook only gates steps marked as high-risk in the plan.

## Verification

- [ ] Round target was set before planning started
- [ ] Each adversarial round produced at least one finding (zero findings = insufficient review)
- [ ] Approval gate was reached and user explicitly approved before implementation began
- [ ] Any deviation from the approved plan during execution was surfaced, not silently absorbed
- [ ] Rollback path is documented if cancel/rollback is requested

## Source

Mark Kashef — "You Can Make Claude + Codex Plan Together. Here's How." (2026-04-28)
https://www.youtube.com/watch?v=RChO5deJ_fE

Core extractions: the stop hook as a "bouncer" metaphor, round configuration, the plan/review/approve/cancel/rollback command set, and the plan-first vs. plan-during modes. Originally demonstrated with the claudex tool (Claude + Codex pairing), but the stop-hook gate pattern is applicable to any planning discipline.
