---
name: decompose-goal
description: Decompose a free-text goal into an ordered list of atomic, dispatchable subtasks for any downstream executor — Claude Code subagents, Agent Teams, mission-dispatch systems, workflow/DAG engines (LangGraph, CrewAI, n8n), headless cron runs, or human checklists. Use when the user says "decompose this goal", "break this into subtasks", "split this mission", "flatten this for dispatch", "turn this into a runnable task list", or whenever a multi-step instruction needs atomization before handing off to any orchestrator or agent system. Default output is a numbered markdown list headed "Atomic subtasks (N):"; JSON mode and dependency annotations are available on request.
---

# decompose-goal — Goal → atomic subtasks

**DO NOT** invent steps the goal doesn't imply. **DO NOT** merge two distinct
actions into a single subtask. Decomposition must be faithful — every step in
the goal becomes exactly one entry; nothing more, nothing less.

## Purpose

Goals arrive as one paragraph of imperative prose ("Search Gmail, if found
extract body, write to markdown, halt if not"). Every dispatch system — an
agent taking turns, a workflow engine scheduling nodes, a human working a
checklist — executes best when each unit of work is a single atomic action
with a clear done-state. This skill is the flattener between free-text goals
and any of those executors.

This skill sits DOWNSTREAM of `goal-maker` (which turns a fuzzy idea into a
well-formed goal + execution shape) and pairs with `prompt-rewriter` (which
cleans up the system prompt for an agent). goal-maker produces the goal;
decompose-goal atomizes it into subtasks.

## Step 1 — Resolve the executor profile

What "atomic" means depends on who runs the subtask. If the request names a
target system, size subtasks to its unit of execution:

| Executor | Atomic unit |
|----------|-------------|
| Agent turn (**default** when unstated) | One action completable in a single agent turn: one search, one file write, one command run |
| Workflow / DAG node | One node's worth: a tight read→transform→write on a single artifact may stay together |
| Headless cron run | One non-interactive command sequence with a single success/failure exit |
| Human checklist | One uninterrupted physical/manual action |

Don't ask the user which profile applies — infer it from the request, default
to agent-turn granularity, and note the assumption only if it materially
changed the split.

## Step 2 — Decompose, using the verification litmus test

For each candidate subtask, ask: *can you state in one sentence how an
observer would verify it succeeded?* (A concrete observable outcome — a file
exists, a command exited 0, a value was captured — not a restatement of the
action.) If you cannot articulate verification, the subtask is still compound:
decompose further.

This test runs in your head. Don't emit verification lines in the default
output — they only appear in JSON mode (always) or when the user asks for
them.

## Output contract — markdown (default)

Numbered list, one subtask per line. Each subtask:

1. Starts with an imperative verb (Search, Read, Write, Run, Halt, Output).
2. Names every concrete artifact it touches (file path, URL, env var).
3. Includes any `[NO_ACTION]` / `[HALT]` short-circuit conditions inline.
4. Does not chain with "and" or "then" — split those into separate entries.

Prefix the list with one line: **`Atomic subtasks (N):`** so the dispatcher
can count without parsing. Output only the header and the list — no preamble,
no commentary.

## Optional: dependency annotations (opt-in)

When the user asks ("with dependencies", "as a DAG") or the executor profile
is a DAG/workflow engine, append `[after: N]` or `[after: N, M]` to any
subtask that must wait for earlier ones. **Semantics in this mode:** a line
*without* an annotation has no dependencies and may start immediately; do not
assume sequential order. This lets the scheduler run independent branches in
parallel. In the default (un-annotated) mode, the list is strictly
sequential — annotations and sequential defaults never mix in one output.

## Optional: JSON mode (opt-in)

When the user asks for JSON (or the consumer is programmatic), emit exactly
one fenced `json` block, nothing else:

```json
{
  "goal": "<the original goal, verbatim or tightly summarized>",
  "count": 5,
  "subtasks": [
    {
      "id": 1,
      "action": "Search Gmail for \"from:X received-today\" — capture thread ID + subject.",
      "artifacts": ["gmail:from:X"],
      "halt_condition": null,
      "depends_on": [],
      "verify": "A thread ID and subject string are captured, or the search returned zero results."
    },
    {
      "id": 2,
      "action": "If no thread was found, output [NO_ACTION] and halt.",
      "artifacts": [],
      "halt_condition": "[NO_ACTION]",
      "depends_on": [1],
      "verify": "Either [NO_ACTION] was emitted and execution stopped, or a thread exists and execution continued."
    }
  ]
}
```

Field rules: `count` must equal `subtasks.length`. `depends_on` is always
present (`[]` = may start immediately). `halt_condition` is the literal token
emitted on short-circuit, or `null`. `verify` is required — it is the same
sentence you formed during the litmus test in Step 2.

## Worked shape (default markdown)

Input: `"Search Gmail for X today. If none, output [NO_ACTION]. If found, read body, fetch any linked Substack URLs, write extraction to /path/<date>.md."`

Output:
```
Atomic subtasks (5):
1. Search Gmail for "from:X received-today" — capture thread ID + subject.
2. If no thread, output [NO_ACTION] and halt.
3. Read full body of found thread; capture text + every outbound URL.
4. For each Substack URL in body, fetch the page text.
5. Write combined extraction (body + page texts) to /path/<date>.md.
```

## Output contract stability

Headless and automated consumers parse the default markdown contract directly:
a single `Atomic subtasks (N):` line followed by numbered imperative lines. If
you wire this skill into a cron, pipeline, or scripted parser, treat that shape
as a stable contract — any change to the default output must preserve it.
