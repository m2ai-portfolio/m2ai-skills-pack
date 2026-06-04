---
name: dynamic-workflow-orchestration
description: Invoke Claude Code's dynamic workflow orchestration to coordinate teams of 10–50+ agents for large-scale, comprehensive tasks requiring parallel analysis and cross-validation. Trigger phrases: "build a workflow", "dynamic workflow", "/workflows", "spin up agents for", "comprehensive audit across", "workflow that reads every".
---

# Dynamic Workflow Orchestration

Triggers Claude Code's built-in dynamic workflow system to decompose a large task into a coordinated agent team — agents work in queued batches, produce independent insights, and cross-validate each other's findings.

## Trigger

Use when:
- The task requires reading or analyzing 20+ files, components, or records comprehensively (not a sample)
- Cross-validation between agents is more important than raw speed
- The work is repeatable — you will run this workflow class again in the future
- A single agent chain would produce incomplete coverage or require multiple sequential passes

Do NOT use for:
- Simple single-question queries
- Tasks that finish in under 5 minutes with one agent
- Daily routine operations (the token cost is not justified for small tasks)

Invocation phrases: "build a workflow", "dynamic workflow", "spin up agents for [comprehensive task]", "/workflows"

## How Dynamic Workflows Work

Claude Code decomposes the task into an agent specification (roles, responsibilities, execution order), then queues agents in batches rather than spawning all at once. Each batch can cross-check findings from prior batches.

The internal model resembles a Kanban board: agents move from queued → in-progress → done, with downstream agents able to read the outputs of completed upstream agents before starting.

**Token economics (approximate):**
- Single focused agent team: 250,000–300,000 tokens
- Comprehensive multi-folder audit: 1,000,000–3,000,000 tokens
- Rule of thumb: worth it when the manual equivalent is 2+ hours of human work

## Phase 1: Frame the Scope

Write a workflow prompt with three parts:

1. **Context**: What is being analyzed and why ("This is a data room for a company we're acquiring")
2. **Action trigger**: The word "workflow" signals Claude Code to use this feature ("Build a workflow that...")
3. **Analytical goal**: The specific thing agents should find or produce ("...reads every contract here in parallel and flags anything that could hurt the deal — change of control clauses, unilateral termination rights, IP assignment gaps")

Template:
```
[Context: describe the corpus]
Build a workflow that [reads/analyzes every X in Y]
and [specific analytical goal — what to find, flag, or produce].
```

Avoid vague goals like "summarize everything." State what a good result looks like and what a bad result looks like — agents use this to calibrate output.

## Phase 2: Invoke and Monitor

Run via:
- `/workflows` command in Claude Code (requires a recent version)
- Inline in a prompt: include the phrase "build a workflow that..." naturally

Claude Code will display the workflow specification (agent roles, scope, execution plan) before agents begin. Review the spec — if the agent count or scope looks wrong, cancel and refine the prompt.

Progress appears as a structured log showing which agents are running, completed, and what they found. Expect batches of 5–15 agents at a time.

## Phase 3: Read the Output

Dynamic workflow outputs are structured around the analytical goal:
- Per-item findings (one entry per file/component/record examined)
- Cross-agent synthesis (findings that multiple agents identified independently)
- Gaps (items that could not be analyzed due to missing data or access)

If output is too large to review inline, ask Claude to write a structured summary to a file: "Summarize the workflow findings to `findings.md`, one section per finding type, with file-level citations."

## When to Iterate

If the first workflow pass surfaces a cluster of findings worth deeper investigation, run a second narrower workflow on just that subset:

```
Build a workflow that reads every file in [specific subfolder flagged in pass 1]
and produces a detailed risk report for each one, including exact clause text and page numbers.
```

This "nest and narrow" pattern keeps token costs proportional to actual risk depth.

## Verification

A well-invoked dynamic workflow will:
- Display a specification phase before execution begins (not jump straight to running agents)
- Show agent batch progress (queued → running → done)
- Produce output that cites specific files/records, not generalized summaries
- Surface gaps explicitly (files it could not access or parse)

If Claude Code does not enter workflow mode, check:
1. Is the Claude Code version up to date? (`/version`)
2. Does the prompt contain the word "workflow"?
3. Is the task scope large enough to justify multi-agent coordination?

## Source Attribution

Technique: Dynamic Workflow Orchestration in Claude Code
Source: Mark Kashef YouTube
URL: https://www.youtube.com/watch?v=-tLlZqrXpo8
Published: 2026-05-29
Title: "The Claude Update Everyone Missed (Dynamic Workflows)"
