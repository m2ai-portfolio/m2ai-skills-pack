---
name: agent-standup
description: Run a structured standup across a multi-agent team. Each agent reports status (what completed since last standup), blockers, and next planned action. Produces a shared war-room log with cross-agent dependencies and escalations surfaced. Use when asking for a "standup", "team status check", "/standup", "war room update", "what are all my agents doing?", or "agent status report".
---

# Agent Standup — Multi-Agent War Room Status Check

A structured standup command that queries every active agent in your team, surfaces blockers and cross-agent dependencies, and writes a shared log entry. The war room pattern: agents don't just run in parallel — they report to a shared surface so the operator can see the whole picture at once.

## When to Invoke

- You want to know the status of all active agents at once
- You suspect blockers or dependency conflicts between agents
- Beginning or end of a work session ("what happened while I was away?")
- Before dispatching a new mission (check for capacity/conflict)

## Phase 1: Roster Discovery

Identify all active agents:

1. Read available agent configuration files (`agent.config.json`, `AGENT.md`, `ecosystem.config.cjs`, or equivalent in the project root).
2. If no config is present, ask the user to list their active agents by name and role.
3. For each agent, note: **name**, **role/specialty**, **last known status** (from logs, task queue, or prior standup log if one exists).

```
Active agents discovered:
- {agent-name}: {role} — last known: {idle / working on X / blocked}
- ...
```

## Phase 2: Per-Agent Status Query

For each agent in the roster, collect the three standup fields:

**Done** — what did this agent complete since the last standup (or since session start)?
- Source: task completion logs, git commits in the agent's worktree, or output files with recent timestamps

**Blocked** — is anything preventing this agent from making progress?
- Source: error logs, stalled task states, failed tool calls, missing dependencies

**Next** — what is the agent's next planned action?
- Source: queued tasks, pending subtask in the dependency DAG, or agent's stated intent if interactive

If an agent's state cannot be determined automatically, mark it as `UNKNOWN` and flag for manual check.

## Phase 3: Cross-Agent Dependency Check

After collecting individual reports, scan for:

1. **Dependency conflicts**: Agent A is waiting on output from Agent B, but Agent B is blocked or idle.
2. **Resource contention**: Two agents working in the same file, worktree, or database table simultaneously.
3. **Orphaned tasks**: Tasks queued but no agent assigned or capable of handling them.

```
Cross-agent issues:
- DEPENDENCY: {agent-A} waiting on {agent-B} → {agent-B status}
- CONTENTION: {agent-A} and {agent-B} both modifying {resource}
- ORPHAN: Task "{task}" has no assigned agent
```

## Phase 4: Standup Log Entry

Write the standup log to stdout (and optionally append to a local standup log file):

```markdown
## Standup — {YYYY-MM-DD HH:MM}

| Agent | Done | Blocked | Next |
|-------|------|---------|------|
| {name} | {summary} | {blocker or "none"} | {next action} |
| ... | ... | ... | ... |

### Escalations
{Any BLOCKER or DEPENDENCY issues that require operator action — if none, write "None."}

### Suggested actions
{1–3 concrete operator actions, if any — e.g., "Unblock {agent}: {what's needed}", "Reassign orphaned task X to {agent}"}
```

## Phase 5: Operator Decision Gate

Present the standup log and stop. Do not automatically reassign tasks or modify agent state.

The operator decides:
- **Approve** — standup noted, agents continue as-is
- **Reassign** — move a task from one agent to another
- **Unblock** — provide input or resource that unblocks a blocked agent
- **Pause** — suspend an agent's next action pending review
- **Dispatch** — add a new mission or task to the queue

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `log_to_file` | false | Append standup to a local `standup.log` file |
| `log_path` | `./standup.log` | Path for the log file if enabled |
| `include_unknowns` | true | Include agents with unknown status in the report |
| `escalate_blockers` | true | Surface blocked agents as escalations |

## Verification

- [ ] Every agent in the roster has a row in the standup table
- [ ] No agent row was silently skipped (UNKNOWN is a valid status)
- [ ] Cross-agent dependency check ran (not just per-agent reports)
- [ ] Escalation section is present (even if "None")
- [ ] Operator decision gate was reached — no automatic reassignments made

## Source

Mark Kashef — "This Claude Code Setup Runs My Entire Business" (2026-05-03)
https://www.youtube.com/watch?v=7aQbN543Mec

Core extraction: the War Room + `/standup` command pattern (timestamp 02:27). The shared war room surface provides a single log where every agent in the team reports status, blockers, and next actions simultaneously — analogous to a human team standup but queryable on demand. Transcript unavailable (HTTP 429); extraction based on video description and chapter timestamps.
