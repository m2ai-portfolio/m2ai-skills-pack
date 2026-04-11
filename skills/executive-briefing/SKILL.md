---
name: executive-briefing
description: Takes a complex geopolitical, industry, or market event and produces a structured executive briefing with thesis, transmission channels, quantified exposure, counterarguments addressed, and recommended actions.
---

# Executive Briefing Generator

Transforms a complex event or development into a structured executive briefing suitable for decision-makers. Follows the analytical framework used in high-end intelligence and strategy newsletters.

## Trigger

Use when the user says "briefing on", "executive brief", "brief me on", "write a briefing", "analyze this event", or provides a news event / development and asks for structured analysis aimed at executives or decision-makers.

## Phase 1: Intake

Accept the event or topic. This can be:
- A news article URL or pasted text
- A short description of an event ("helium supply disruption", "EU AI Act enforcement begins")
- A market signal from IdeaForge or research-agents
- A Nate newsletter digest or similar analysis

If a URL is provided, fetch and extract the core content. If a description, work with it directly.

Ask one clarifying question only if the audience or scope is genuinely ambiguous: "Who is this briefing for?" (default: technical leadership at an AI/software company).

## Phase 2: Research & Frame

1. Identify the **core thesis** -- the single most important claim about why this event matters to the target audience.
2. Map **2-4 transmission channels** -- the causal pathways through which this event affects the audience's operations, costs, timelines, or strategy.
3. For each channel, estimate **quantified exposure** where possible (dollar amounts, timeline delays, percentage impacts). Use ranges, not false precision.
4. Identify **second-order effects** -- what happens 6-12 months downstream if the thesis is correct.

## Phase 3: Counterargument Section

Generate the **3-5 strongest counterarguments** to the thesis. For each:
- State the counterargument as a steel-man (not a straw-man)
- Provide the rebuttal with evidence or reasoning
- Rate the counterargument strength: WEAK / MODERATE / STRONG

This section is mandatory. A briefing without addressed counterarguments is incomplete.

## Phase 4: Draft the Briefing

Structure the output as:

```
# [EVENT] -- Executive Briefing

**Date:** [today]
**Audience:** [target]
**Classification:** [Open / Internal / Restricted]

## Bottom Line Up Front (BLUF)
[2-3 sentences: what happened, why it matters, what to do about it]

## Thesis
[Core claim, 1 paragraph]

## Transmission Channels

### Channel 1: [Name]
[How the event flows through to impact. Quantified where possible.]

### Channel 2: [Name]
[...]

## Second-Order Effects
[What happens downstream in 6-12 months]

## Counterarguments Addressed
| # | Counterargument | Strength | Rebuttal |
|---|----------------|----------|----------|
| 1 | [steel-man] | MODERATE | [rebuttal] |

## Recommended Actions
1. [Immediate -- this week]
2. [Near-term -- this month]
3. [Strategic -- this quarter]

## Sources & Confidence
[List sources. Rate overall confidence: LOW / MODERATE / HIGH]
```

## Phase 5: Output

Present the briefing, then offer:
- "Want me to adjust the audience or scope?"
- "Want a shorter version for Telegram/Slack?"
- "Want me to save this to the vault?"

## Verification

A good briefing has:
- A BLUF that stands alone (reader gets the point without reading further)
- At least 2 transmission channels with some quantification
- Counterarguments that are genuinely strong, not token objections
- Actions that are specific and time-bound, not generic ("monitor the situation")

## Source

Extracted from Nate Kadlac newsletter (2026-03-29) -- "Executive Briefing: 33% of the world's helium supply just went offline" -- structured analytical format for complex event communication.
