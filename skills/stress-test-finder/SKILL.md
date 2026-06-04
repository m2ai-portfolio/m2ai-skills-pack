---
name: stress-test-finder
description: Interview the user about their current workload, surface the task they've been avoiding because it felt too messy or fragile to delegate, and produce a complete AI delegation prompt for that task. Use when deciding what to hand off next or when stuck in indecision about AI delegation.
---

# Stress Test Finder

Conducts a structured interview to uncover the highest-value task the user has been avoiding delegating, then converts it into a complete, executable prompt ready to hand to an AI agent or coding tool.

## Trigger

Use when the user says "/stress-test-finder", "what should I delegate", "find my stress test task", "what's my best AI handoff", "I don't know where to start with AI", or expresses vague intent to use AI more but can't pick a task.

## Phase 1: Interview

Ask these questions in sequence. Do not ask all at once. Wait for each answer before continuing.

1. **"What are you working on this week?"** — Get a rough list of active projects and tasks.
2. **"Which of those have you been putting off?"** — Surface avoidance.
3. **"Why haven't you started on that one yet?"** — Probe the reason: too messy, too risky, unclear outcome, requires many steps?
4. **"What would a good result look like?"** — Extract the acceptance criteria.
5. **"What inputs do you already have?"** (files, data, context, prior attempts) — Identify what's available to hand over.

If the user provides multiple avoided tasks, ask: "Which one would you feel most relieved to have done by tomorrow?" — select the one with the highest emotional weight.

## Phase 2: Delegation Diagnosis

Evaluate the selected task against three delegation readiness tests:

| Test | Passes if | Fails if |
|------|-----------|----------|
| **Describable** | The task can be stated in ≤ 3 sentences | Requires a document to specify |
| **Verifiable** | You can tell a good result from a bad one without doing the work yourself | Requires expert judgment to evaluate output |
| **Inputs present** | You have the files, data, or context an agent needs to start | Missing key inputs that only you can provide |

If all three pass → proceed to Phase 3.

If one fails → address it first. Guide the user:
- **Not describable** → "Let's narrow the scope. What's the single most important deliverable?"
- **Not verifiable** → "What does 'done' look like? Describe the output format."
- **Inputs missing** → "What's the smallest version of this task you could hand over right now with what you have?"

## Phase 3: Generate the Delegation Prompt

Produce a complete delegation prompt using this structure:

```
TASK: {one-sentence summary}

CONTEXT: {background the agent needs — project, prior attempts, constraints}

INPUTS:
  - {list each available input: file paths, data sources, existing text}

DELIVERABLE:
  {Exact description of what the output should be, including format}

ACCEPTANCE CRITERIA:
  - {criterion 1}
  - {criterion 2}
  - {criterion 3 — minimum 3, cover format, content, and edge cases}

CONSTRAINTS:
  - {any hard limits: don't touch X, keep under Y words, use only Z tools}

START HERE:
  {First concrete action the agent should take}
```

## Phase 4: Output

Deliver the prompt in a code block so it can be copied directly. Then say:

> "This prompt is ready to paste into Claude Code, ChatGPT, or any AI agent. Run it, review the output against your acceptance criteria, and if it passes, that's your stress test proof that this task is delegatable."

Optionally, if the workflow-fit-scorer skill is available, offer to score the task first before generating the prompt.

## What This Does NOT Do

- Does not execute the task — it only produces the delegation prompt.
- Does not guarantee the task is automatable — use workflow-fit-scorer for that assessment.
- Does not persist the prompt anywhere — the user should save it.

## Source

Extracted from Nate Kadlac newsletter (2026-04-28): "ChatGPT 5.5 scored 87 where the next best model scored 67. Here's what that gap looks like in real work." The Stress Test Finder is Nate's Prompt 1 from his five-prompt kit — an interview that converts vague delegation intent into a concrete, executable handoff.
