---
name: aar
description: Run an After-Action Review on an agent dispatch run, build execution, or multi-step orchestrated operation. Gathers forensics across the orchestrator DB, A2A endpoints, pm2 logs, git history, and queue files; classifies failure modes; captures benchmarks; produces a structured AAR. Use when the user says "aar", "after action review", "let's review what happened", "review this run", or after any dispatch that produced mixed results worth learning from.
---

# After-Action Review (AAR)

Structured review for agent dispatch runs, build executions, or any multi-step operation that produced data worth learning from. Not a generic post-mortem — this is tuned to orchestrated agent systems with a mission/task DB, A2A endpoints, and a queue file.

## When to invoke

- After a task batch completes (even partial success)
- After any dispatch run where the user wants to understand what happened
- When the user says: "aar", "after-action review", "let's review", "what went wrong with that run", "review the dispatch"
- Proactively: after any agent run where >30% of tasks failed, OR any run that produced a WIP auto-snapshot, OR any time a git reset was used to recover

## Input

One of:
- A parent task id (walk its descendants)
- A time window (e.g. "last 2 hours")
- "this session" (walk all tasks created since session start)

Ask once which one, default to "this session" if unclear.

## Phase 1: Gather forensics

Run these in parallel where possible. Never skip a source — missing data is the most common cause of a shallow AAR.

### Mission task state (primary source)

Query the orchestrator's task DB (path in `$ORCHESTRATOR_DB`). Example with better-sqlite3:

```bash
node -e "
const Database = require('better-sqlite3');
const db = new Database(process.env.ORCHESTRATOR_DB, {readonly: true});
// status, result, error, runtime, claimed_at
// Use WHERE created_at > <unix_ts> OR parent id
"
```

Capture: status, error, result (first 500 chars), runtime (completed_at - claimed_at), agent_id, title.

### A2A task logs (per agent)

For each task still queryable in the A2A task store:
```bash
curl -s "http://localhost:<agent_port>/task/<task_id>" | python3 -m json.tool
```

Agent ports are whatever your orchestrator exposes. Logs often expire after task completion — if empty, move on, don't block.

### pm2 logs (last N lines)

```bash
pm2 logs <orchestrator-process> --lines 80 --nostream
pm2 logs <agent-process> --lines 40 --nostream
```

Grep for the task id or the failure window timestamps. Watch for dispatcher events.

### Git history of affected repos

```bash
git -C <repo> log --oneline -20
git -C <repo> status --short -b
```

Flag any `WIP: auto-snapshot` commits in the window — if you run a periodic auto-snapshot cron, these often indicate interrupted agent work. Check if they're pushed (ahead 0 = pushed, ahead N = local-only).

### Queue state

If you maintain a queue file (path in `$OPEN_ITEMS_JSON`):
```bash
python3 -c "import json, os; d=json.load(open(os.environ['OPEN_ITEMS_JSON'])); ..."
```

Cross-reference: did the tasks map back to queue items? Are statuses consistent (pending/dispatched/in_progress)?

### Running processes (if the user reports "still running" or the runtime seems stuck)

```bash
pgrep -af "claude --dangerously"
```

Subprocess gone but status=running in DB = stuck executor, diagnose A2A state machine.

## Phase 2: Classify failures

Use these dispatch-specific failure modes, in order of specificity:

| Mode | Signature |
|---|---|
| `max_turns` | error contains "Reached max turns". Turn cap too low for task scope. |
| `timeout` | runtime > 0.9 * agent timeout (usually 900s). Task wall-clock exceeded. |
| `subprocess_crash` | Non-zero exit code, error mentions signal/SIGTERM/OOM. |
| `wip_snapshot_collision` | A `WIP: auto-snapshot` commit lands during the task window, mixing multiple agents' edits. |
| `node_modules_corruption` | `npm install` exited mid-run inside agent subprocess. Missing binaries in `.bin/`. |
| `race_condition` | Multiple agents wrote the same file within seconds of each other. Git blame shows interleaved authorship. |
| `scope_mismatch` | Task scope (multi-day subsystem) too large for the dispatched agent's turn/time budget. |
| `skipped_step` | Agent's result text shows steps it didn't actually execute (check by inspecting side effects). |
| `dispatch_layer_ok_exec_layer_failed` | Planner/coordinator succeeded but downstream executors failed. Separates "dispatch machinery" health from "execution machinery" health. |

