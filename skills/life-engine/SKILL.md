---
name: life-engine
description: >
  Reference implementation of a proactive Life Engine -- a time-windowed briefing loop
  that checks email, calendar, project health, and changelog sources on a recurring schedule.
  This is a REFERENCE IMPLEMENTATION showing one user's full wiring, not a plug-and-play template.
  Read the Adaptation Guide at the bottom to build your own.
---

# Life Engine -- Proactive Briefing Loop (Reference Implementation)

> **This is a reference implementation**, not a generic template. It shows how one
> user wired Gmail, Google Calendar, an Obsidian vault, a Surface tablet idea-catcher,
> a multi-agent dashboard, and changelog tracking into a single proactive loop.
> The value is in the pattern -- time windows, dedup logic, self-improvement cycles,
> and message formatting rules. Your integrations will differ.
>
> See **Adaptation Guide** at the bottom for how to build your own.

You are running a proactive Life Engine loop. Determine what the user needs RIGHT NOW based on the current time, then produce a single briefing message (or nothing).

## Core Loop

1. **TIME CHECK** -- What time is it in the user's timezone? What time window am I in?
2. **DUPLICATE CHECK** -- Search memory for "life_engine_briefing" entries from today. Do NOT repeat a briefing type you already sent this cycle.
3. **DECIDE** -- Based on the time window, what should I do?
4. **GATHER** -- Pull data from available sources (email, project status, dashboards). Use what you have. Do NOT hallucinate integrations you lack.
5. **ENRICH** -- Cross-reference gathered data with memory and context. External facts first, then internal meaning.
6. **OUTPUT** -- Return the briefing as your response text. If nothing is worth sending, respond with exactly: [NO_BRIEFING]
7. **LOG** -- After sending, save a memory: "life_engine_briefing:{type}:{date}" so the next cycle skips it.

## Time Windows (adjust to your timezone)

### Early Morning (8:00-10:00)
Type: morning_briefing
- Check email inbox for overnight messages
- Check project health: scan project directories for stale or unhealthy projects
- Check idea queue (if configured -- see Idea Queue section)
- Check changelog sources for new versions (see Changelog Sources section)
- Format: greeting + email summary + project health + ideas + releases (if any)

### Midday (11:00-13:00)
Type: midday_checkin
- Only if no meeting prep was just sent
- Send a quick energy/focus check-in prompt
- When user replies, acknowledge and log to memory as "life_engine_checkin:{date}"

### Afternoon (14:00-17:00)
Type: afternoon_update
- Check email inbox for new messages since morning
- Surface anything that needs attention before end of day
- If nothing notable: [NO_BRIEFING]

### Evening (17:00-00:00)
Type: evening_summary
- Summarize: emails received today, any check-in logged
- Check changelog sources for new versions released during the day
- Preview: anything in memory about tomorrow
- Keep it short -- end-of-day energy is low

### Quiet Hours (00:00-08:00)
Type: none
- Respond with [NO_BRIEFING]
- Exception: if user explicitly asked to be reminded of something at a specific time (check memory for "life_engine_reminder" entries)

## Self-Improvement (Weekly)

Every 7 days, check memory for "life_engine_suggestion_date". If 7+ days since last:
- Review which briefing types got replies (high value) vs ignored (potential noise)
- Formulate ONE suggestion: add, remove, or modify a behavior
- Format as a yes/no question
- Log as "life_engine_suggestion:{date}"

## Example Integrations (from the reference user)

These show what a fully wired Life Engine looks like. Replace with your own sources.

### Email (Gmail MCP)
- Gmail MCP tools: gmail_search_messages, gmail_read_message, gmail_read_thread
- Morning search: `in:inbox newer_than:12h -category:promotions -category:social`
- Afternoon search: `in:inbox newer_than:6h -category:promotions -category:social`

### Calendar (Google Calendar MCP)
- mcp__google-calendar__get_events, mcp__google-calendar__query_freebusy

### Project Health
- Scan project manifest files (e.g. `$PROJECTS_DIR/*/project.json`) for stale or unhealthy status

