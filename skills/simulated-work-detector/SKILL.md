---
name: simulated-work-detector
description: Recurring audit that reviews agent fleet output and flags simulated work that generated artifacts but didn't close any loops or remove work from your plate
---

# Simulated Work Detector

Review your agent fleet's recent output and flag **simulated work** -- things that generated documents, reports, or summaries but didn't actually close any loops or remove work from your plate.

## When to trigger

- User says "simulated work check", "what's my fleet actually doing", "audit agent output", "work detector"
- Weekly scheduled run (recommended: Sunday evening before weekly planning)
- After any major agent fleet expansion or new automation setup

## Phases

### Phase 1 — Gather Agent Output

Collect recent agent activity from all sources (default: last 7 days):

1. **the agent platform scheduled tasks** — query `store/the agent platform.db` for completed scheduled task runs and their outputs
2. **Mission Control tasks** — check completed mission tasks and their results
3. **Cron jobs** — check recent cron output logs in `/tmp/` or project log dirs
4. **Git activity** — PRs created by agents, commits from automated processes
5. **Vault notes** — any auto-generated notes, digests, or reports

Build an inventory: `[Agent] | [Task] | [Output] | [Timestamp]`

### Phase 2 — Apply the Land/Leave Test

For each output, ask:

1. **Did it close a loop?** Did something get shipped, sent, merged, paid, or resolved? Or did it produce a document that sits unread?
2. **Did it remove work from the human's plate?** Is there less for the user to do now? Or do they still need to read, review, approve, or act on the output?
3. **Was there a downstream consumer?** Did the output go to a client, a system, another agent, or an external party? Or did it dead-end?
4. **Was it read?** If it produced a report/digest, was it actually consumed? (Check if vault notes were accessed, if Telegram messages were read/replied to)

Classify each as:
- **REAL** — closed a loop, removed work, had a downstream consumer
- **SIMULATED** — generated an artifact but didn't change anything
- **UNCLEAR** — can't determine without user input

### Phase 3 — Calculate Waste Ratio

```
Total agent actions: N
Real work: X (Y%)
Simulated work: A (B%)
Unclear: C (D%)

Estimated compute/cost spent on simulated work: $Z
```

### Phase 4 — Recommendations

For each SIMULATED item:
- **Kill it** — if nobody reads it, stop running it
- **Restructure it** — if the core task has value but the output format is wrong (e.g., change "generate report" to "send email to client with key findings")
- **Redirect it** — if the output is useful but going to the wrong place (e.g., writing to a vault note nobody checks vs posting to Slack)

### Phase 5 — Report

```
## Simulated Work Audit — [DATE RANGE]

### Fleet Health
Real: X% | Simulated: Y% | Unclear: Z%
Est. wasted compute: $W

### Simulated Work Found
| Agent | Task | Output | Why It's Simulated | Recommendation |
|-------|------|--------|--------------------|----------------|
| ...   | ...  | ...    | ...                | Kill / Restructure / Redirect |

### Recommendations
1. [Top action to take]
2. [Second action]
3. [Third action]

### Healthy Automations (Keep)
- [Agent/task that's clearly delivering value]
```

## Verification

- At least 2 data sources were checked
- Every agent output has a classification with reasoning
- Waste ratio is calculated
- Recommendations are specific ("kill the daily vault digest" not "review your automations")

## Rules

- Don't count "meta-work" as real work. An agent that monitors other agents is only real if it leads to action.
- Triage reports and summaries that require human review to be useful are SIMULATED by default. The human is still doing the work.
- Be ruthless. The whole point is to catch things that feel productive but aren't.
- If the user pushes back on a classification, accept it. They know their workflow better.

## Source

Nate's Newsletter, 2026-03-28 — "The open loop audit prompt that separates real delegation from simulated work"
Framework: Applies the "land or leave" test at fleet scale to catch agents doing busywork.
