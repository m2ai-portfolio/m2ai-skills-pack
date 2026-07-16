---
name: failure-mode-tool-router
description: Given any task description, classify it into the right AI tool category and explain why common alternatives are wrong for it. Prevents wasting time building agents for tasks that should use a different tool entirely.
---

# Failure-Mode Tool Router

Takes a task description and routes it to the correct AI tool category based on the failure modes of wrong-tool choices. Distinct from model routing (which picks the tier within a single provider) — this routes across tool categories and harness types.

## Trigger

Use when the user says "/failure-mode-tool-router", "which AI tool should I use for this", "should I build an agent or use ChatGPT", "is this a Claude Code task", "which harness for this", or when the user is uncertain whether to automate, use a chat interface, or build a custom agent.

## Phase 1: Intake

Collect from the user:
1. **Task description** — what is being done? One paragraph is ideal.
2. **Frequency** — one-time, recurring, or event-triggered?
3. **Inputs available** — what data is accessible and in what form?
4. **Stakes** — consequences if the output is wrong?

If the task description is too vague (under 2 sentences), ask: "Can you describe one real instance of this task from start to finish?"

## Phase 2: Classify Against Tool Categories

Evaluate the task against five categories. Pick the BEST fit, then name the top two wrong-tool failure modes.

### Category A: Scheduled / Repeating Automation

**Profile**: The task runs on a schedule or known trigger, produces structured output, crosses 2+ tools, follows a predictable path, and success criteria are pre-specifiable.

**Right tool**: A scheduled agent harness (n8n, Make, Workspace Agents, or a custom scheduled Claude Code agent).

**Do NOT use this for**: Novel research tasks, tasks requiring judgment on new information every run, or single-occurrence tasks.

### Category B: Novel Research and Synthesis

**Profile**: The task requires surfacing information that is new, unknown, or not in a structured database. Output quality depends on web freshness. Criteria: recent, sourced, synthesized.

**Right tool**: A research-oriented tool (Perplexity, search-augmented LLMs, AutoResearch agents, or Claude with web search MCP).

**Do NOT use this for**: Repeating ops tasks (use Category A), single polished documents (use Category C).

### Category C: Single Polished Artifact

**Profile**: One-time or rare task. The goal is a high-quality document, report, plan, or analysis that will be reviewed and edited by a human. Speed matters less than quality.

**Right tool**: A capable chat LLM with large context (Claude, GPT-4, Gemini) in an interactive session. No agent loop needed.

**Do NOT use this for**: Tasks that need to repeat (use Category A), tasks that need real-time data (use Category B).

### Category D: Long-Horizon Autonomous Execution

**Profile**: The task spans multiple hours or sessions, requires navigating ambiguity across many steps, and cannot be fully pre-specified. A human checking in periodically is acceptable.

**Right tool**: A long-context autonomous agent harness with human-in-the-loop gates (Claude Cowork, agentic IDE, or a fully-supervised agent run).

**Do NOT use this for**: Well-defined repeating ops (Category A), tasks requiring fresh research (Category B).

### Category E: Custom Code / Tool Build

**Profile**: The task produces a reusable artifact (tool, script, API, MCP server, database migration). Output must be technically correct, version-controlled, and maintainable. Failure means broken software.

**Right tool**: Claude Code (or equivalent code-first agent) with file system access, test running, and git integration.

**Do NOT use this for**: Document generation (Category C), ops automation where the output is a structured action rather than code (Category A).

## Phase 3: Anti-Recommendation

After picking the best category, explicitly state the top 2 wrong-tool choices and why they fail for this task.

Format:

```
Wrong tool 1: {tool name}
Why it fails: {one sentence — the specific failure mode}

Wrong tool 2: {tool name}
Why it fails: {one sentence — the specific failure mode}
```

Examples of failure modes:
- "Building a scheduled agent for novel research tasks leads to stale output — the agent's knowledge doesn't refresh."
- "Using an interactive chat for a daily ops task means it only runs when someone opens a browser."
- "Using a research tool for a coding task produces descriptions of code, not executable code."

## Phase 4: Output

```
TOOL ROUTING DECISION
=====================
Task: {one-line summary}

Best fit:    Category {A|B|C|D|E} — {category name}
Recommended: {specific tool or approach}
Rationale:   {one sentence}

Wrong-tool warnings:
  1. {tool} — {failure mode}
  2. {tool} — {failure mode}

Next step: {concrete action — e.g., "Run workflow-fit-scorer to confirm automation readiness" | "Start an interactive Claude session with large context" | "Set up a scheduled harness using the scheduled-agent-harness skill"}
```

## What This Does NOT Do

- Does not recommend a specific model tier within a tool. Use a model router for that.
- Does not evaluate cost. Use a cost model tool for budget-constrained decisions.
- Does not score the workflow's automation fit. Use a workflow fit scorer for that.
- Does not account for existing tool licenses or vendor lock-in — assumes access to all tools.

## Source

Framework extracted from Nate Kadlac newsletter (2026-04-27): "Your team spends 5 hours a week on work a sales consultant automated in an afternoon." Nate's anti-recommendation logic for Workspace Agents — explicitly steering users away from it when the workflow doesn't fit the 5 properties — is the seed for this generalized tool router.
