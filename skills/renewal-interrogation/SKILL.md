---
name: renewal-interrogation
description: Generate a vendor-specific SaaS renewal playbook for contracts where agent workloads are in scope. Input vendor name, current contract terms summary, planned agent usage, and negotiation priorities; output a sequenced interrogation playbook — opening anchors, mid-conversation probes, closing protection clauses, and the one question each vendor will try to dodge. Use when the user says "renewal-interrogation", "renewal playbook", "SaaS renewal prep", "contract negotiation for agents", "help me prep for [vendor] renewal", or before any enterprise SaaS renewal where AI/agent usage has increased since the last contract.
---

# Renewal Interrogation

Generate a vendor-specific playbook for SaaS contract renewals where agent workloads have been added since the last negotiation. Most procurement teams are negotiating with 2023-era contract knowledge against vendors who have been restructuring agent pricing since mid-2025. This skill closes that asymmetry.

## When to Invoke

- User says "renewal-interrogation", "renewal playbook", "SaaS renewal prep", "contract negotiation for agents", "help me prep for [vendor] renewal"
- Before any SaaS renewal where AI features, Copilot integrations, or deployed agents have been added since the last contract
- After completing an `agent-system-touch-map` to translate meter exposure into negotiating leverage
- When a vendor sends a renewal proposal that includes new AI/agent SKUs

## Inputs

1. **Vendor name** — which vendor's renewal is this? (e.g., Salesforce, Microsoft, ServiceNow)
2. **Current contract summary** — seat count, current spend, contract end date, existing AI/Copilot add-ons (one paragraph is sufficient)
3. **Planned agent usage** — what agents are deployed or planned? What operations will they perform?
4. **Negotiation priorities** — what matters most? (cost predictability / cap protection / portability / audit rights / avoid double-billing / exit clauses)

If any input is missing, ask before generating the playbook.

## Phase 1: Vendor Profile

Map the vendor to their known agent-pricing behavior patterns. Use the reference below; for vendors not listed, proceed with the generic playbook and flag as [VENDOR NOT IN REFERENCE — verify current pricing model]:

### Vendor Behavior Reference (2026-Q2)

**Salesforce (Agentforce / Flex Credits)**
- Dodge pattern: will not disclose the credit-to-action conversion ratio. Flex Credits are priced as a bundle; the per-action cost is deliberately opaque.
- Leverage points: "Einstein 1" bundles may already include a credit allocation — verify what's covered before buying add-on credits.
- Watch for: "unlimited agent" language that has a velocity cap buried in the order form.

**Microsoft (Copilot Credits / Agent 365)**
- Dodge pattern: avoids explaining the overlap between Copilot Credits (consumed per Copilot Studio agent turn) and Agent 365 Credits (consumed per autonomous agent action). You can double-spend.
- Leverage points: E3/E5 licenses may already include Copilot usage allowances — press for the exact credit-to-action conversion table.
- Watch for: Entra Agent ID may require a separate licensing SKU depending on tenant configuration.

**ServiceNow (Action Fabric / Assist Currency)**
- Dodge pattern: governed-path (Flow Designer / Assist actions) vs raw REST API calls have different metering — reps often present only the governed-path price.
- Leverage points: if your agents use raw REST, switching to governed-path reduces cost AND improves audit trails. Use this as a negotiating chip.
- Watch for: "Action Fabric units" pricing varies by edition tier; press for the per-unit rate at your specific edition.

**HubSpot (Breeze Credits / Outcomes)**
- Dodge pattern: "outcomes-based" billing sounds efficient but "outcome" is defined vendor-side; challenge the definition in writing.
- Leverage points: Breeze usage within existing Marketing/Sales Hub tiers may be included — verify before purchasing add-on credits.
- Watch for: AI sequence automation counts as a Breeze action per send in some SKU configurations.

**Atlassian (Rovo Credits)**
- Dodge pattern: Rovo credits consumed by agents vs consumed by human AI-assist features are pooled — high agent usage eats human-facing features.
- Leverage points: press for a split-pool option (agent budget vs human budget) to protect human-facing AI.
- Watch for: Jira/Confluence AI suggestions may be bundled or separately metered depending on tier.

**Workday (Flex Credits / Agent System of Record)**
- Dodge pattern: "Agent System of Record" framing makes agents sound like a neutral feature; the per-request pricing for write/approve operations is not disclosed upfront.
- Leverage points: HCM vs Finance module agents are often metered separately — consolidate workloads to the lower-rate module where possible.

**Zendesk (Automated Resolutions)**
- Dodge pattern: "resolution" is defined as ticket closure without human touch; vendors count agent-escalated-then-closed tickets as automated, inflating counts.
- Leverage points: press for a clear definition of "resolution" in the contract; negotiate a cap on resolution-count charges per billing period.

