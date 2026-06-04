---
name: impl-arch-audit
description: Score an AI deployment against six implementation layers (workflow, data, authority, evaluation, audit trail, recovery). Outputs a tier verdict and surfaces the two questions your next enterprise buyer will ask that you cannot yet answer. Use on "impl-arch-audit", "implementation architecture audit", "score my AI deployment", "six-layer audit".
---

# Implementation Architecture Audit

Walk any AI deployment through the six concrete layers that separate a decorative model from a business-grade workflow actor. Each layer is scored **owned / hand-waved / missing** and the output is a tier verdict plus the two deal-killing questions your next enterprise buyer will ask.

## When to trigger

- User says "impl-arch-audit", "implementation architecture audit", "six-layer audit", "score my AI deployment", "am I owning a workflow or decorating a model"
- Pre-sales or discovery call prep
- Before pitching an enterprise buyer or regulated-industry client
- After building an agent to sanity-check coverage

## The Six Layers

| # | Layer | What "owned" looks like |
|---|-------|------------------------|
| 1 | **Workflow design** | Explicit handoff map: human → agent → human touchpoints documented, approval gates defined, no ambiguous handoffs |
| 2 | **Data access** | Agent reads only the rows/fields it needs; permissions enforced at the data layer, not the prompt layer; source-of-truth hierarchy declared |
| 3 | **Authority** | Three-tier model: READ (no side effects) / WRITE (mutates records) / SPEND (commits money or contracts). Agent tier declared and enforced at tool-call time |
| 4 | **Evaluation** | Rubric tied to *company's own policy and outcome standards*, not public benchmarks. Evals run on new outputs and drift is tracked |
| 5 | **Audit trail** | Every agent decision, tool call, input, output, and human override logged with a workflow run-ID. `reconstruct(run_id)` is callable by a risk team |
| 6 | **Recovery & ownership** | Every write-capable action classified as reversible / partially-reversible / irreversible. Compensating actions documented. Named owner responsible for model + process + policy changes |

## Scoring rubric

For each layer, assign:
- **Owned** (2 pts) — fully built, documented, and enforced in code or configuration
- **Hand-waved** (1 pt) — addressed in prompt or policy but not enforced structurally
- **Missing** (0 pts) — not addressed

Total: 0–12 pts → tier verdict:

| Score | Tier |
|-------|------|
| 0–3 | **Decorating a model** — model access only, no deployment layer |
| 4–6 | **Wrapper** — some structure, significant gaps |
| 7–9 | **Half-built** — meaningful coverage, enterprise questions will surface missing layers |
| 10–11 | **Workflow owner** — strong; one or two gaps to close |
| 12 | **Full stack** — deployment layer complete |

## Workflow

### Phase 1 — Gather context

Ask the user (or infer from prior conversation):
- What is the AI deployment? (product description or agent system being audited)
- What is the target buyer or use-case context? (enterprise / regulated / SMB)

If context is already available, proceed without asking.

### Phase 2 — Score each layer

For each of the six layers, ask one targeted question and record owned / hand-waved / missing with a one-sentence rationale.

Work through the layers in order. If the user can answer in a single pass ("here's how my system works"), extract scores from their description rather than asking six separate questions.

### Phase 3 — Compute verdict

Sum the scores. Apply the tier table. State the tier plainly.

### Phase 4 — Surface the buyer questions

Based on the two lowest-scoring layers, produce the **two questions your next enterprise buyer will ask that you cannot yet answer**. Format:

```
Q1: [The exact question a sophisticated buyer would ask]
Why it kills deals: [One sentence on why this is a deal-blocker]
Your current answer: [What you'd have to say today — be honest]
Suggested answer (once fixed): [What you could say after closing the gap]

Q2: [same format]
```

Choose questions that are:
- Specific to the missing layer, not generic AI skepticism
- Framed from a risk/compliance/procurement perspective
- Actionable — the user knows exactly what to build to answer them

### Phase 5 — Output

```
## Implementation Architecture Audit — [PRODUCT / DATE]

### Tier: [TIER NAME] ([SCORE]/12)

| Layer | Score | Rationale |
|-------|-------|-----------|
| Workflow design | owned/hand-waved/missing (2/1/0) | [one sentence] |
| Data access | ... | ... |
| Authority | ... | ... |
| Evaluation | ... | ... |
| Audit trail | ... | ... |
| Recovery & ownership | ... | ... |

### Two Questions You Cannot Yet Answer

[Q1 block]

[Q2 block]

### Recommended next build
[One sentence on the highest-leverage gap to close first, with a concrete artifact to build]
```

## Rules

- Score each layer on structure, not intent. A prompt that says "only read the relevant rows" is hand-waved, not owned.
- The buyer questions must be uncomfortable. If the user could answer them today, pick the next hardest ones.
- Never inflate the tier — a half-built deployment called "Workflow Owner" will fail in a real procurement conversation.
- If the user has no evaluation rubric at all, that layer is always missing, even if they run informal checks.

## Source

Nate's Newsletter, 2026-05-14 — "The Enterprise AI Deployment Layer: Why Model Access Isn't Enough"
Framework: Six implementation layers that determine whether you're decorating a model or owning a workflow.
