---
name: news-narrative-decomposer
description: Takes a month of AI/tech news and extracts the structural shifts underneath the headlines -- classifying each story by altitude (physics, monetization, geography, business models, geopolitics), finding the through-line, and outputting the 3-5 things that actually changed. Fights "absorbed a lot of takes but couldn't name what changed."
---

# News Narrative Decomposer

Cuts through headline noise to extract the structural shifts that actually happened in a given time period. Each story gets classified by "altitude" (what layer of the stack it operates at), then the skill finds the connecting thread and outputs a tight summary of what changed and why it matters.

## Trigger

Use when the user says "what actually changed this month", "decompose the news", "narrative decomposer", "structural shifts", "what's the through-line", "news summary", or asks to make sense of a batch of AI/tech news items.

## Phase 1: News Intake

Accept input in any of these forms:

1. **Raw news items** -- a list of headlines, articles, or links the user provides
2. **Time range** -- "last 30 days in AI" (use WebSearch to gather top stories)
3. **Vault notes** -- point at a folder of daily notes or research-agent output
4. **Newsletter digest** -- paste or path to a newsletter like Nate's

If fewer than 10 items are provided and the user specified a time range, supplement with WebSearch:
- Search for "[topic] news [month] [year]"
- Search for "[topic] announcements [month] [year]"
- Search for "[topic] layoffs acquisitions [month] [year]"

Aim for 15-30 items before proceeding. Duplicates are fine at this stage.

## Phase 2: Altitude Classification

For each news item, classify by the layer of the stack it operates at:

| Altitude | Description | Examples |
|----------|-------------|---------|
| Physics | Hardware, energy, data centers, chips | GPU supply, power grid, cooling, chip fab |
| Infrastructure | Cloud, APIs, protocols, models | New model releases, API changes, MCP adoption |
| Monetization | Pricing, revenue, unit economics | Inference cost shifts, pricing model changes, ad integration |
| Business Models | Company strategy, market structure | Layoffs, pivots, acquisitions, per-seat death |
| Geopolitics | Regulation, trade, safety, sovereignty | Export controls, AI safety bills, data residency |

Output a table:

| # | Headline | Altitude | Company/Actor |
|---|----------|----------|---------------|
| 1 | Sora shut down | Monetization | OpenAI |
| 2 | Atlassian cuts 1,600 | Business Models | Atlassian |
| ... | ... | ... | ... |

## Phase 3: Pattern Extraction

Look across the classified items for:

1. **Altitude clustering** -- which layer has the most activity? That's where the real action is.
2. **Cross-altitude connections** -- items at different altitudes that are actually the same structural force (e.g., "chip shortage" at Physics causing "inference cost anxiety" at Monetization causing "per-seat repricing" at Business Models).
3. **Absence signals** -- altitudes with zero items. If nobody's talking about Physics but everyone's talking about Business Models, the Physics layer is being taken for granted (which means a surprise there would be high-impact).

## Phase 4: Structural Shift Extraction

Distill to 3-5 structural shifts. Each shift must:

- Name the force, not the headline ("SaaS per-seat model breaking under agent pressure" not "Atlassian lays off 1,600")
- Span at least 2 news items as evidence
- State what changed from the prior equilibrium
- State the second-order implication

Format each shift as:

### Shift N: [Name]

**What changed:** [1-2 sentences]
**Evidence:** [List the news items that support this]
**Altitude:** [Primary altitude, plus any cross-altitude connections]
**Second-order:** [What this means for builders/businesses in the next 90 days]

## Phase 5: Through-Line

Write a single paragraph (3-5 sentences max) that connects all the shifts into one narrative. This is the "if you could only tell someone one thing about this month, what would it be?"

## Phase 6: Output

```markdown
# News Narrative Decomposition: [Time Period]

## Through-Line
[Phase 5 output]

## Structural Shifts
[Phase 4 output -- 3-5 shifts]

## Altitude Map
[Phase 2 table]

## Raw Signal Count
- Physics: N items
- Infrastructure: N items
- Monetization: N items
- Business Models: N items
- Geopolitics: N items

## Absence Signals
[Phase 3 absence analysis]
```

## Composability

This skill is designed to be the analytical backbone of the Weekly Signal Diff skill. When composed:
1. Weekly Signal Diff gathers the raw signals
2. News Narrative Decomposer extracts the structural meaning
3. The combined output feeds content creation (the social agent) and strategic planning

Can also be invoked standalone for ad-hoc sensemaking.

## Source

Extracted from Nate Kadlac newsletter (2026-04-14) -- "Sora died. Atlassian cut 1,600 engineers. Anthropic got blacklisted." -- the altitude classification framework and "what actually changed" analytical approach.
