---
name: vendor-pressure-test
description: Run a vendor pitch, RFP response, or internal proposal through the 7-row agent control-layer lens to identify which rows are answered, dodged, or hidden behind buzzwords, and what each dodge costs in production. Use when evaluating a vendor for an agent deployment, responding to an RFP, or stress-testing your own internal proposal before presenting it.
---

# Vendor Pitch Pressure-Test

Stress-tests any agent-related vendor pitch, RFP response, or internal proposal by running it through the 7-row agent control-layer framework. Identifies exactly what is answered, what is evaded, and what the evasion costs if you buy.

## Trigger

Use when the user:
- Provides a vendor pitch deck, RFP response, or internal proposal and asks "is this solid?", "what are they hiding?", or "should we buy this?"
- Says "pressure-test this pitch", "vendor stress test", "run the 7-row check on this vendor", or "/vendor-pressure-test"
- Is on the buying side and wants to know which questions to ask a vendor before signing

## Phase 1: Intake

Accept the vendor material. This can be:
- A pitch deck or slide summary
- An RFP response document
- An internal proposal ("we should use X for our agent runtime")
- A product one-pager or website copy

Ask the user: "What is this vendor claiming to solve?" if the pitch purpose is unclear. Do not proceed without understanding the claimed value.

## Phase 2: 7-Row Pressure Test

For each row, determine whether the vendor pitch **answers**, **dodges**, or **is silent** on that row. Then assess the cost of the dodge.

Scoring:
- **ANSWERED**: the vendor explicitly addresses this row with verifiable claims (API docs, SLA, configuration options)
- **DODGED**: the vendor mentions the row but deflects with marketing language, vague promises, or "roadmap" claims
- **SILENT**: the vendor does not address this row at all

### Row 1: Runtime
Does the vendor's product expose a documented cancel/pause API for running agent tasks?

Dodge signals: "managed runtime", "always-on", "you don't need to worry about that."
Silence cost: you cannot stop a runaway agent without killing the entire service.

### Row 2: Governed Data
Does the vendor describe data access policy enforcement, scoping, and audit trails at the agent level?

Dodge signals: "enterprise-grade security", "SOC 2 certified", "GDPR compliant" without per-agent data scoping details.
Silence cost: your agent runs on shared broad credentials; a compromised agent exposes everything.

### Row 3: Identity / Principal
Does the vendor provide per-agent machine identity that is independently revocable?

Dodge signals: "API key management", "team-level access control", "SSO integration."
Silence cost: revoking a rogue agent's identity also breaks every other service using the same key.

### Row 4: Action Authorization
Does the vendor provide runtime enforcement of agent action allowlists (not just documentation)?

Dodge signals: "configurable", "flexible permissions", "you control what the agent can do" with no description of enforcement mechanism.
Silence cost: agent can call any connected API; configuration drift is undetected until an incident.

### Row 5: Payment Authority
Does the vendor expose per-agent spend limits and a programmatic freeze?

Dodge signals: "usage-based pricing", "set your budget in the dashboard", "billing alerts."
Silence cost: a looping or compromised agent can spend unbounded amounts before a human notices.

*If the vendor's product has no payment component, score this row N/A.*

### Row 6: Observability
Does the vendor provide structured, per-run trace logs of every tool call with inputs, outputs, and cost?

Dodge signals: "real-time monitoring", "dashboards", "analytics" without specifying what is logged at the tool-call level.
Silence cost: you cannot reconstruct what the agent did after an incident; compliance audits fail.

### Row 7: Kill Switch
Does the vendor describe a coordinated multi-layer kill path (not just "stop button")?

Dodge signals: "emergency stop", "pause feature", "contact support to deactivate."
Silence cost: stopping a live agent requires coordinating multiple manual steps across teams during an incident.

## Phase 3: Dodge Analysis

For each DODGED or SILENT row:
1. Name the exact language the vendor used (quote it if available)
2. Explain the gap between the language and what is actually needed
3. State the production cost if you deploy without this row answered

## Phase 4: Report

```
## Vendor Pressure Test: [Vendor/Product Name]
Date: [date]
Evaluator: [context, e.g. "evaluating for agent runtime replacement"]

| Row | Name | Status | Vendor's Claim (or silence) |
|-----|------|--------|-----------------------------|
| 1 | Runtime | ANSWERED/DODGED/SILENT | [exact claim or "not mentioned"] |
| 2 | Governed Data | ... | ... |
| 3 | Identity/Principal | ... | ... |
| 4 | Action Authorization | ... | ... |
| 5 | Payment Authority | ... / N/A | ... |
| 6 | Observability | ... | ... |
| 7 | Kill Switch | ... | ... |

### Dodges and Their Costs
**Row [N] - [Row Name]**: "[exact vendor language]"
Gap: [what is actually needed vs. what was said]
Cost: [what breaks in production if you buy without this answered]

[Repeat for each DODGED or SILENT row]

### Questions to Ask Before Signing
1. [Row N]: "[Specific question that forces a verifiable answer, not a sales answer]"
2. [Row N]: ...

### Recommendation
PROCEED - all critical rows answered; minor gaps documented.
DUE DILIGENCE - [N] rows dodged; get written commitments before signing.
PASS - [N] rows silent on critical production requirements.
```

## Phase 5: Follow-up Offers

After delivering the report, offer:
- "Want me to run your own proposal through the same lens?" (run `/control-map` on the internal alternative)
- "Want to map which vendor covers which rows across the competitive landscape?" (run `/vendor-map` if available)

## Verification

A good pressure-test pass:
- Quotes or cites specific vendor language for DODGED rows (not inferred from generic sales material)
- Distinguishes "marketing claim" from "verifiable API / SLA / configuration option"
- Produces at least one question per DODGED or SILENT row that forces a concrete, checkable answer
- Does not recommend PROCEED if any critical row (Runtime, Identity, Kill Switch) is SILENT

## Source

Extracted from Nate's Newsletter (natesnewsletter@substack.com), captured 2026-05-20.
Article: "Seven questions decide whether your AI agent ships. Most teams can answer two."
URL: https://natesnewsletter.substack.com/p/agent-infrastructure-control-layer
Technique: 7-row skeptic lens for evaluating vendor agent-control claims.
Related: counterargument-stress-test (general argument pressure-testing), control-map (design-side 7-row evaluation).
