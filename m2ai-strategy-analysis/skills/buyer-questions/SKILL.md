---
name: buyer-questions
description: Pre-pitch preflight for enterprise AI sales. Input a product description and buyer persona; outputs the two highest-probability deal-killing questions that buyer will ask, ranked by likelihood of ending the conversation, with suggested answers. Use on "buyer-questions", "what will my buyer ask", "enterprise preflight", "pitch prep".
---

# Buyer Questions Preflight

Surface the two questions your target buyer is most likely to ask that would end the conversation — before the meeting happens. Each question comes with why it kills deals and a suggested answer for after you've closed the gap.

## When to trigger

- User says "buyer-questions", "what will my buyer ask", "pitch prep", "enterprise preflight", "what's going to kill my deal", "prepare me for the enterprise buyer"
- Before a sales call, demo, or proposal with an enterprise or regulated-industry buyer
- After completing an `impl-arch-audit` to translate gaps into buyer-facing risk
- When entering a new vertical (finance, healthcare, insurance, government)

## Workflow

### Phase 1 — Gather inputs

Ask the user for two things (or extract from context):

1. **Product description** — what does the AI deployment do? (one paragraph is fine; a pitch deck excerpt works too)
2. **Target buyer** — role + company profile (e.g., "head of compliance at a mid-market regional bank", "VP Engineering at a 200-person SaaS company", "COO at a 50-person logistics firm")

### Phase 2 — Identify buyer lens

Map the buyer role to their primary concerns:

| Role | Primary concern | Secondary concern |
|------|----------------|-------------------|
| Compliance / Legal | Audit trails, liability, reversibility | Data access controls |
| CFO / Finance | Cost predictability, ROI proof, error recovery | Authority limits |
| CTO / VP Eng | Integration, maintenance burden, observability | Model reliability |
| COO / Operations | Workflow handoffs, exceptions handling, SLA | Human override paths |
| Procurement | Vendor lock-in, contract terms, exit clauses | Security/SOC 2 |
| CISO / Security | Data access scope, audit logs, breach surface | Authority enforcement |

If the buyer role spans multiple concerns, address the top two.

### Phase 3 — Generate questions

Produce the **two highest-probability deal-killing questions** for this specific buyer + product combination. Rank by likelihood of ending the conversation (most dangerous first).

Each question must:
- Be specific to the product's actual gap (not generic AI skepticism like "can AI be trusted?")
- Be phrased exactly as the buyer would ask it in a meeting
- Have a clear root cause tied to one of the six implementation layers
- Be uncomfortable — if the user can answer it today, it's not the right question

### Phase 4 — Output

```
## Buyer Questions Preflight
**Product**: [one-line summary]
**Buyer**: [role + company profile]

---

### Q1 (Highest kill probability): [exact question text]

**Why this kills deals**: [one sentence — the fear or liability behind the question]
**Root layer**: [which of the six layers is missing or hand-waved]
**Your current answer**: [honest assessment of what you'd have to say today]
**Suggested answer (once gap is closed)**: [what you could say after building the missing layer]
**What to build**: [one concrete artifact — e.g., "audit log with reconstruct(run_id) API", "authority tier declaration in agent config"]

---

### Q2: [exact question text]

[same format]

---

### Bonus: The follow-up they will ask if Q1 lands well

[One sentence on the next question in the sequence — the one that closes the deal or kills it at the second gate]
```

## Rules

- Questions must be specific, not generic. "How do you handle errors?" is generic. "What happens to the customer record if your agent submits a refund and the payment processor times out?" is specific.
- The "current answer" must be honest. Do not write a flattering version of where the product is today.
- If the product has no evaluation layer, at least one question must probe that — enterprise buyers always ask about accuracy measurement.
- Regulated-industry buyers (finance, healthcare, insurance) will always ask about audit trails and authority limits. Make sure at least one question covers whichever of those two is weaker.
- The "what to build" must be an artifact (MCP server, log schema, config file, policy doc) — not a process change.

## Source

Nate's Newsletter, 2026-05-14 — "The Enterprise AI Deployment Layer: Why Model Access Isn't Enough"
Insight: Most enterprise AI conversations fail at two questions the builder cannot answer. Surface them before the meeting.
