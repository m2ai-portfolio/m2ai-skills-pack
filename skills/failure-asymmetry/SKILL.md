---
name: failure-asymmetry
description: Compare a skill's behavior under human invocation vs simulated agent invocation, highlighting divergences in output format, context assumptions, and error paths that only surface without human oversight.
---

# Failure Asymmetry Analyzer

Skills that work perfectly when a human invokes them can fail silently when an agent invokes them autonomously. This skill finds those divergences before they cause production failures.

## Trigger

Use when the user says "failure asymmetry", "does this skill work for agents", "test this skill for autonomous use", "human vs agent test", "will this break without me", or when preparing a skill for use in scheduled tasks, mission delegation, or agent-to-agent invocation.

## Phase 1: Intake

Accept the target skill:
- A skill name (look it up in `~/.claude/skills/<name>/SKILL.md`)
- A file path to a SKILL.md
- Pasted skill content

Read the full SKILL.md and identify:
- All phases/steps
- Input requirements (explicit and implicit)
- Output format
- Error handling (or lack thereof)
- Any interactive elements (questions to user, confirmations, choices)

## Phase 2: Human Invocation Profile

Model how this skill behaves when a human invokes it via slash command:

1. **Context available**: The human has session context, can clarify ambiguity, can provide missing inputs on the fly
2. **Output consumption**: Human reads the output, interprets formatting, ignores minor issues
3. **Error recovery**: Human sees errors, retries, adjusts input, works around failures
4. **Implicit assumptions**: List everything the skill assumes a human will provide or handle

Document as:
```
HUMAN INVOCATION PROFILE
- Inputs provided by human: [list]
- Context assumed present: [list]
- Errors human would catch: [list]
- Output interpreted by: human (flexible parsing)
```

## Phase 3: Agent Invocation Profile

Model how this skill behaves when an orchestrator agent invokes it autonomously:

1. **Context available**: Agent has only what's in the prompt/task description -- no session history, no ability to "just know" what the user meant
2. **Output consumption**: Agent parses output programmatically -- formatting inconsistencies break downstream processing
3. **Error recovery**: Agent either retries blindly, skips, or halts -- no creative workarounds
4. **Missing inputs**: Agent cannot ask clarifying questions mid-execution

Document as:
```
AGENT INVOCATION PROFILE
- Inputs agent must provide upfront: [list]
- Context agent lacks: [list]
- Errors agent cannot recover from: [list]
- Output format requirements: [structured/unstructured, parseable?]
```

## Phase 4: Divergence Analysis

Compare the two profiles and flag divergences across 5 categories:

### 1. Input Gaps
Inputs the skill expects but only a human would know to provide.
- Severity: CRITICAL (skill fails) / WARNING (skill produces wrong output) / INFO (minor quality loss)

### 2. Context Assumptions
Session context, file state, or environmental assumptions that hold for humans but not agents.
- Example: "skill reads the current file" -- but agent may not have a file open

### 3. Output Format Drift
Cases where the skill's output format varies based on input, making agent parsing unreliable.
- Example: sometimes returns a table, sometimes returns prose

### 4. Interactive Dependencies
Points where the skill asks the user a question or waits for confirmation.
- Every interactive point is a CRITICAL failure for agent invocation

### 5. Silent Failure Paths
Error conditions where the skill produces output that looks correct but is wrong/incomplete.
- Example: skill catches an exception and returns a default value instead of failing loudly

## Phase 5: Report

Present findings as:

```
FAILURE ASYMMETRY REPORT
========================
Skill: <name>
Agent-Readiness Score: [X/10]

CRITICAL (will break):
- [finding 1]
- [finding 2]

WARNING (may produce wrong output):
- [finding 1]

INFO (minor quality loss):
- [finding 1]

RECOMMENDED FIXES:
1. [specific fix for each CRITICAL finding]
2. [specific fix for each WARNING finding]
```

## Phase 6: Fix Suggestions

For each CRITICAL and WARNING finding, provide a concrete fix:
- For input gaps: add default values or make the skill fail explicitly with a clear error message
- For context assumptions: add a phase that checks/gathers required context before proceeding
- For output format drift: standardize output to a single parseable format
- For interactive dependencies: replace with defaults or make the interaction optional (skip if no human present)
- For silent failures: convert to loud failures with error codes

Do NOT auto-apply fixes. Present them for the user to review.

## Relationship to Other Skills

- **spec-gap-detector**: Tests specs for ambiguity in general. Failure-asymmetry specifically tests the human-vs-agent invocation gap.
- **silent-failure-hunter** (plugin): Finds silent failures in code. Failure-asymmetry finds silent failures specific to the human/agent context switch.

## Source Attribution

Technique: Failure Asymmetry Analysis (human vs agent invocation divergence)
Source: Nate's Newsletter (natesnewsletter@substack.com), 2026-03-30
Post: "Your Best AI Work Vanishes Every Session. 4 Prompts That Make It Permanent"
