---
name: fair-agent-license-rubric
description: Score an agent license or SaaS contract term sheet against a 9-trait rubric distinguishing fair agent licensing (transparent, capped, portable, identity-aware) from rent-seeking (opaque, uncapped, lock-in, double-billing). Outputs a numeric score, flagged red clauses, and a verdict.
---

# Fair Agent License Rubric

Paste a license PDF excerpt, contract term sheet, or vendor addendum and get back a scored rubric that flags rent-seeking clauses, names the fair-vs-unfair verdict per trait, and tells you which clauses to redline before signing.

## When to trigger

Use when the user says "fair-agent-license-rubric", "score this license", "is this agent license fair", "redline this contract", "evaluate this vendor addendum", "check this SaaS renewal for agent traps", or pastes contract language and asks whether it is reasonable.

## Phase 1: Gather Input

Accept any of:
- Pasted contract text or term sheet excerpt
- A plain-English description of the proposed terms
- A bullet list of the key clauses the user remembers

If the input is fewer than three sentences, ask: "What does the contract say about (a) how agent actions are metered, (b) whether there is a hard cap, and (c) what happens on overage?"

## Phase 2: Score the 9 Traits

Evaluate each trait and assign a score: **Fair (1)**, **Gray area (0.5)**, or **Rent-seeking (0)**.

| # | Trait | Fair | Rent-seeking |
|---|-------|------|-------------|
| 1 | **Meter transparency** | Vendor publishes a written, versioned conversion table mapping action types to billing units | Meter is described only as "usage-based" with no published conversion |
| 2 | **Hard cap option** | Contract offers an opt-in hard monthly cap (agent stops when cap is hit, no auto-overage) | No cap option; overage auto-bills at rack rate |
| 3 | **Portability** | Agent workflows and data can be exported in a standard format (CSV, JSON, API) without vendor lock-in | Workflow configs or agent data are stored in proprietary format with no documented export |
| 4 | **Identity-aware billing** | Contract distinguishes between human-seat-run and service-account-run agent actions; meters them consistently | Human and agent actions share a meter opaquely, or service accounts are charged at a higher undisclosed rate |
| 5 | **Audit logs included** | Full agent-action audit log is available at no extra cost via API or UI export | Audit log is a paid add-on SKU or not available |
| 6 | **Governed-path discount** | Vendor offers a lower rate for agent actions taken via the vendor's official SDK or governed flow path | No pricing distinction between governed and ungoverned calls; may create perverse incentive to bypass SDK |
| 7 | **Predictable upgrade path** | Any pricing change to agent meters requires 90-day written notice; existing multi-year deals are grandfathered | Vendor reserves the right to reprice agent meters at any time without notice |
| 8 | **Shared-tenancy option** | Agent identity and billing can be scoped to a department or project without requiring a separate single-tenant contract | Agent billing is tied to a forced single-tenant architecture at a premium price |
| 9 | **Exit clause for meter changes** | If the vendor materially changes the agent meter definition (what counts as a billable action), the customer has a termination-for-convenience right | No exit right on meter redefinition; customer is locked through renewal regardless of definition change |

## Phase 3: Score Calculation

```
Total score = sum of all trait scores (max 9.0)

Verdict:
  8.0 - 9.0  → Fair license. Standard SaaS terms with agent-aware protections.
  6.0 - 7.5  → Acceptable with redlines. Flag the failing traits for negotiation.
  4.0 - 5.5  → Caution. Multiple rent-seeking traits. Negotiate or walk.
  0.0 - 3.5  → Reject. Vendor has built systematic lock-in into the agent meter model.
```

## Phase 4: Output

```
## Fair Agent License Rubric: [Vendor / Contract]

**Overall score**: X.X / 9.0
**Verdict**: [Fair / Acceptable with redlines / Caution / Reject]

### Trait Scores

| Trait | Score | Finding |
|-------|-------|---------|
| Meter transparency | [1 / 0.5 / 0] | [one sentence on what the contract says] |
| Hard cap option | ... | ... |
| Portability | ... | ... |
| Identity-aware billing | ... | ... |
| Audit logs included | ... | ... |
| Governed-path discount | ... | ... |
| Predictable upgrade path | ... | ... |
| Shared-tenancy option | ... | ... |
| Exit clause for meter changes | ... | ... |

### Red Clauses (score = 0)
[Bulleted list of failing traits with the exact contract language that caused the flag]

### Redline Recommendations
[For each red clause: suggested replacement language or minimum acceptable revision]

### Gray Areas (score = 0.5)
[Bulleted list of gray-area traits with what additional information would resolve ambiguity]
```

## Rules

- Score based on what the contract says, not what the vendor said in conversation. Verbal commitments are not scored.
- If the contract is silent on a trait (no language either way), score it **0** -- silence defaults to unfavorable because it is unenforceable.
- Traits 1 (meter transparency), 2 (hard cap), and 9 (exit clause) are binary enterprise requirements. If any of the three scores 0, drop the verdict one tier regardless of total score.
- Do not soften a Reject verdict. If the math produces Reject, say Reject and explain which traits drove it.
- "Redline recommendations" must be concrete proposed language, not instructions like "ask for better terms."

## Source

Nate Jones newsletter, 2026-05-15 -- "SaaS Agent Licensing: What Your 2026 Renewal Will Look Like"
Core insight: A fair agent license is transparent, capped, portable, and identity-aware. These four properties map to nine verifiable contract traits.
