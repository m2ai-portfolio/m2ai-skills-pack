---
name: heartbeat-generator
description: Takes a user's described operating rhythms (from structured elicitation, manual input, or existing CLAUDE.md) and generates a HEARTBEAT.md checklist plus cron schedule entries that map to their actual daily/weekly/monthly patterns. Use when the user says "generate heartbeat", "build my schedule", "create cron from rhythms", "heartbeat.md", "schedule my agent", or when setting up recurring tasks for a the agent platform agent.
---

# HEARTBEAT.md Generator -- Operating Rhythms to Cron Schedules

Convert a user's described operating rhythms into two artifacts: a human-readable HEARTBEAT.md checklist and machine-executable cron schedule entries. Eliminates the manual translation step between "I do X every Monday" and the cron expression that makes an agent do it.

## When to Use

- After running `structured-elicitation` (consumes its rhythm output directly)
- When setting up a new the agent platform agent that needs recurring tasks
- When a user describes their schedule in natural language and wants agent coverage
- When auditing an existing agent's cron schedule against its stated responsibilities

## Inputs (any one of these)

1. **operating-model.json** -- structured output from `structured-elicitation` skill (preferred)
2. **CLAUDE.md / SOUL.md** -- extract rhythms from prose descriptions
3. **Natural language** -- user describes their schedule conversationally
4. **Existing crontab** -- reverse-engineer rhythms from existing cron entries (audit mode)

## Phase 1: Rhythm Extraction

### From structured input (operating-model.json)
Parse the `rhythms` array directly. Each entry has: name, frequency, time, duration, trigger, description.

### From prose (CLAUDE.md / SOUL.md / conversation)
Scan for temporal patterns:
- Daily indicators: "every morning", "each day", "daily", "first thing"
- Weekly indicators: "every Monday", "weekly", "each week", day names
- Monthly indicators: "monthly", "first of the month", "end of month"
- Triggered indicators: "whenever", "after each", "when X happens"

Extract each rhythm as:
```json
{"name": "...", "frequency": "daily|weekly|monthly|triggered", "time": "HH:MM or null", "day": "mon|tue|...|1-31 or null", "description": "...", "confidence": "high|medium|low"}
```

Show extracted rhythms to the user. Flag any `confidence: low` entries for clarification.

### From existing crontab (audit mode)
Parse cron entries, reverse-engineer the rhythm, and identify:
- Orphan crons (scheduled but no stated rhythm)
- Missing crons (stated rhythm but no schedule)
- Mismatched timing (rhythm says "9am" but cron says "*/4 hours")

## Phase 2: Schedule Design

For each extracted rhythm, determine:

1. **Cron expression**: Map natural language to cron syntax
   - "Every morning at 9am" -> `0 9 * * *`
   - "Every Monday at 9am" -> `0 9 * * 1`
   - "Weekdays at 8am" -> `0 8 * * 1-5`
   - "First of month at 10am" -> `0 10 1 * *`
   - "Every 4 hours" -> `0 */4 * * *`

2. **Agent assignment**: Which agent should own this rhythm?
   - If multi-agent setup: match rhythm to agent jurisdiction
   - If single agent: assign all to that agent
   - If unclear: flag for user decision

3. **Conflict detection**: Check for overlapping schedules
   - Two tasks at the same time on the same agent
   - Tasks that depend on each other but aren't sequenced
   - Excessive scheduling density (more than 3 tasks in the same hour)

4. **Timezone**: Use the user's timezone (from env, config, or ask once)

## Phase 3: Generate HEARTBEAT.md

Format:

```markdown
# HEARTBEAT.md
Generated: <date>
Timezone: <tz>

## Daily Rhythms

### Morning Triage (09:00, every day)
- [ ] Check email inbox for urgent items
- [ ] Review overnight alerts in Sentry
- [ ] Update daily note in vault

### Evening Wrap (17:00, weekdays)
- [ ] Log completed tasks
- [ ] Queue tomorrow's priorities

## Weekly Rhythms

### Monday Planning (09:00, Monday)
- [ ] Review week's calendar
- [ ] Prioritize backlog items
- [ ] Check agent performance metrics

### Friday Review (16:00, Friday)
- [ ] Write weekly summary
- [ ] Archive completed items
- [ ] Prep next week's focus areas

## Monthly Rhythms

### Month-End Report (10:00, 1st)
- [ ] Pull metrics for previous month
- [ ] Generate summary report
- [ ] Share with stakeholders
```

## Phase 4: Generate Cron Schedule

For the agent platform agents, output schedule-cli commands:

```bash
PROJECT_ROOT=$(git rev-parse --show-toplevel)

# Daily: Morning Triage (09:00)
node "$PROJECT_ROOT/dist/schedule-cli.js" create "Run morning triage: check email, review alerts, update daily note" "0 9 * * *"

# Weekly: Monday Planning (09:00 Mon)
node "$PROJECT_ROOT/dist/schedule-cli.js" create "Run Monday planning: review calendar, prioritize backlog, check agent metrics" "0 9 * * 1"

# Monthly: Month-End Report (10:00, 1st)
node "$PROJECT_ROOT/dist/schedule-cli.js" create "Generate month-end report: pull metrics, summarize, share" "0 10 1 * *"
```

Also output a standalone `schedule-recommendations.json`:
```json
{
  "timezone": "America/Chicago",
  "schedules": [
    {"name": "Morning Triage", "cron": "0 9 * * *", "agent": "main", "prompt": "...", "priority": 5},
    ...
  ]
}
```

## Phase 5: Validation

Before finalizing:

1. **Coverage check**: Are all stated rhythms represented in the cron schedule?
2. **Conflict check**: Any overlapping schedules on the same agent?
3. **Sanity check**: Is the total scheduled time realistic? (flag if >6 hours/day scheduled)
4. **User review**: Show the complete HEARTBEAT.md and cron entries for approval

## Source Attribution

Extracted from Nate's Newsletter (2026-04-15): "Your agent needs a SOUL.md you can't write from scratch." The HEARTBEAT.md concept maps a user's operating rhythms to agent-executable schedules, closing the gap between "what I do" and "what my agent does for me."

## Verification

- [ ] Every extracted rhythm has a corresponding cron entry
- [ ] No cron conflicts (same agent, overlapping times)
- [ ] HEARTBEAT.md is human-readable and accurate
- [ ] Cron expressions are valid (test with `crontab -l` syntax)
- [ ] User approved both artifacts before deployment