**SAP (BTP Credits / API Call Units)**
- Dodge pattern: governed-path discounts (via SAP Integration Suite) are real but not automatically applied — you must use blessed APIs to qualify.
- Leverage points: legacy ABAP RFC calls do not qualify for the governed-path discount; migrating to SAP Integration Suite APIs reduces cost and is a concession you can extract.

## Phase 2: Generate the Playbook

Produce a four-part playbook structured as:

### Part 1 — Opening Anchors (first 10 minutes)

Three questions to ask at the opening of the renewal call to establish information asymmetry in your favor:

```
[Q1] "Before we review the proposal, can you walk me through how [vendor] meters agent operations — specifically the conversion from [credit unit] to individual actions, and whether that ratio is fixed for the contract term?"

[Q2] "Our usage has changed since the last renewal — we've deployed [N] agents that perform [operation types]. Which of those operations consume [meter unit], and at what rate per operation?"

[Q3] "Does this proposal include both the seat cost for our [N] users and a separate metered charge for agent operations those users trigger? If so, we need to see those two buckets itemized."
```

Customize the bracketed placeholders using the provided vendor name and usage details.

### Part 2 — Mid-Conversation Probes

Four targeted probes for the negotiation middle — use after the vendor has presented their numbers:

```
[P1] Cap protection: "Is there a monthly or annual hard cap on [meter unit] charges? If not, what's the contractual ceiling on variable agent costs?"

[P2] Identity double-billing: "If our agents use delegated user credentials (OAuth/SSO), does that operation incur both a seat charge for the user and a [meter unit] charge for the agent? Show me a sample billing event."

[P3] Governed-path discount: "Does [vendor] offer a lower meter rate for agents that use the governed API path vs raw REST/API calls? If yes, is that discount contractually guaranteed?"

[P4] Audit rights: "What usage reporting is available — can we pull per-operation meter consumption by agent identity, with timestamps, via API or downloadable report? What's the SLA on billing dispute resolution?"
```

### Part 3 — Closing Protection Clauses

Three clauses to request in writing before signing. These are not standard inclusions — you must ask:

```
[C1] Meter-change notice: "Any change to the [meter unit]-to-action conversion ratio or meter definition requires 90 days written notice and gives us the right to renegotiate pricing without penalty."

[C2] Volumetric cap: "Agent-generated [meter unit] charges are capped at $[N]/month. Overages require pre-approval before billing."

[C3] Exit portability: "On contract termination, we retain the right to export all agent configuration, workflow definitions, and historical meter usage data in a standard format within 30 days, at no additional charge."
```

### Part 4 — The One Question They Will Try to Dodge

Surface the vendor-specific dodge question — the question whose answer would most shift the negotiation:

Generate this from the vendor profile (Phase 1). Format as:

```
## The One Question [Vendor] Will Try to Dodge

**The question:** "[exact question text]"

**Why they dodge it:** [one sentence on what the answer reveals]

**How to press:** If they redirect or say "that depends on your configuration," respond: "Can you put the answer in writing in the order form? If the rate is genuinely configuration-dependent, we need the min/max range and the conditions that determine it documented before we sign."

**What a good answer looks like:** [one sentence — what transparency looks like on this specific point]
```

## Rules

- Every output must be specific to the vendor named. Generic "ask about pricing" advice is not acceptable.
- If the user provides contract terms, surface specific gaps — don't produce a generic playbook when vendor-specific leverage is available.
- Closing protection clauses must be framed as specific contract language, not as suggestions to "ask about" something.
- The dodge question must name the specific opacity tactic for that vendor — not a generic "ask about hidden fees."
- If the vendor is not in the reference table, produce the generic playbook and clearly flag it as unverified for that specific vendor.

## Verification Checklist

- [ ] All four playbook sections present (opening anchors, probes, closing clauses, dodge question)
- [ ] Opening anchors customized with vendor name, meter unit, and user's operation types
- [ ] Closing clauses written as specific contract language, not suggestions
- [ ] Dodge question names the vendor-specific opacity tactic
- [ ] Vendor-not-in-reference case flagged if applicable

## Source

Nate's Newsletter, 2026-05-15 — "SaaS Agent Licensing: What Your 2026 Renewal Will Look Like"
Core insight: SaaS vendors are rewriting 2026 contracts around an agent meter procurement teams don't yet know how to negotiate. A vendor-specific interrogation playbook that distinguishes fair agent licensing (transparent, capped, portable, identity-aware) from rent-seeking (opaque, uncapped, lock-in, double-bills human + agent) is the procurement team's primary defense.
