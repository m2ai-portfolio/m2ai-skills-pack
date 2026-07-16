---
name: weekly-signal-diff
description: Tracks N companies across M categories, re-ranks using user context (projects, interests, priorities), and produces a personalized "structural diff" of what changed and why it matters to YOU specifically. Saves analysis back so signal compounds over time.
---

# Weekly Signal Diff

Produces a personalized weekly intelligence briefing by tracking companies and categories you care about, diffing against last week's state, and ranking changes by relevance to your specific projects and priorities.

## Trigger

Use when the user says "weekly signal diff", "what changed this week", "signal diff", "weekly intelligence", "what should I know this week", "run the weekly scan", or when invoked as a scheduled task.

## Phase 1: Load Context

1. **User context** -- read vault/CLAUDE.md or project manifests to understand:
   - Active projects and their domains
   - Current priorities and deadlines
   - Technology stack in use
   - Business interests (clients, markets, verticals)

2. **Tracking list** -- check for a persisted tracking list at `~/.claude/signal-diff/tracking.json`. If it doesn't exist, build one from user context:
   ```json
   {
     "companies": ["Anthropic", "Google", "OpenAI", "Apple", "Microsoft"],
     "categories": ["AI infrastructure", "developer tools", "agent frameworks", "pricing models"],
     "keywords": ["MCP", "agent SDK", "inference cost", "per-seat pricing"],
     "last_run": null,
     "history": []
   }
   ```
   Ask the user to confirm or modify before first run.

3. **Previous state** -- load last week's analysis from `~/.claude/signal-diff/history/` if available.

## Phase 2: Signal Gathering

For each tracked company and category, search for developments since `last_run` (default: 7 days):

1. **WebSearch** for each company: "[company] news announcement [this week]"
2. **WebSearch** for each category: "[category] developments [this week]"
3. **WebSearch** for each keyword: "[keyword] update release change [this week]"

Deduplicate results. For each signal, capture:
- Headline
- Source
- Date
- Company/actor
- Category
- 1-sentence summary

Target: 20-40 raw signals before filtering.

## Phase 3: Relevance Scoring

Score each signal 1-10 on relevance to the user's context:

| Factor | Weight | Description |
|--------|--------|-------------|
| Project impact | 3x | Does this affect an active project's tech stack, dependencies, or market? |
| Strategic value | 2x | Does this inform a business decision, pricing choice, or competitive position? |
| Action required | 2x | Does the user need to do something because of this? |
| Knowledge value | 1x | Is this worth knowing even if no action is needed? |
| Novelty | 1x | Is this genuinely new vs. incremental coverage of known trends? |

Weighted score = (project * 3) + (strategic * 2) + (action * 2) + (knowledge * 1) + (novelty * 1)

Filter to top 10-15 signals.

## Phase 4: Diff Against Last Week

If previous state exists, compute the diff:

- **New signals** -- things that appeared this week that weren't on the radar
- **Escalated signals** -- ongoing trends that got more significant
- **Resolved signals** -- things from last week that concluded or became irrelevant
- **Steady state** -- ongoing items with no material change (mention briefly, don't detail)

If no previous state, skip this phase and note "First run -- no diff available."

## Phase 5: Personalized Analysis

For each of the top 5 signals, write a brief analysis:

### [Signal Title]
**What happened:** [1-2 sentences]
**Why it matters to you:** [Specific connection to user's projects/priorities]
**Suggested action:** [Concrete next step, or "Monitor" if no action needed]
**Confidence:** [High/Medium/Low -- how certain is the relevance assessment]

## Phase 6: Output & Persist

### Output Format

```markdown
# Weekly Signal Diff: [Date Range]

## TL;DR
[3 bullet points: the 3 most important things this week]

## Top Signals (Ranked by Relevance)
[Phase 5 analysis for top 5]

## Other Notable Signals
[1-line summaries of signals #6-15]

## Diff vs. Last Week
[Phase 4 diff summary]

## Tracking List Changes
[Any companies/categories that should be added or removed based on this week's signals]
```

### Persist State

Save current analysis to `~/.claude/signal-diff/history/[date].json`:
```json
{
  "date": "2026-04-14",
  "signals": [...],
  "top_5": [...],
  "tracking_list_at_time": {...}
}
```

Update `tracking.json` with `last_run` date and any tracking list modifications the user approved.

## Composability

- **Input from:** WebSearch, vault notes, research-agent output, Nate's newsletter digests
- **Output to:** the social agent content pipeline (signal-to-post), strategic planning, News Narrative Decomposer (for deeper structural analysis)
- **Scheduled:** Designed to run weekly as a scheduled task. Recommended: Sunday evening or Monday morning.

## Notes

- First run requires user confirmation of tracking list. Subsequent runs are autonomous.
- Signal compounding: each week's analysis builds on the last. After 4+ weeks, trend detection becomes meaningful.
- If Perplexity Sonar is available (via OpenRouter or direct API), use it for deeper signal gathering. Fall back to WebSearch if not.
- Keep the tracking list under 20 companies and 10 categories to avoid noise.

## Source

Extracted from Nate Kadlac newsletter (2026-04-14) -- "Open Brain" concept: personalized signal tracking that re-ranks industry developments using your specific context, producing a structural diff that compounds over time.
