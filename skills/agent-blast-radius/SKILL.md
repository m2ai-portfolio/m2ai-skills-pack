---
name: agent-blast-radius
description: Inventory everything an autonomous agent has actually touched over a time window — files modified, commits authored, APIs called, processes spawned, scheduled tasks created — and produce a blast-radius report. Use when the user says "blast radius", "what has my agent done", "agent footprint", "audit agent actions", or wants visibility into the expanding surface of a long-running autonomous agent.
---

# Agent Blast Radius

Periodically (or on demand) inventory the *actual* footprint of an autonomous agent: not what it was allowed to do, but what it has done. Designed for long-running Claude Code agents, scheduled tasks, and pipeline workers where the cumulative footprint silently expands and nobody notices.

Addresses Nate's "no executive visibility, no IT involvement" failure mode: by day 90, the agent has touched far more of the system than anyone realized.

## When to Use

- Weekly review of any persistent agent (the agent platform, scheduled cron tasks, mission-control workers)
- Before merging a long-lived agent branch back to main
- After any incident where you need to answer "what did the agent do in the last 24 hours?"
- As a scheduled task itself — run the blast radius report on yourself

## Inputs

- Project root (defaults to cwd)
- Time window (defaults to last 7 days)
- Optional: agent identifier (for filtering git authorship, log streams)

## Phases

### Phase 1 — Filesystem footprint

```bash
git log --since="<window>" --author="<agent>" --name-status --pretty=format:"%H|%ai|%s"
```

Capture: commits authored, files modified (added/modified/deleted), lines changed. Group by directory to show concentration.

### Phase 2 — External call footprint

Check for evidence of external API calls in the time window:

- Grep `~/.claude/projects/*/logs/` (or equivalent) for tool-use entries
- Inspect any rate-limit/cost-tracking SQLite DBs the project maintains (e.g. `store/the agent platform.db` token_usage table)
- Read scheduled-task tables for tasks the agent created during the window

### Phase 3 — Process / service footprint

- Active pm2 / systemd / cron entries created or modified by the agent
- New ports opened, new background processes spawned (where logged)
- Docker containers / stacks created via the container manager API (if relevant)

### Phase 4 — Data footprint

- Rows inserted/updated in tracked SQLite/Postgres tables during the window
- Files written outside the project root (config files, logs, vault notes)
- Git branches/PRs created on remote orgs

### Phase 5 — Produce the report

```
AGENT BLAST RADIUS REPORT
=========================
Agent: <id>
Window: <start> → <end>

FILESYSTEM
- Commits: N | Files touched: N | Net lines: +X / -Y
- Hot directories: <list with counts>
- Files outside project root: <list>

EXTERNAL CALLS
- API calls: N (Anthropic: N, OpenAI: N, ...)
- Estimated cost: $X.XX
- Rate-limit headroom remaining: X%

PROCESSES & SERVICES
- New scheduled tasks: N
- New pm2/systemd entries: N
- New containers: N

DATA WRITES
- DB rows touched: N (table: count, ...)
- Remote branches created: N (PRs: N)

EXPANSION TREND
- Footprint vs prior window: +X% / -Y%
- New surface area introduced: <summary>

ESCALATIONS
- <items requiring human review, e.g. files outside expected scope>
```

## Verification

- Diff two consecutive runs; expansion trend should match recent activity
- Cross-check filesystem counts against `git log --shortstat` for the same window
- For Claude Code agents, verify token costs match the cost-tracking DB

## Source Attribution

Concept extracted from Nate's Newsletter, 2026-04-05: *"Executive Briefing: OpenClaw Deployments Are Spreading Through Your Org"* — specifically the "no executive visibility, no IT involvement" pattern and the day-90 footprint expansion problem.
