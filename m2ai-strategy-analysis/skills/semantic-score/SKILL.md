---
name: semantic-score
description: Score any AI product, vendor pitch, or announcement across 10 semantic-depth dimensions to distinguish "access-only" demos from "meaning-rich" products ready for production agent use. Use when evaluating AI tooling, reviewing a vendor pitch, auditing an integration, or the user says "/semantic-score", "semantic depth test", "score this AI product", "is this demo theater", or "how ready is this for agents".
---

# Semantic Depth Scorer

Run any AI product announcement, demo recording, or vendor pitch through a 10-dimension semantic-depth rubric. Distinguishes access-only products (agents can click but cannot understand) from meaning-rich products (agents can act with structured intent).

## Trigger

Use when the user provides an AI product description, demo link, announcement post, or vendor pitch and wants to know if it is production-ready for autonomous agent use. Also trigger on "/semantic-score", "semantic depth test", "is this agent-ready", "demo theater check".

## Phase 1: Input Capture

Ask the user for:
1. **What is the product?** Name, vendor, and a 1-paragraph description or paste of the announcement
2. **What action type does it perform?** (data retrieval / write action / permission management / payment / scheduling / communication / other)
3. **Context of evaluation** (optional): purchase decision, integration planning, advisory review, internal audit

If the user provides a URL, fetch its content and extract the relevant product description before scoring.

## Phase 2: 10-Dimension Scoring

Score each dimension 1-5. Apply the rubric strictly — do not round up based on vendor claims, only on observable evidence from the product description.

| # | Dimension | 1 (Access Only) | 3 (Partial) | 5 (Meaning Rich) |
|---|-----------|-----------------|-------------|------------------|
| 1 | **Action Vocabulary** | Free-form / natural language only; agents must guess valid actions | Named actions exist but undocumented or unstable | Typed, versioned action schema; agents can enumerate valid actions |
| 2 | **Permission Encoding** | Permissions granted via UI checkboxes or ambient session state | Scoped tokens exist but not machine-introspectable | Structured permission tokens: agents can read scope, expiry, and what is permitted |
| 3 | **Validation Paths** | No programmatic validation; agent must infer success from output text | Partial validation: some errors are structured | Deterministic validation: every action has a machine-checkable success/failure contract |
| 4 | **State Observability** | Agent cannot read current state without screen-scraping | State readable via API but schema is opaque | Full state observable: typed schema, versioned, predictable |
| 5 | **Error Semantics** | Errors are human-readable strings only | Errors have codes but no remediation hints | Errors are structured: code + affected field + suggested fix |
| 6 | **Commitment Primitives** | All actions are instant-commit with no rollback | Some actions support dry-run or preview | Actions are staged: agents can preview, validate, then commit or abort |
| 7 | **Intent Capture** | API encodes WHAT happened only | Some context fields available | API encodes WHY: purpose, authorizing policy, downstream effects |
| 8 | **Notification Model** | Side effects propagate only through human-visible channels (email, UI notification) | Webhooks exist but payload is opaque | Machine-readable event stream: side effects are structured and subscribable by agents |
| 9 | **Schema Richness** | No schema; undocumented or changes without notice | OpenAPI or equivalent exists but incomplete | Fully typed, versioned, stable schema with changelog |
| 10 | **Agent Feedback Loops** | No outcome reporting; agent cannot verify the action took effect | Basic status endpoint | Agent receives structured outcome: confirmation, side effects, affected resources |

For each dimension, state:
- Score (1-5)
- One sentence of evidence from the product description
- What would need to change to reach a 5

## Phase 3: Score Calculation

1. Sum all 10 dimension scores (max 50).
2. Express as a percentage: `(sum / 50) * 100`.
3. Classify:

| Score | Label | Meaning |
|-------|-------|---------|
| 0-30 | Access Only | Agents can perform actions but cannot understand them; supervision required for every step |
| 31-50 | Partial Depth | Some semantic primitives present; usable for low-stakes automation with guardrails |
| 51-70 | Emerging | Most dimensions covered; a few gaps will cause incidents in production |
| 71-90 | Meaning Rich | Production-ready for most agent use cases; specific gaps noted |
| 91-100 | Semantic Native | Purpose-built for agent use; all primitives present |

## Phase 4: Report Output

```
# Semantic Depth Score: [Product Name]
Date: [date]
Evaluator: [context from Phase 1]

## Score: XX/100 — [Label]

## Dimension Breakdown
| Dimension | Score | Evidence |
|-----------|-------|----------|
| Action Vocabulary | X/5 | ... |
| Permission Encoding | X/5 | ... |
| Validation Paths | X/5 | ... |
| State Observability | X/5 | ... |
| Error Semantics | X/5 | ... |
| Commitment Primitives | X/5 | ... |
| Intent Capture | X/5 | ... |
| Notification Model | X/5 | ... |
| Schema Richness | X/5 | ... |
| Agent Feedback Loops | X/5 | ... |

## Weakest Dimensions (upgrade path)
1. [lowest-scoring dimension] — [what needs to change]
2. ...

## Verdict
[2-3 sentences: is this product suitable for autonomous agent use? What is the primary risk?]

## Recommendation
[ ] Purchase / integrate as-is
[ ] Integrate with a semantic wrapper layer (see /tool-audit)
[ ] Wait — revisit in [N months] when [specific gap] is addressed
[ ] Reject — access-only; will require sustained human supervision
```

## Phase 5: Verification

- [ ] All 10 dimensions scored with evidence from the product description, not vendor marketing claims
- [ ] Score classification matches the numeric total
- [ ] Recommendation is one of the four options above
- [ ] Any score of 1-2 on Permission Encoding or Validation Paths triggers an explicit risk callout

## Source

Reconstructed from Nate Jones newsletter (2026-05-06): "The next AI platform winner won't have the best model. They'll own something most companies don't even see yet." Rubric derived from Nate's ten-dimension semantic-depth test for AI product evaluation.
