---
name: hive-mind-shared-context
description: Design a shared context store for a multi-agent team -- write policies, decay rules, pinning, and consolidation schedules -- so specialized agents can delegate to each other without losing state. Use when building a multi-agent system where agents need to share memory, designing memory decay and consolidation for an agent team, or wiring a routing layer over a group of specialized agents.
---

# Hive Mind Shared Context Designer

Produces a concrete shared context architecture for a team of specialized agents: store schema, write policies, decay rules, pinning criteria, and a consolidation schedule with implementation stubs.

## Trigger

Use when the user says "shared agent memory", "hive mind", "agents sharing context", "multi-agent shared state", "memory decay for agents", "agent team context store", "how do my agents share what they know", "build a command center for my agents", or "delegation between agents."

## Phase 1: Define the Agent Roster

Ask the user to list their active agents. For each, capture:

| Agent name | Role (one sentence) | Reads from shared context | Writes to shared context |
|-----------|---------------------|--------------------------|-------------------------|
| ...        | ...                 | ...                       | ...                     |

If the user has fewer than 2 agents, pause: the hive mind pattern adds complexity that a single agent does not need. Suggest the simpler memory-file approach for solo agents instead.

## Phase 2: Choose the Store Format

Select based on agent count and expected write rate:

| Team size | Writes per hour | Recommended store |
|-----------|----------------|-------------------|
| 2-4 agents | < 20 | Flat JSON file |
| 2-4 agents | 20-100 | SQLite table |
| 5+ agents | Any | SQLite + write queue |

Generate the store schema:

```json
{
  "schema_version": "1.0",
  "entries": [
    {
      "id": "uuid",
      "author": "agent-name",
      "category": "task-update | decision | fact | signal | question",
      "content": "...",
      "written_at": "ISO8601",
      "expires_at": "ISO8601 or null",
      "pinned": false,
      "relevance_tags": ["agent-name", "topic"]
    }
  ]
}
```

## Phase 3: Write Policies

For each agent, produce a write policy. Agents write facts and decisions -- not log noise:

```yaml
write_policy:
  agent: <name>
  writes_on: [task_complete, decision_made, error_encountered, user_request]
  categories_allowed: [task-update, decision, signal]
  max_entries_per_session: 20
  entry_format: "one sentence, active voice, present tense"
```

Reject policies that allow "write any output" -- they fill the store with garbage.

## Phase 4: Decay Rules

Define what expires and when. Decay is applied by the consolidation job, not by individual agents:

```yaml
decay:
  default_ttl_minutes: 30
  by_category:
    task-update: 30       # replaced quickly by the next status update
    signal: 60            # another agent may not have read it yet
    decision: null        # decisions do not expire by default
    fact: null            # facts do not expire by default
    question: 120         # unanswered after 2 hours, discard
  stale_threshold_hours: 4  # entries older than this are consolidation candidates
```

## Phase 5: Pinning Rules

Entries marked `pinned: true` survive all decay. Define pinning criteria:

```yaml
pinning:
  auto_pin_if:
    - category == "decision" AND referenced_by >= 2   # cross-agent decisions
    - content_prefix: "PINNED:"                       # agent self-pins by convention
  manual_pin: true         # human can pin any entry via the control interface
  max_pinned_entries: 50   # ceiling to prevent accumulation
```

## Phase 6: Consolidation Schedule

The consolidation job runs on a schedule and summarizes stale entries:

```yaml
consolidation:
  schedule: "every 30 minutes"
  also_trigger_if: "stale_count > 20"
  summary_prompt: |
    Summarize these {N} entries into one concise fact (2 sentences max).
    Preserve: decisions, outcomes, cross-agent dependencies.
    Drop: status updates no longer current, duplicates.
  output_category: fact
  output_pinned: false
  author: "consolidation-agent"
```

Consolidation script stub (Python, no external dependencies):

```python
# consolidate_hive.py -- run on schedule via cron or task scheduler
import json, datetime, uuid, os

STORE_PATH = os.environ.get("HIVE_STORE_PATH", "./hive-mind.json")
STALE_HOURS = int(os.environ.get("HIVE_STALE_HOURS", "4"))
MIN_TO_CONSOLIDATE = 5  # skip if fewer stale entries

def consolidate(llm_fn) -> None:
    with open(STORE_PATH) as f:
        store = json.load(f)

    now = datetime.datetime.utcnow()
    stale = [
        e for e in store["entries"]
        if not e["pinned"]
        and e["expires_at"] is not None
        and datetime.datetime.fromisoformat(e["expires_at"]) < now
    ]

    if len(stale) < MIN_TO_CONSOLIDATE:
        return

    summary = llm_fn("\n".join(e["content"] for e in stale))
    surviving = [e for e in store["entries"] if e not in stale]
    surviving.append({
        "id": str(uuid.uuid4()),
        "author": "consolidation-agent",
        "category": "fact",
        "content": summary,
        "written_at": now.isoformat(),
        "expires_at": None,
        "pinned": False,
        "relevance_tags": list({tag for e in stale for tag in e.get("relevance_tags", [])})
    })
    store["entries"] = surviving

    with open(STORE_PATH, "w") as f:
        json.dump(store, f, indent=2)
```

`HIVE_STORE_PATH` and `HIVE_STALE_HOURS` are env-configurable. No hardcoded personal paths.

## Phase 7: Output the Architecture Spec

Produce a complete spec the user can commit alongside their agent code:

```
Hive Mind Spec
==============
Agents: [N]
Store format: [JSON / SQLite] at $HIVE_STORE_PATH
Estimated write volume: [X entries/hr]
Decay TTL (default): 30 min (category overrides listed)
Pinned ceiling: 50 entries
Consolidation: every 30 min OR when stale_count > 20

Agent roster and write policies:
[table from Phase 1 + Phase 3]

Files to create:
- hive-mind.json     -- initial empty store (schema_version 1.0)
- consolidate_hive.py -- run via cron or scheduler
- [per-agent read stub] -- inject shared context at agent session start
```

## Verification

- [ ] Every agent has a write policy -- no "write anything" entries exist
- [ ] All 5 entry categories have an explicit decay TTL (null counts if intentional)
- [ ] Pinned ceiling defined (prevents unbounded accumulation)
- [ ] Consolidation schedule is more frequent than the slowest agent's read cycle
- [ ] Store path is env-configurable (`HIVE_STORE_PATH`) -- no hardcoded absolute paths
- [ ] Consolidation script is a no-op when stale count is below the minimum threshold
- [ ] Spec document is saved to a path the user confirms, not assumed

## Source

Mark Kashef -- "I Replaced OpenClaw and Hermes With This Claude Code Setup" (YouTube, 2026-04-14). Video ID: `rVzGu5OYYS0`. Core pattern: five specialized agents share a single context store with automatic memory decay and consolidation every 30 minutes, enabling delegation without state loss.
