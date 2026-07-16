---
name: agent-run-schema
description: Reference skill containing the canonical 10-event agent analytics schema. Defines event shapes (agent_run_started, task_completed, user_correction_submitted, approval_granted, approval_denied, tool_call_failed, memory_miss, run_completed, run_failed, run_aborted) with a shared agent_run_id field that joins every event for a run. Use when wiring observability into an agent pipeline, designing a logging sink, or asking "what events should my agent emit?"
---

# Agent Run Schema

A language-agnostic event schema for agent observability. Every event carries a shared `agent_run_id` so events across tools, approvals, memory, and corrections can be joined into a single run timeline.

Solves the "dashboard green, run broken" problem: aggregate completion counts hide per-run failure modes. Emitting structured events lets any analytics sink — SQLite, Postgres, a log stream — reconstruct what actually happened inside a run.

## When to Invoke

- Adding observability to an agent pipeline from scratch
- Asking "what events should my agent emit to make it debuggable?"
- Designing a logging sink that multiple agents will write to
- Prototyping a corrections-to-evals pipeline that needs `user_correction_submitted`
- Any tool call that adds event emission code to an agent

## The 10 Canonical Events

### 1. `agent_run_started`

Emitted when the agent begins executing a user request or scheduled task.

```typescript
{
  event: "agent_run_started",
  agent_run_id: string,   // UUID, shared across all events for this run
  agent_id: string,       // identifies the agent type/name
  workflow_type: string,  // e.g. "code-review", "email-draft"
  triggered_by: "human" | "schedule" | "upstream_agent",
  ts: string              // ISO 8601
}
```

### 2. `task_started`

Emitted when the agent picks up an individual subtask within the run.

```typescript
{
  event: "task_started",
  agent_run_id: string,
  task_id: string,
  task_type: string,
  ts: string
}
```

### 3. `task_completed`

Emitted when the agent self-reports a subtask as done. NOT equivalent to the output being accepted.

```typescript
{
  event: "task_completed",
  agent_run_id: string,
  task_id: string,
  duration_ms: number,
  acceptance_criteria_attached: boolean,  // was an explicit acceptance criterion specified?
  ts: string
}
```

### 4. `user_correction_submitted`

Emitted when the user sends a follow-up message that corrects or rejects the agent's output. This is the canonical "not accepted" signal.

```typescript
{
  event: "user_correction_submitted",
  agent_run_id: string,
  task_id: string | null,
  correction_category: "factual" | "format" | "scope" | "tone" | "safety" | "other",
  correction_text: string,  // the user's correction message
  ts: string
}
```

### 5. `approval_granted`

Emitted when a human-in-the-loop gate is passed.

```typescript
{
  event: "approval_granted",
  agent_run_id: string,
  gate_id: string,
  reviewer_id: string | null,
  ts: string
}
```

### 6. `approval_denied`

Emitted when a human-in-the-loop gate is rejected.

```typescript
{
  event: "approval_denied",
  agent_run_id: string,
  gate_id: string,
  reason: string | null,
  ts: string
}
```

### 7. `tool_call_failed`

Emitted when any tool call returns an error or produces no output when output was expected.

```typescript
{
  event: "tool_call_failed",
  agent_run_id: string,
  tool_name: string,
  error_code: string | null,
  retried: boolean,
  ts: string
}
```

### 8. `memory_miss`

Emitted when the agent attempts to retrieve context that should be in memory but returns empty or stale.

```typescript
{
  event: "memory_miss",
  agent_run_id: string,
  memory_key: string,
  expected_freshness_s: number | null,
  ts: string
}
```

### 9. `run_completed`

Emitted when the agent concludes the full run successfully.

```typescript
{
  event: "run_completed",
  agent_run_id: string,
  total_tasks: number,
  accepted_tasks: number | null,
  duration_ms: number,
  ts: string
}
```

### 10. `run_failed`

Emitted when the run terminates in an unrecoverable error.

```typescript
{
  event: "run_failed",
  agent_run_id: string,
  error_code: string,
  last_task_id: string | null,
  ts: string
}
```

## Minimal Implementation (TypeScript)

```typescript
import { randomUUID } from "crypto";

type AgentEvent =
  | { event: "agent_run_started"; agent_run_id: string; agent_id: string; workflow_type: string; triggered_by: string; ts: string }
  | { event: "task_completed"; agent_run_id: string; task_id: string; duration_ms: number; acceptance_criteria_attached: boolean; ts: string }
  | { event: "user_correction_submitted"; agent_run_id: string; task_id: string | null; correction_category: string; correction_text: string; ts: string }
  // ... remaining events

function emit(sink: (e: AgentEvent) => void, event: AgentEvent) {
  sink(event);
}

// Usage
const runId = randomUUID();
emit(consoleSink, {
  event: "agent_run_started",
  agent_run_id: runId,
  agent_id: "my-agent",
  workflow_type: "email-draft",
  triggered_by: "human",
  ts: new Date().toISOString(),
});
```

## Minimal Implementation (Python)

```python
import uuid, datetime, json

def emit(sink, event: dict):
    sink(event)

run_id = str(uuid.uuid4())
emit(print, {
    "event": "agent_run_started",
    "agent_run_id": run_id,
    "agent_id": "my-agent",
    "workflow_type": "email-draft",
    "triggered_by": "human",
    "ts": datetime.datetime.utcnow().isoformat() + "Z",
})
```

## SQLite Sink (single table)

```sql
CREATE TABLE agent_events (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  event    TEXT    NOT NULL,
  run_id   TEXT    NOT NULL,
  payload  TEXT    NOT NULL,  -- full JSON blob
  ts       TEXT    NOT NULL
);
CREATE INDEX idx_run_id ON agent_events(run_id);
CREATE INDEX idx_event  ON agent_events(event);
```

Store the full event as JSON in `payload`; index on `run_id` and `event` to reconstruct timelines and filter by event type.

## Verification

- [ ] Every emitted event carries an `agent_run_id` matching the session-start event
- [ ] `task_completed` and `user_correction_submitted` events share a `task_id` when a correction follows a completion
- [ ] `run_completed` is emitted only once per run; `run_failed` and `run_completed` are mutually exclusive for the same `agent_run_id`
- [ ] The sink can reconstruct a full run timeline from `SELECT * WHERE run_id = ?` ordered by `ts`

## Notes

The schema is intentionally minimal. `correction_text` on `user_correction_submitted` should be stripped of PII before reaching a shared analytics sink. The `acceptance_criteria_attached` flag on `task_completed` is a lightweight proxy for whether the agent was operating with explicit acceptance criteria — tasks without attached criteria that receive corrections are the highest-signal training examples for an evals pipeline.

## Source

Nate's Newsletter (natesnewsletter@substack.com), 2026-05-28:
*"Your agent dashboard is green. The run underneath it is where the work actually broke."*

Idea #2 — `agent-run-schema` reference skill. Nate's framing: "ship three run-level events tied to a shared agent_run_id, expand to a 10-event agent-analytics schema."
