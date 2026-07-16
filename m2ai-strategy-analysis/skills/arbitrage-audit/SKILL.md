---
name: arbitrage-audit
description: Map a business model to Nate's five exploitable-inefficiency categories (speed, reasoning, fragmentation, discipline, knowledge-asymmetry), tag each gap as structural vs informational, and produce a compression timeline with prioritized actions. Use when the user wants an org-level diagnostic of where AI is about to collapse their margins or which parts of their business are most exposed to model-release cycles.
---

# Arbitrage Audit

Org-level diagnostic that identifies which inefficiencies a business is monetizing, how fast AI will compress each one, and what the next upstream gap looks like once compression happens. Based on Nate's "industries rest on exploitable inefficiencies" thesis.

## Trigger

Use when the user says "audit my business", "where am I exposed to AI", "arbitrage audit", "what's my AI risk", "how much of my work can AI do", "margin compression", or describes a product/service and asks what happens when the next model ships.

## Phase 1: Intake

Collect the following. Ask for anything missing:

1. **Business model** — one-sentence description of what the company sells and how it charges
2. **Core value prop** — why customers pay (speed? expertise? access? coordination?)
3. **Cost structure** — where does time/money actually go? (labor hours, tooling, overhead)
4. **Pricing basis** — hourly? per-seat? per-outcome? per-project?
5. **Current AI usage** — is AI already in the workflow, and where?

If the user gives a one-liner, probe for at least items 2, 3, and 4 before continuing. The audit is worthless without real cost structure.

## Phase 2: Gap Classification

For each of the five gap categories, determine whether the business monetizes it and rate compression velocity. Output one row per category:

| Category | Monetized? | Structural or Informational | Compression Velocity | Evidence |
|----------|-----------|------------------------------|----------------------|----------|
| **Speed** — charging for fast turnaround | yes/no | | fast/medium/slow | |
| **Reasoning** — charging for analysis, synthesis, judgment | yes/no | | fast/medium/slow | |
| **Fragmentation** — charging to stitch disconnected systems/data together | yes/no | | fast/medium/slow | |
| **Discipline** — charging for rigor, checklists, consistency | yes/no | | fast/medium/slow | |
| **Knowledge asymmetry** — charging for access to expertise the client doesn't have | yes/no | | fast/medium/slow | |

**Structural gaps** (regulation, physical constraints, trust, relationships) compress slowly or not at all. **Informational gaps** (any inefficiency made of text, data, or logic) compress at model-release cadence.

## Phase 3: Compression Timeline

For every monetized informational gap, project compression on three horizons:

- **Now → 6 months** — what current frontier models already do adequately
- **6 → 18 months** — what the next 1-2 model releases will collapse
- **18+ months** — what survives because it is structural

Cite concrete signals: named model capabilities, agent framework releases, vendor launches. Do not speculate beyond public signal.

## Phase 4: Action Plan

Output three prioritized actions:

1. **Migrate** — which monetized gap should the business abandon first, and what upstream gap replaces it?
2. **Harden** — which structural gap should become the new primary moat?
3. **Build** — what sensing/systems capability needs to exist so the business can rotate again when the next model ships?

Each action gets: a one-sentence rationale, an estimated cost/effort tier (weekend / multi-sprint / quarter), and a success metric.

## Phase 5: Output Format

Produce a single markdown document with sections:

```
# Arbitrage Audit — {business name}

## Thesis
{one paragraph: where is the business exposed, where does it survive}

## Gap Table
{the Phase 2 table}

## Compression Timeline
{three horizons, concrete signals}

## Action Plan
1. Migrate: ...
2. Harden: ...
3. Build: ...

## Follow-up Questions
{anything that would sharpen the audit if the user supplied more data}
```

## Verification

Before returning the audit, check:

- [ ] Every "yes" in the Monetized? column has at least one line of evidence from user input
- [ ] Every compression-velocity rating cites a model, vendor, or public signal — no hand-waving
- [ ] The migrate action names a concrete upstream gap, not just "move upmarket"
- [ ] The build action is actionable inside the user's current team size

If any check fails, ask the user for the missing information before producing the final report.

## Source

Derived from Nate's Newsletter 2026-04-07, "You're charging 2023 rates for work AI does in 40 minutes + 2 prompts to see your real exposure." Nate ships this as one of two diagnostic prompts; this skill operationalizes it as a structured audit with explicit classification, timeline, and action output.
