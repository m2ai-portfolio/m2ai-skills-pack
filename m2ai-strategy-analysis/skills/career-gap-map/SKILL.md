---
name: career-gap-map
description: Calculate an individual's AI exposure score (percent of weekly tasks AI can already compress to near-zero) and produce a migration plan toward upstream skills like judgment, taste, and system design. Use when the user wants to audit their own job, plan a career pivot, evaluate how exposed their role is to the next model release, or build a quarterly review checkpoint.
---

# Career Gap Map

Personal companion to `arbitrage-audit` — same framework applied to a single person's week instead of a business. Outputs an exposure score and a migration plan.

## Trigger

Use when the user says "am I exposed to AI", "career gap map", "exposure score", "what should I learn next", "audit my job", "what parts of my week can AI do", or asks for a personal version of the arbitrage audit.

## Phase 1: Task Inventory

Collect one week of the user's actual task allocation. Accept any of:

1. A pasted list of weekly tasks with rough hour estimates
2. A calendar export (`.ics` or text dump) — parse event titles
3. A Notion / Linear / Obsidian task list
4. Free-form description of "what I did this week"

If none available, walk the user through a 10-line inventory: "list the ten things that took the most time this week, with hours each." Do not proceed without numeric hours — the exposure score depends on them.

## Phase 2: Per-Task Classification

For each task, classify on two axes:

**Compression tier:**
- **NEAR-ZERO** — current frontier models already do this in minutes (drafting, formatting, summarizing, lookup, first-pass code, first-pass research)
- **ASSIST** — AI meaningfully speeds this up but human judgment is still load-bearing (review, refactor, debugging with context, stakeholder-specific writing)
- **UPSTREAM** — AI is not a substitute; the task requires judgment, taste, relationships, or system design (architecture decisions, negotiation, hiring, picking what to build)

**Source of difficulty:**
- **INFORMATIONAL** — the hard part is knowing or generating the answer
- **STRUCTURAL** — the hard part is trust, access, regulation, or physical constraints

## Phase 3: Exposure Score

Compute:

```
exposure_score = (hours on NEAR-ZERO + 0.3 × hours on ASSIST) / total_hours
```

Report as a percentage with the three-tier breakdown (NEAR-ZERO hours, ASSIST hours, UPSTREAM hours). Flag anything above 50% as high exposure and anything below 20% as low exposure.

## Phase 4: Migration Plan

Produce a personalized migration plan with four sections:

1. **Stop doing** — tasks to hand off to AI this quarter. Name the tool/workflow that would absorb each one.
2. **Redesign** — tasks that should be restructured so the human holds judgment and the AI holds execution.
3. **Learn** — 2-3 upstream skills the user should invest in, picked from: system design, taste/curation, negotiation, domain strategy, sensing (what to build next), or relationship capital.
4. **Sense** — one recurring input (newsletter, benchmark tracker, release watcher) the user should wire into their week so they know when the next compression wave hits.

## Phase 5: Output Format

```
# Career Gap Map — {user name or "you"}

## Exposure Score
{percentage}% — {tier: LOW / MEDIUM / HIGH}
Breakdown: NEAR-ZERO {X}h, ASSIST {Y}h, UPSTREAM {Z}h, total {T}h

## Task Table
| Task | Hours | Tier | Structural? | Notes |
|------|-------|------|-------------|-------|

## Migration Plan
### Stop doing
### Redesign
### Learn
### Sense

## Recheck trigger
{condition that should prompt re-running this skill — e.g., "after the next frontier model release" or "end of Q3"}
```

## Quarterly Recheck

If the user has run this skill before, locate the previous output (ask if path unclear). On re-run:

- Diff the task inventory and exposure score against the previous report
- Highlight any tasks that migrated tiers (NEAR-ZERO → not present, ASSIST → UPSTREAM, etc.)
- Flag drift away from upstream skills as a warning

## Verification

- [ ] Every task in the inventory has a numeric hour value
- [ ] Every task has both a compression tier and a structural/informational tag
- [ ] The exposure score math is shown, not just the final number
- [ ] The "Learn" section names specific skills, not "improve judgment"
- [ ] The "Sense" section specifies an actual source the user can subscribe to today

## Source

Derived from Nate's Newsletter 2026-04-07, "You're charging 2023 rates for work AI does in 40 minutes + 2 prompts to see your real exposure." Nate ships this as the second of two diagnostic prompts; this skill operationalizes it with explicit scoring, task tiering, and a quarterly recheck loop.
