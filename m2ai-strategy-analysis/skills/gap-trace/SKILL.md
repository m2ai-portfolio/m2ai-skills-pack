---
name: gap-trace
description: Run Nate's three-question industry diagnostic — what inefficiency is this built on, how fast can AI close it, what new gap does closure create — and output a migration map showing where value moves upstream. Use when the user wants a fast (5-minute) diagnostic of any industry, product, or workflow without running the full arbitrage-audit.
---

# gap-trace

Lightweight slash-command wrapper around Nate's three diagnostic questions. Composable inside `arbitrage-audit` and `career-gap-map`, and usable standalone for quick public-facing demos.

## Trigger

Use when the user says `/gap-trace`, "gap trace", "three questions", "quick audit of X", "where does value move when AI eats this", or names any industry/product/role and asks a compressed version of the arbitrage audit.

## Phase 1: Subject

Identify what is being traced. Accept one of:

- an industry (e.g., "tax prep", "staffing agencies", "long-form journalism")
- a specific company or product
- a workflow or job function

If the subject is vague ("consulting"), ask one clarifying question before tracing. Do not trace a category so broad that the answer would be a platitude.

## Phase 2: The Three Questions

Answer each in 3-5 sentences. Cite at least one public signal per question.

**Q1. What inefficiency is this built on?**
Name the gap category (speed, reasoning, fragmentation, discipline, knowledge-asymmetry) and the specific instance. Describe how the business currently captures value from that gap.

**Q2. How fast can AI close it?**
Give a horizon (now / 6-18 months / 18+ months / structural — does not close). Cite the specific model capability, vendor product, or agent pattern that compresses the gap. If the gap is structural (regulation, physical, trust, relationships), explain why it survives.

**Q3. What new gap does closure create?**
When the current gap closes, value moves upstream. Name the new gap and who captures it. This is the most important question — skipping it produces doom narratives instead of migration plans.

## Phase 3: Migration Map

Produce a one-line migration arrow:

```
{current gap} → [compressed by {mechanism} on {horizon}] → {new upstream gap} captured by {who}
```

Then list two concrete bets:

1. **Short bet** — what to build or learn in the next 90 days to participate in the upstream gap
2. **Long bet** — what structural asset (relationship, brand, dataset, license) should be accumulated now because it survives the compression

## Phase 4: Output Format

```
# gap-trace: {subject}

## Q1. Underlying inefficiency
{answer + signal}

## Q2. Compression horizon
{answer + signal}

## Q3. Next upstream gap
{answer + signal}

## Migration map
{arrow}

## Bets
- Short: ...
- Long: ...
```

Keep the entire output under 500 words. This skill exists for speed — if the answer sprawls, switch to `arbitrage-audit` instead.

## Composition

When invoked from another skill:
- `arbitrage-audit` may call `gap-trace` once per monetized gap to standardize per-gap reasoning
- `career-gap-map` may call `gap-trace` on the user's current job function for framing before the task inventory

When composed, skip Phase 4's markdown wrapper and return just the three answers plus the migration arrow as a structured object.

## Verification

- [ ] Q1 names an explicit gap category
- [ ] Q2 cites a named model, vendor, or agent pattern — not "AI in general"
- [ ] Q3 names a specific upstream gap and who captures it
- [ ] The migration arrow follows the exact format above
- [ ] Total length is under 500 words when run standalone

## Source

Derived from Nate's Newsletter 2026-04-07, "You're charging 2023 rates for work AI does in 40 minutes." Nate explicitly frames these as the three diagnostic questions every builder should be able to answer about any industry. This skill operationalizes them as a reusable composable primitive.
