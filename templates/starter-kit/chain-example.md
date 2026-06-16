# Chain Example: Weekly Content Retro

A real pattern from a live system. Shows how the conductor sequences
work across forgetful specialist agents, with vault state as the carrier.

---

## The task

Every Friday, produce a weekly content retro: what published, what landed,
what flopped, and one recommendation for next week.

No single agent can do this end-to-end — it requires data, analysis, and
formatting. So the conductor chains three specialists in sequence.

---

## The chain (four steps)

```
[CONDUCTOR]
    |
    v
Step 1: ANALYTICS AGENT
  Input: "Pull this week's post metrics from LinkedIn, X, and YouTube."
  Writes result to: vault/handoffs/retro-2026-06-13-data.md
    |
    v (reads handoff file)
Step 2: ANALYST AGENT
  Input: "Read vault/handoffs/retro-2026-06-13-data.md. What landed,
          what flopped, what's the pattern?"
  Writes result to: vault/handoffs/retro-2026-06-13-analysis.md
    |
    v (reads handoff file)
Step 3: WRITER AGENT
  Input: "Read vault/handoffs/retro-2026-06-13-analysis.md. Write the
          Friday retro in the standard format."
  Writes result to: vault/weekly-retros/2026-06-13.md
    |
    v
Step 4: CONDUCTOR logs to hive mind, sends summary to [OWNER] via Telegram
```

---

## Why vault files, not variables

Each delegation is a FRESH session. The analytics agent's output is not
in memory when the analyst agent starts — it never was. There is no shared
variable space between agent turns.

The only cross-session carrier that survives is a FILE or a DATABASE ROW.
The handoff file IS the state. The conductor writes the file path into
the next delegation's prompt, and the next agent opens the file cold.

This is not a bug to fix. It is the architecture. Design around it.

---

## What happens when you get the chain wrong

Real example from this system. A content publishing workflow had five steps:

  1. Draft post
  2. Research hook angle
  3. Revise draft
  4. Publish
  5. Log to database

Step 5 (log) had `depends_on: []` instead of `depends_on: [step4]`.
Result: step 5 fired at the same time as step 1. At execution time, no
post existed yet — step 4 hadn't run. The log agent found nothing to log
and wrote: "no post published on this date." The actual post went up later
but was never logged.

Lesson: `depends_on` is not optional decoration. In a chain, every step
must name exactly the step before it. A missing dependency silently turns
a sequence into a race.

---

## The handoff file format

Minimal viable. The point is: the next agent can pick this up cold.

```markdown
---
task: weekly-retro-data
produced_by: analytics-agent
produced_at: 2026-06-13T20:00:00
status: ready
---

## LinkedIn
- Posts this week: 3
- Top performer: "The Continuous Baseline" (847 impressions, 4.2% engagement)
- Lowest: "Quick tip on X" (201 impressions, 0.8%)

## X / Twitter
- Posts: 12
- Reach: 2,104
- Top: thread on agent architecture (43 reposts)

## YouTube
- No new uploads this week.
- Watch time: 847 min (flat vs last week)
```

The next agent reads this file. It does not ask the analytics agent what
happened. That agent's session is gone.

---

## The hive mind log (parallel to the chain)

Every step also writes one row to the shared database. This is NOT how
state passes between steps — the vault file does that. The hive mind is
for the conductor and [OWNER] to track what happened:

```
agent_id       | action          | summary
---------------|-----------------|------------------------------------------
analytics      | data_pull       | Pulled LinkedIn/X/YouTube for week of 6/9
analyst        | retro_analysis  | Top performer: Continuous Baseline. Pattern:
               |                 | longer threads outperform one-liners 3:1.
writer         | retro_written   | Friday retro written to vault/weekly-retros/
conductor      | retro_complete  | Sent retro to [OWNER]. Chain: 3 steps, 0 err.
```

The conductor reads this table at the start of the NEXT session to know
what the chain produced without re-running anything.

---

## Summary: what makes a chain work

1. Vault file per handoff (not variables, not memory)
2. Each delegation prompt includes the exact vault path to read
3. depends_on set correctly so steps fire in sequence, not in parallel
4. Hive mind log at each step for the conductor's situational awareness
5. The conductor does no specialist work — it only sequences and reports
