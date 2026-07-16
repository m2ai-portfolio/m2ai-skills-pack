---
name: agent-correction-capture
description: Document and implement the pattern for capturing user corrections to agent output as structured events (user_correction_submitted). Use when building any agent-facing UI, CLI, or chat interface where you want corrections to flow into an evaluation or feedback pipeline rather than being silently discarded.
---

# Agent Correction Capture

When a user corrects an agent — rewrites its output, says "no, that's wrong", edits a generated artifact, or re-assigns the task — that correction is the highest-quality signal the system will ever produce about where the agent fails. In most systems, that signal is silently discarded.

This skill documents the `user_correction_submitted` event pattern: how to capture corrections at the UI/CLI/chat layer and emit them as structured events that any downstream pipeline (evals, feedback loops, quality reporting) can consume.

This is the upstream choke point. Without it, corrections-to-evals pipelines and acceptance-rate analytics have no input.

## Trigger

Use when the user:
- Says "correction capture", "capture user corrections", "user_correction_submitted", "/agent-correction-capture"
- Is building an agent-facing UI and wants to close the feedback loop
- Is setting up an eval pipeline and needs structured correction input
- Wants to understand why acceptance rate is hard to measure

## Phase 1: Identify Correction Surfaces

A correction can arrive through several surfaces. Identify which ones the current system exposes:

| Surface | Correction signal | Capture mechanism |
|---------|------------------|-------------------|
| Web UI chat | User sends a follow-up message that contradicts or rewrites the agent's last turn | Detect in message handler: if prior turn was agent-authored and current turn starts with correction markers |
| Web UI inline edit | User edits the agent's generated artifact directly in the UI | `onChange` handler on the editable artifact component |
| CLI | User types a follow-up command that re-scopes or negates the prior agent output | Hook into the prompt-submission path |
| HIL approval gate | User rejects or modifies a proposed action before the agent executes | Capture on the rejection/modification event |
| Async review | User reviews a completed artifact after the fact and marks it as needing revision | Explicit "flag for correction" button or API call |

## Phase 2: Event Schema

Emit a `user_correction_submitted` event with this payload:

```typescript
interface UserCorrectionSubmitted {
  event_type: "user_correction_submitted";
  agent_run_id: string;        // links to the run that produced the incorrect output
  task_id?: string;            // optional: the specific task within the run
  correction_surface: "chat" | "inline_edit" | "cli" | "hil_gate" | "async_review";
  correction_text?: string;    // the user's correction or rewrite (may be omitted for privacy)
  original_output_ref?: string; // reference to the agent output being corrected
  severity?: "minor" | "major" | "reject";  // how wrong was it?
  timestamp: string;           // ISO 8601
  session_id?: string;
}
```

The `agent_run_id` is the critical join key. Without it, you cannot link the correction back to what caused it.

## Phase 3: Capture Patterns by Surface

### Chat / Conversational UI

```typescript
function handleUserMessage(msg: Message, conversationHistory: Message[]) {
  const lastAgentTurn = conversationHistory
    .filter(m => m.role === "assistant")
    .at(-1);

  if (lastAgentTurn && isCorrectionMarker(msg.content)) {
    emitEvent({
      event_type: "user_correction_submitted",
      agent_run_id: lastAgentTurn.metadata?.agent_run_id,
      correction_surface: "chat",
      correction_text: msg.content,
      severity: inferSeverity(msg.content),
      timestamp: new Date().toISOString(),
    });
  }
}

function isCorrectionMarker(text: string): boolean {
  const markers = [
    /^no[,.]?\s/i, /^that('s| is) (wrong|incorrect|not right)/i,
    /^actually[,]/i, /^fix /i, /^redo /i, /^try again/i,
    /^not what i (asked|wanted|meant)/i,
  ];
  return markers.some(p => p.test(text.trim()));
}
```

Heuristic-based capture is imprecise. Prefer explicit correction UI (see HIL gate pattern) when possible.

### Inline Edit (Web UI)

```typescript
function handleArtifactEdit(
  artifactId: string,
  agentRunId: string,
  original: string,
  edited: string
) {
  if (original !== edited) {
    emitEvent({
      event_type: "user_correction_submitted",
      agent_run_id: agentRunId,
      correction_surface: "inline_edit",
      // omit correction_text if content may be sensitive
      severity: editDistance(original, edited) > 0.3 ? "major" : "minor",
      original_output_ref: artifactId,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### HIL Approval Gate

```typescript
function handleHILDecision(
  decision: "approve" | "reject" | "modify",
  proposedAction: AgentAction,
  modifiedAction?: AgentAction
) {
  if (decision === "reject" || decision === "modify") {
    emitEvent({
      event_type: "user_correction_submitted",
      agent_run_id: proposedAction.agent_run_id,
      correction_surface: "hil_gate",
      correction_text: decision === "modify"
        ? JSON.stringify(modifiedAction)
        : "rejected without replacement",
      severity: decision === "reject" ? "reject" : "major",
      timestamp: new Date().toISOString(),
    });
  }
}
```

HIL gate corrections are the highest-quality signal: the human saw the action before it executed and said no. Prioritize these in eval pipelines.

## Phase 4: Emission and Storage

Emit events to whichever analytics sink the system uses:

```typescript
async function emitEvent(event: UserCorrectionSubmitted) {
  // Option A: append to a local JSONL file
  fs.appendFileSync("agent-corrections.jsonl", JSON.stringify(event) + "\n");

  // Option B: POST to an analytics endpoint
  await fetch(process.env.ANALYTICS_ENDPOINT + "/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });

  // Option C: insert into SQLite
  db.prepare(
    "INSERT INTO agent_events (event_type, payload, created_at) VALUES (?, ?, ?)"
  ).run(event.event_type, JSON.stringify(event), event.timestamp);
}
```

Use whichever option fits the project's existing analytics infrastructure. All three are valid starting points.

## Phase 5: Downstream Handoff

Once corrections are captured as events, downstream consumers can:
- **Eval generation**: convert each correction into an eval case (original prompt + agent output + human correction = input/expected-output pair)
- **Acceptance rate**: subtract corrections from completion count to compute real acceptance rate
- **Error pattern clustering**: group corrections by type/task to find systemic agent failures
- **Feedback loop**: periodically replay corrections in agent system-prompt examples

Document which downstream system(s) consume the event store and at what cadence.

## Verification

A good correction-capture implementation:
- Attaches `agent_run_id` to every event — without it the correction is a data island
- Does NOT only capture chat-surface corrections — HIL gate rejections and inline edits are higher-quality and often missed
- Stores `severity` so downstream can triage minor word-choice fixes from outright rejections
- Has a privacy review: decide whether `correction_text` is stored, anonymized, or omitted before shipping

## Source

Extracted from Nate's Newsletter (natesnewsletter@substack.com), 2026-05-28.
Article: "Your agent dashboard is green. The run underneath it is where the work actually broke."
Technique: user_correction_submitted event pattern for closing the agent feedback loop.
