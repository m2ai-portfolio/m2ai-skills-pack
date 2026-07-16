---
name: calendar-hygiene
description: Audit the next N days of a Google Calendar and surface hygiene issues before the user notices them -- back-to-back meetings with no buffer, missing prep blocks before important events, overloaded days, and overlapping commitments. Proposes specific calendar edits. Use when asking "calendar hygiene", "audit my calendar", "check my schedule", "what's wrong with my week?", "add buffers to my calendar", "prep blocks", or wanting anticipatory calendar management rather than reactive scheduling.
---

# Calendar Hygiene — Anticipatory Schedule Audit

Scan the next N days of your calendar, detect scheduling issues that degrade focus and preparedness, and propose specific fixes before they become problems. The anticipatory form of calendar management: surface conflicts and gaps before the day starts, not after it goes wrong.

## When to Use

- Sunday planning or weekly review prep
- Before a dense week (conference, sprint, deadline)
- When you feel reactive about your schedule but can't name why
- As a scheduled task that runs automatically each week
- Before sharing your calendar availability with external parties

## Inputs

- Lookahead window: number of days to audit (default: 7)
- Calendar: the calendar to audit (default: primary calendar)
- Optional: list of event types to flag (all checked by default)

If Google Calendar MCP tools are available, query them directly. Otherwise ask the user to paste their upcoming schedule.

## Phase 1: Load Events

Query the calendar for the lookahead window:

Using Google Calendar MCP tools if available:
1. Call `get_events` for today through today + N days
2. Group events by day
3. For each event, note: title, start time, end time, duration, attendees count (if available), and whether it has a description or preparation notes

If MCP tools are unavailable, ask the user to paste their schedule as text.

## Phase 2: Run Hygiene Checks

For each day, check all five hygiene rules:

### Rule 1: Back-to-Back Detection

Flag any two consecutive events where the gap between end of one and start of next is less than 15 minutes.

- **Severity: HIGH** if gap is 0 minutes (immediate back-to-back)
- **Severity: MEDIUM** if gap is 1-14 minutes
- **Recommended fix**: Insert a 15-minute buffer block between the events

### Rule 2: Missing Prep Block

Flag events lasting 30+ minutes with more than one attendee (i.e., real meetings, not personal blocks) that have no prep block in the 30-60 minutes before them.

- **Severity: MEDIUM** if meeting has a description or title suggesting preparation is needed (contains words like "review", "presentation", "interview", "1:1", "planning", "kickoff")
- **Severity: LOW** if meeting type is unclear
- **Recommended fix**: Add a 30-minute "Prep: [meeting name]" block before the event

### Rule 3: Overloaded Days

Flag any day where:
- Total meeting time exceeds 4 hours, OR
- More than 4 separate meetings are scheduled

- **Severity: HIGH** if total meeting time exceeds 6 hours
- **Severity: MEDIUM** if 4-6 hours or 4-6 meetings
- **Recommended fix**: Identify the lowest-priority meeting and flag it as a candidate to decline, shorten, or reschedule

### Rule 4: Missing Recovery Time

Flag any sequence of 3 or more consecutive meetings (even with small gaps) spanning more than 2 hours without a break of 30+ minutes.

- **Severity: MEDIUM**
- **Recommended fix**: Insert a 30-minute "Focus / Recovery" block in the middle of the sequence

### Rule 5: Overlap or Double-Booking

Flag any two events with overlapping time windows.

- **Severity: HIGH**
- **Recommended fix**: Identify the lower-priority event and flag it for rescheduling or declining

## Phase 3: Score the Week

Produce a hygiene score for the audit window:

```
CALENDAR HYGIENE SCORE
- Issues found: {total count} ({HIGH count} high, {MEDIUM count} medium, {LOW count} low)
- Days with issues: {N} of {total days in window}
- Worst day: {day with most issues}
- Hygiene score: {0-100, where 100 = no issues}
```

Score formula: start at 100, subtract 15 per HIGH issue, 8 per MEDIUM, 3 per LOW.

## Phase 4: Produce the Fix Plan

List every issue with a concrete proposed fix:

```
CALENDAR HYGIENE REPORT
=======================
Window: {start date} to {end date}
Score: {X}/100

ISSUES (sorted by severity then date)

HIGH
----
{day}, {time}: Back-to-back — "{Event A}" ends at {time}, "{Event B}" starts at {time}
  FIX: Insert 15-min buffer block "{Event A} Buffer" at {time}-{time}

MEDIUM
------
{day}, {time}: Missing prep — "{Meeting}" at {time}, no prep block found
  FIX: Add "Prep: {Meeting}" block at {time}-{time}

{day}: Overloaded — {N} hours of meetings scheduled
  FIX: Consider declining "{lowest-priority meeting}" or shortening it by 30 min

LOW
---
{description}
  FIX: {specific action}

PROPOSED ACTIONS SUMMARY
1. {action} — {event name} on {date}
2. {action} — ...
```

## Phase 5: Apply Fixes (with confirmation)

Present the fix plan and stop. Do not modify the calendar without explicit user confirmation.

The user chooses:
- **Apply all** — execute all proposed fixes using `manage_event` (create buffer blocks, prep blocks)
- **Apply selected** — user picks specific fixes to apply
- **Preview only** — review the report without making changes
- **Reschedule** — if a meeting needs to move, ask for the preferred new time

For each confirmed buffer or prep block creation, use the calendar MCP `manage_event` or `create_event` tool to add the block with:
- Title: "Buffer" or "Prep: {meeting name}"
- Duration: as recommended
- No attendees
- Optional description: generated by this audit

## Verification Checklist

- [ ] All five hygiene rules checked for every day in the window
- [ ] Every HIGH issue has a concrete fix proposal
- [ ] Score calculation matches the issue count
- [ ] No calendar writes made without explicit user confirmation
- [ ] If MCP tools were unavailable, the user was asked to provide schedule data manually

## Anticipatory Invocation

This skill can run as a scheduled task (e.g., every Sunday at 08:00):

```
# calendar-hygiene — anticipatory trigger
# Fires: every Sunday at 8:00 AM
0 8 * * 0  claude -p 'Run the calendar-hygiene skill for the next 7 days and report issues. Do not apply any fixes automatically — report only.' >> ./logs/calendar-hygiene.log 2>&1
```

In anticipatory mode, the skill reports issues only and does not apply fixes. The user reviews the report and applies fixes in an interactive session.

## Source Attribution

Pattern extracted from Nate's Newsletter (natesnewsletter@substack.com), 2026-05-05:
*"The Anticipation Gap: Why 4 Problems Have to Be Solved Together for Consumer AI to Work"*
https://natesnewsletter.substack.com/p/consumer-ai-anticipation-gap

Nate's framing: "the closest a normal person can get to what an anticipatory agent should feel like" is proactive calendar hygiene — acting on schedule problems before the user notices them, not after they derail a day.
