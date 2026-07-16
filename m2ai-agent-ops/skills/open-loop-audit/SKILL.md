---
name: open-loop-audit
description: Audit open loops and classify each as real delegation candidate vs simulated work using Nate's "land or leave" framework
---

# Open Loop Audit

Scan your open loops (tasks, commitments, recurring work) and classify each as **real delegation** (work that leaves your desk) vs **simulated work** (work that lands back on it).

## When to trigger

- User says "audit my loops", "what should I delegate", "what's simulated work", "open loop audit"
- Periodic review of task lists, agent outputs, or automation candidates

## Phases

### Phase 1 — Gather Open Loops

Collect open loops from all available sources:

1. **Obsidian vault** — scan for unchecked tasks (`- [ ]`), open projects, recurring notes
2. **Notion** — check task databases and project boards if connected
3. **Calendar** — look for recurring meetings that generate follow-up work
4. **Agent fleet** — review scheduled tasks and their outputs (the agent platform scheduled tasks, cron jobs)
5. **Git** — open PRs, stale branches, unresolved issues

Deduplicate and compile into a single list.

### Phase 2 — Classify Each Loop

For each open loop, apply the **Land or Leave test**:

| Question | Real Delegation | Simulated Work |
|----------|----------------|----------------|
| Does completing this remove work from your plate? | Yes - it's gone | No - it creates a report/summary you still have to read |
| Does it close a loop with an external party? | Yes - email sent, PR merged, invoice paid | No - internal document that sits in a folder |
| Could you forget about it after delegating? | Yes - it's truly off your desk | No - you'll check the output and redo parts of it |
| Does the output go to someone else? | Yes - client, teammate, vendor | No - it comes back to you |

Classify as:
- **DELEGATE** — real delegation candidate, work leaves your desk
- **SIMULATED** — looks productive but lands back on you
- **HYBRID** — partially delegatable, needs decomposition

### Phase 3 — Prioritize Delegation Candidates

Rank DELEGATE items by:
1. **Frequency** — how often does this recur?
2. **Time cost** — how long does it take you each time?
3. **Agent-readiness** — can an existing agent/tool handle this now?
4. **Risk** — what's the cost of a bad delegation?

### Phase 4 — Report

Output format:

```
## Open Loop Audit — [DATE]

### Ready to Delegate (LEAVE your desk)
- [ ] [Task] — [Agent/tool that could handle it] — [Est. time saved/week]

### Simulated Work (LANDS on your desk)
- [Task] — [Why it's simulated] — [Could it be restructured?]

### Hybrid (Needs decomposition)
- [Task] — [Delegatable part] vs [Part that stays with you]

### Quick Wins
Top 3 items to delegate this week, with specific next steps.
```

## Verification

- Every open loop has a classification with reasoning
- At least one source was checked (vault, calendar, agents, git)
- Quick wins section has actionable next steps, not vague recommendations

## Rules

- Never classify something as DELEGATE if the user will still review every output manually — that's SIMULATED
- Be honest about hybrid items. Most real work has a delegatable component and a human component.
- If no sources are accessible, ask the user to list their open loops manually

## Source

Nate's Newsletter, 2026-03-28 — "The open loop audit prompt that separates real delegation from simulated work"
Framework: Does the work land on your desk or leave it?