### Idea Queue (optional)
If you have an idea-catcher tool that writes to a SQLite DB, pull and summarize:
```bash
sqlite3 /tmp/caught_ideas.db "SELECT COUNT(*) FROM caught_ideas WHERE status='pending';"
sqlite3 -separator '|' /tmp/caught_ideas.db "SELECT id, title FROM caught_ideas WHERE status='pending' ORDER BY caught_at DESC LIMIT 3;"
```

Format in briefing (skip if pending = 0):
```
Ideas: {pending} pending ({new} new)
- {title 1}
- {title 2}
- {title 3}
```

### Changelog Sources

Track raw markdown changelogs for new versions. Use WebFetch to retrieve each URL.

| Source | URL |
|--------|-----|
| Claude Code | https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md |
| Gemini CLI | https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/changelogs/latest.md |
| OpenAI Node SDK | https://raw.githubusercontent.com/openai/openai-node/master/CHANGELOG.md |

To check for new versions:
1. WebFetch the raw markdown URL
2. Extract the latest version string (first ## heading with a version number)
3. Search memory for "life_engine_changelog_seen:{source_name}"
4. If the version differs from what's in memory, it's new -- summarize the top 3-5 changes
5. Log "life_engine_changelog_seen:{source_name}:{version}" to memory

Add your own sources by appending rows to the table.

## Message Format Rules

1. Mobile-first. Bullet points, not paragraphs.
2. Lead with the most actionable item.
3. Max 15 lines per briefing. If more, prioritize ruthlessly.
4. No fluff greetings beyond morning briefing.
5. End with a clear call-to-action or "no action needed."

## Example Outputs

### Morning Briefing
```
Morning Brief -- Mar 22

3 new emails overnight:
- GitHub: PR review requested on project-x #42
- Railway: deploy succeeded (dashboard)
- Google: storage quota warning (82%)

Projects:
- project-a: healthy (updated 2h ago)
- project-b: stale (no commits in 5d)

Ideas: 8 pending (3 new)
- Voice memo: agent-handoff pattern
- Morning recap automation
- Audit cron rework

Releases:
- Claude Code 2.0.78 (new!) -- prompt caching, bug fixes

Calendar: 2 events today
- 10:00 -- Focus block
- 14:00 -- Client call
```

### Midday Check-in
```
Quick check-in -- how's energy?
Reply with a word or emoji and I'll log it.
```

### Evening Summary
```
Day wrap -- Mar 22
4 emails (1 needs reply)
Midday: "focused"
Releases today: Claude Code 2.0.78 -- prompt caching, bug fixes
Tomorrow: 1 event -- 09:00 Discovery call
```

### No Briefing
```
[NO_BRIEFING]
```

## Rules

1. NO duplicate briefings. Check memory first. If "life_engine_briefing:morning_briefing:2026-03-22" exists, skip morning.
2. Silence > noise. When in doubt, [NO_BRIEFING].
3. Do NOT fabricate calendar data. If calendar is not available, say so briefly (once per day max).
4. One self-improvement suggestion per week, max.
5. Log everything you send. Next cycle depends on it.
6. Respect quiet hours absolutely. 00:00-08:00 = [NO_BRIEFING].
7. When user replies to a check-in or suggestion, acknowledge immediately and log.

---

## Adaptation Guide

To build your own Life Engine:

1. **Pick your timezone** -- replace all time windows with your local hours.

2. **Pick your delivery channel** -- the reference user delivers via a Telegram bot agent. You might use:
   - PushNotification (if available in Claude Code)
   - A webhook to Slack/Discord
   - Just the CLI response if running interactively

3. **Wire your data sources** -- replace the example integrations with whatever MCP servers and tools you have:
   - Email: Gmail MCP, Microsoft 365 MCP, or any IMAP tool
   - Calendar: Google Calendar MCP, Microsoft 365 MCP
   - Project health: whatever manifest or status files your projects use
   - Changelogs: add/remove rows from the changelog table

4. **Set up the schedule** -- this skill is designed to run on a recurring schedule (e.g. every 30 minutes via `/schedule`). It self-determines what to do based on the current time.

5. **Configure the dedup mechanism** -- the reference uses Claude Code auto-memory for dedup logs. If you use a different memory system, adapt the "life_engine_briefing:{type}:{date}" pattern.

6. **Start minimal** -- begin with just the morning briefing (email + calendar). Add integrations one at a time as you confirm each works. The self-improvement cycle will help you tune over weeks.
