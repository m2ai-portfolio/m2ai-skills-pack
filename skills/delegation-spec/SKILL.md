---
name: delegation-spec
description: Generate a pre-flight delegation spec for any agent task -- context packages for memory-weak tools, review gates for opacity-prone tools, compounding checkpoints for stateless tools. The "test suite before the agent runs the work." Use when handing off a task to an agent, preparing a workflow for autonomous execution, or writing deployment specs for client agent systems.
---

# Delegation Spec Generator

Takes a tool + task description and produces a complete pre-flight delegation spec that patches the structural weaknesses of the target tool. Writes the tests before the agent runs the work.

## Trigger

Use when the user says "delegation spec", "write a handoff spec", "prepare this for delegation", "pre-flight check", "agent handoff", "make this delegatable", "test before delegation", or is about to hand a task to an agent tool and wants to ensure it won't silently fail.

## Phase 1: Gather Inputs

Collect three things:

1. **Tool** -- which agent or platform will execute the task
   - If the tool was recently evaluated via `/eval-agent`, pull the scorecard from that session
   - If not, do a quick capability assessment (memory, inspectability, compounding -- score 0-1 each)

2. **Task** -- what needs to be done
   - Accept natural language description
   - Extract: inputs required, outputs expected, quality criteria, failure modes

3. **Delegation mode**:
   - **Fire-and-forget**: agent runs autonomously, human reviews final output
   - **Supervised**: human reviews at checkpoints
   - **Hybrid**: autonomous for low-risk steps, supervised for high-risk

## Phase 2: Identify Failure Surfaces

For the given tool + task combination, identify where silent failure is most likely:

### Memory Failures
- Will the tool need context from previous runs? If yes and Q1 < 0.75: memory failure surface
- Will the tool need to remember decisions made earlier in this run? If multi-step and Q1 < 0.5: intra-run memory failure

### Inspectability Failures
- Are there intermediate decisions that could go wrong silently? If yes and Q2 < 0.75: opacity failure surface
- Does the task require judgment calls the human would want to verify? If yes and Q2 < 0.5: judgment opacity failure

### Compounding Failures
- Is this a recurring task where quality should improve? If yes and Q3 < 0.75: stagnation failure surface
- Could accumulated context from previous runs degrade this run? If yes and no rot detection: context rot failure

Map each failure surface to a specific step in the task.

## Phase 3: Generate Context Package

For each memory failure surface, create a context injection:

```yaml
context_package:
  inject_at: start  # or before specific step
  contents:
    - type: preferences
      items:
        - "Output format: [specific format]"
        - "Tone: [specific tone]"
        - "Constraints: [specific constraints]"
    - type: facts
      items:
        - "Client name: X"
        - "Previous output stored at: [path]"
        - "Last run date: [date]"
    - type: history
      items:
        - "Summary of last 3 runs: [compressed summary]"
        - "Known failure patterns: [list]"
    - type: templates
      items:
        - "Output template: [path or inline]"
        - "Quality rubric: [path or inline]"
```

## Phase 4: Generate Review Gates

For each inspectability failure surface, create a checkpoint:

```yaml
review_gates:
  - stage: "After research / data gathering"
    check: "Are sources relevant and sufficient?"
    action_if_fail: "Add missing sources, re-run stage"
    auto_passable: false  # requires human judgment

  - stage: "After draft generation"
    check: "Does draft meet quality rubric?"
    action_if_fail: "Provide specific feedback, request revision"
    auto_passable: true  # can use rubric-based auto-check
    auto_check: "Score against rubric, pass if >= 7/10"

  - stage: "Before final delivery"
    check: "Matches expected format, tone, accuracy?"
    action_if_fail: "Block delivery, escalate to human"
    auto_passable: false
```

For each gate, specify:
- What to check (specific, not vague)
- Pass/fail criteria
- Whether it can be auto-evaluated or needs human eyes
- What to do on failure

## Phase 5: Generate Compounding Checkpoints

For recurring tasks with compounding failure surfaces:

```yaml
compounding:
  after_each_run:
    - capture: "What worked well"
      store_in: "[memory location]"
    - capture: "What needed correction"
      store_in: "[memory location]"
    - capture: "New patterns discovered"
      store_in: "[memory location]"

  every_n_runs: 5
    - compare: "Run N output quality vs Run N-5"
      metric: "[specific metric]"
      alert_if: "quality decreased or plateaued"

  rot_detection:
    - signal: "Context package size exceeds [threshold]"
      action: "Prune low-value entries, archive old history"
    - signal: "Same corrections repeated 3+ times"
      action: "Escalate -- tool is not learning"
```

## Phase 6: Assemble Delegation Spec

Output the complete spec:

```
Delegation Spec
===============
Tool: [name]
Task: [one-line description]
Mode: [fire-and-forget / supervised / hybrid]
Risk: [LOW / MEDIUM / HIGH / CRITICAL]

Failure Surfaces Identified: [N]
Review Gates: [N]
Context Injections: [N]

---

PRE-FLIGHT
----------
[ ] Context package prepared and verified
[ ] Tool has access to required APIs/data
[ ] Review gate owners identified and available
[ ] Output destination confirmed
[ ] Rollback plan documented (if destructive task)

EXECUTION
---------
Step 1: [description]
  Context: [what to inject]
  Gate: [none / checkpoint name]
  Max duration: [time limit]

Step 2: [description]
  ...

POST-FLIGHT
-----------
[ ] Output matches expected format
[ ] Quality rubric score: [X/10]
[ ] Learnings captured to [location]
[ ] Context package updated for next run
[ ] Run logged for compounding tracking
```

## Verification

The spec is complete if:
1. Every identified failure surface has a corresponding mitigation (context, gate, or checkpoint)
2. No review gate uses vague criteria ("looks good" is not a check)
3. The spec is executable by someone who didn't write it
4. Rollback/failure paths are defined for each high-risk step

## Source Attribution

Technique derived from Nate's Newsletter (2026-04-04): "I Tested Cowork, Lindy, Sauna, and Opal Against 3 Questions" -- the concept of "writing the tests before the agent runs the work" as a pre-flight delegation protocol, compensating for memory, inspectability, and compounding gaps.
