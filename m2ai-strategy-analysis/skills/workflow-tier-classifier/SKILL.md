---
name: workflow-tier-classifier
description: Paste a product description or pitch and get back a five-tier verdict (Decoration → Full Stack) with the missing implementation layers called out. Lightweight lead-magnet classifier and self-assessment tool. Use on "workflow-tier-classifier", "am I decorating a model", "classify my AI product", "what tier is my deployment".
---

# Workflow Tier Classifier

Paste a product description or pitch deck excerpt and get back a plain-English verdict: are you **decorating a model** or **owning a workflow**? The classifier names your tier, identifies the missing layers, and tells you exactly what to build next.

## When to trigger

- User says "workflow-tier-classifier", "classify my AI product", "am I decorating a model", "what tier is my deployment", "workflow tier"
- Quick self-assessment before a pitch or proposal
- Reviewing a competitor product or prospect's existing AI system
- As a public-facing lead-magnet entry point before a full `impl-arch-audit`

## The Five Tiers

| Tier | What it means |
|------|--------------|
| **Decoration** | Model access bolted onto a product. No deployment layer. The AI can be removed and the product mostly still works. |
| **Wrapper** | Some structure around the model — a prompt, an API call, maybe a UI. But no workflow handoffs, data scoping, or authority limits. |
| **Half-built** | Meaningful implementation (workflow design + data access at minimum), but missing authority enforcement, evaluation, audit trail, or recovery. Would fail a serious enterprise procurement review. |
| **Workflow Owner** | Five of six layers present and structurally enforced. One gap remaining — typically evaluation rubric or recovery procedure. |
| **Full Stack** | All six layers owned: workflow design, data access, authority enforcement, evaluation, audit trail, recovery & ownership. Enterprise-grade. |

## The Six Layers (abbreviated)

1. **Workflow design** — explicit handoff map between human and agent steps
2. **Data access** — row/field-level scoping enforced in code, not prompt
3. **Authority** — READ / WRITE / SPEND tiers declared and enforced at tool-call time
4. **Evaluation** — company-specific rubric with drift tracking
5. **Audit trail** — tamper-evident log with `reconstruct(run_id)` API
6. **Recovery & ownership** — compensating actions for every write; named owner for ongoing tuning

## Workflow

### Phase 1 — Accept input

Accept a free-form product description, pitch paragraph, feature list, or architecture summary. No structured input required. If the description is fewer than two sentences, ask one clarifying question: "What does the AI actually do when a user triggers it?"

### Phase 2 — Score the six layers

Read the description and assign each layer a score:
- **Present** — layer is explicitly described and structurally implemented
- **Implied** — layer is mentioned or implied but not built into the product
- **Absent** — no evidence of this layer

### Phase 3 — Apply tier

| Present count | Tier |
|--------------|------|
| 0–1 | Decoration |
| 2–3 | Wrapper |
| 4 | Half-built |
| 5 | Workflow Owner |
| 6 | Full Stack |

Adjust down one tier if Authority or Audit Trail is absent — these are binary enterprise requirements; their absence is more disqualifying than other gaps.

### Phase 4 — Output

```
## Workflow Tier Verdict

**Tier: [TIER NAME]**

[One sentence plain-English summary of what that means for this specific product]

### Layer Assessment

| Layer | Status | Evidence |
|-------|--------|---------|
| Workflow design | Present/Implied/Absent | [quoted or inferred from description] |
| Data access | ... | ... |
| Authority | ... | ... |
| Evaluation | ... | ... |
| Audit trail | ... | ... |
| Recovery & ownership | ... | ... |

### What's Missing

[Bullet list of absent/implied layers with one sentence each on why they matter for this product's use case]

### Next Build

**Highest-leverage gap**: [layer name]
**What to build**: [one concrete artifact — e.g., "authority-tier config in agent.config.json", "structured audit log written on every tool call"]
**Effort**: [Weekend / Multi-sprint]

### Self-Assessment URL
Run `/impl-arch-audit` for the full scored audit with buyer-question analysis.
```

## Rules

- Be honest about tier assignment. If a product description says "the AI respects user permissions" without explaining how, that's Implied, not Present.
- Authority and Audit Trail gaps are weighted heavier — call this out explicitly if either is absent.
- Never assign Full Stack without explicit evidence for all six layers. "Enterprise-ready" in a marketing description is not evidence.
- Keep the output skimmable. The tier name and the "Next Build" section are what most users will act on.
- If the description is a competitor product, apply the same rubric — do not soften the verdict.

## Source

Nate's Newsletter, 2026-05-14 — "The Enterprise AI Deployment Layer: Why Model Access Isn't Enough"
Concept: The strategic question every AI builder should be able to answer — are you decorating a model or owning a workflow?