Every failure should map to at least one mode. Multiple can apply.

## Phase 3: Capture benchmarks

Every AAR produces durable benchmark data. Record:

- Per-agent: typical runtime for single-file task, turn-to-wallclock ratio, max turns used
- Queue-to-claimed latency (dispatcher poll interval * N)
- Per-task type: success rate, median runtime
- Identify the "sweet spot task size" for each agent (the shape that consistently completes under budget)

If you maintain per-agent feedback memory files (e.g. `feedback_<agent>_task_sizing.md`), update the existing one — don't create duplicates.

## Phase 4: Write the AAR

Structure (stick to this — don't invent new sections):

1. **What happened** — one paragraph, facts only, no interpretation
2. **What worked** — 3-5 concrete items, each with evidence
3. **What didn't work** — 3-5 concrete items, each classified by failure mode from Phase 2
4. **Root cause** — the one or two architectural/process gaps that explain the failures
5. **Benchmark data** — table of metrics captured
6. **What the user could have done differently** — honest, includes "nothing, the gap was in the system" when true
7. **Tools / skills / fixes needed** — ranked by payoff, S/M/L complexity, estimated time
8. **Action items** — concrete next steps, ideally add to the queue as new entries with `source: aar-<date>`

## Phase 5: Persist

1. Save AAR to `$VAULT_DIR/projects/<project-or-topic>-aar-YYYY-MM-DD.md` (or `$VAULT_DIR/daily/YYYY-MM-DD-aar-<topic>.md` if no clear project). If `$VAULT_DIR` is unset, save to `./aar-YYYY-MM-DD.md`.
2. If you maintain a durable memory system, write up to 2-3 feedback memory entries for durable lessons. Each one must have a clear **Why:** and **How to apply:**.
3. Update the memory index if applicable.
4. If the user explicitly asks: append action items to the queue file (`$OPEN_ITEMS_JSON`) with `source: aar-YYYY-MM-DD`. Never add them without asking — AARs sometimes produce speculative items that shouldn't queue immediately.
5. Optionally push the AAR to your cross-session context store.

## Anti-patterns (don't do these)

- Don't write an AAR from memory alone. Always gather forensics first. Shallow AARs are worse than no AAR.
- Don't classify every failure as "the agent was dumb." The failure mode is usually in the system (turn caps, missing isolation, missing gates), not the model's reasoning.
- Don't pile action items without priority. If everything is "high", nothing is.
- Don't duplicate existing feedback memories. Update the one that already exists when the new lesson is an extension.
- Don't auto-dispatch AAR action items. AARs often reveal that the dispatch system itself is the problem — dispatching more work through it amplifies the bug.

## Configuration

This skill assumes an orchestrated agent system. Set these env vars (or inline the paths at invocation time):

| Variable | Purpose | Example |
|---|---|---|
| `$ORCHESTRATOR_DB` | SQLite DB holding mission/task state | `~/projects/your-orchestrator/store/tasks.db` |
| `$OPEN_ITEMS_JSON` | Optional queue file for action-item append | `~/projects/your-queue/open_items.json` |
| `$VAULT_DIR` | Where AAR markdown gets saved | `~/vault` |

The feedback-memory write step (Phase 5 step 2) assumes you maintain a `feedback_*.md` memory convention. If you don't, skip it and keep the lessons in the AAR doc itself.

## Example invocation

User: "Let's AAR this dispatch run."
→ Ask: "Which scope — the parent task id, a time window, or this session?"
→ Gather forensics for that scope (all five sources above)
→ Classify every failed task by mode
→ Capture benchmarks (don't skip even if numbers feel obvious)
→ Write the AAR using the 8-section structure
→ Save to the configured vault, write feedback memories if applicable
→ Report: file path of the saved AAR, count of feedback memories written, count of action items (if the user asked to queue them)
