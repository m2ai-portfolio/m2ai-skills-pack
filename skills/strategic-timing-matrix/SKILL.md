---
name: strategic-timing-matrix
description: Map your biggest pending decisions (hiring, fundraising, product launches, home purchase, job change) against macro events and market windows to recommend which decisions to accelerate, delay, or hedge. Use when the user says "timing matrix", "when should I", "decision timing", "should I wait", "accelerate or delay", "macro timing", "strategic window", or has multiple pending decisions and wants to sequence them against external forces.
---

# Strategic Timing Matrix

Takes a user's pending decisions and maps them against macro events, market windows, and capital cycles to produce timing recommendations: accelerate, delay, or hedge.

## Trigger

Use when the user has multiple pending decisions and wants to know how external forces affect their timing. Also useful for single high-stakes decisions where macro context matters.

## Phase 1: Decision Inventory

Ask the user to list their 3-7 biggest pending decisions. For each, capture:
- **Decision**: What is it? (e.g., "hire 2 engineers", "launch v2", "buy a house")
- **Default timeline**: When were you planning to do this? (e.g., "Q3 2026")
- **Reversibility**: Easy to reverse, hard to reverse, or irreversible
- **Capital sensitivity**: Does this decision depend on available capital, market conditions, or external funding?

If the user gives a vague list, push for specifics. "Career stuff" is not a decision; "accept the offer from Company X" is.

## Phase 2: Macro Event Scan

Identify the 3-5 most relevant macro events or windows that could affect the user's decisions. Sources:

1. **User-provided context** (e.g., "the IPO supercycle", "AI regulation timeline")
2. **Web search** for current macro events relevant to the user's industry/situation
3. **Known cyclical patterns** (interest rate cycles, hiring seasons, fiscal year budgets)

For each macro event, capture:
- **Event**: What is happening
- **Window**: When does it peak / resolve (date range)
- **Mechanism**: How it affects decisions (capital availability, talent market, attention scarcity, regulatory change)
- **Confidence**: HIGH / MODERATE / LOW that this event plays out as expected

## Phase 3: Build the Matrix

Create a timing matrix crossing decisions against events:

```
| Decision | Default | Event 1 Impact | Event 2 Impact | Event 3 Impact | Recommendation |
|----------|---------|---------------|---------------|---------------|----------------|
| Hire 2 engineers | Q3 2026 | Talent scarce (delay) | Budget OK (neutral) | Reg uncertainty (delay) | DELAY to Q4 |
| Launch v2 | May 2026 | Market attention high (accel) | Capital available (accel) | Neutral | ACCELERATE to Apr |
| Buy house | Q2 2026 | Rate cuts expected Q3 (delay) | Neutral | Neutral | DELAY to Q3 |
```

For each cell, note:
- **Direction**: accelerate / delay / neutral
- **Magnitude**: strong / moderate / weak
- **Reasoning**: 1 sentence

## Phase 4: Recommendations

For each decision, synthesize the matrix into one of:

- **ACCELERATE** (with target date and why)
- **DELAY** (with target date and what trigger to watch for)
- **HEDGE** (proceed but with a specific mitigation: smaller commitment, option structure, staged rollout)
- **HOLD** (macro forces are balanced or unclear; proceed on default timeline)

Include a **confidence rating** for each recommendation.

## Phase 5: Sensitivity Check

Identify the 1-2 assumptions that, if wrong, would flip the recommendations. State them clearly:

> "If interest rates do NOT drop in Q3, the 'delay house purchase' recommendation flips to 'accelerate before rates rise further.'"

This prevents the matrix from feeling more certain than it is.

## Phase 6: Output

Present the full matrix, recommendations, and sensitivity check. Then offer:
- "Want me to set calendar reminders for the trigger dates?"
- "Want a shorter version for quick reference?"
- "Want me to save this to the vault?"

## Verification

A good timing matrix has:
- Decisions that are specific and actionable (not vague categories)
- Macro events with date ranges, not just "sometime in 2026"
- Recommendations that differ from the default timeline (if everything says "hold", the matrix added no value)
- At least one sensitivity flip identified
- No false precision (ranges and confidence levels, not exact dates)

## Source

Extracted from Nate Kadlac newsletter intake (2026-04-09) -- "The Largest IPO in History Is Engineered to Spend Your Retirement Savings" -- the "18-Month Strategic Timing Matrix" prompt concept generalized beyond IPO context into a reusable decision-timing skill.
