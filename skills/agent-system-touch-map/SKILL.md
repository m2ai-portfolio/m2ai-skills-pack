---
name: agent-system-touch-map
description: Map every workflow to the SaaS systems it touches, the operations performed on each system, and the vendor billing meter each operation triggers. Input a workflow description and list of integrated SaaS vendors; output a system-by-system table with operation classifications, meter hits, identity model, and flagged cost-risk rows. Use when the user says "agent-system-touch-map", "map agent costs", "SaaS meter map", "what will this agent cost to run", "agent licensing exposure", or before a SaaS contract renewal where agent workloads are involved.
---

# Agent System Touch Map

Produce a structured map of every SaaS system an agent workflow touches, the operations it performs, the vendor billing meter each operation hits, and the identity model used. Surfaces hidden agent-economy cost exposure before procurement or contract renewal locks it in.

## When to Invoke

- User says "agent-system-touch-map", "map agent costs", "SaaS meter map", "what will this agent cost", "agent licensing exposure"
- Before a SaaS contract renewal where agent workloads are planned or already deployed
- When scoping a new agent that will touch one or more enterprise SaaS systems
- After completing a workflow design to validate cost assumptions before build

## Inputs

1. **Workflow description** — what does the agent do? (one paragraph; a bullet-point flow is fine)
2. **Integrated SaaS vendors** — which systems does the workflow touch? (list vendor names; e.g., Salesforce, Microsoft 365, ServiceNow, HubSpot, Atlassian, Workday, Zendesk, SAP)

If either input is missing, ask before proceeding. The output is only as accurate as the workflow description — don't invent system interactions.

## Phase 1: Parse the Workflow

Decompose the workflow into discrete **agent operations** — atomic actions the agent performs. Classify each operation on the 9-step taxonomy:

| Step | Operation | Governance requirement |
|------|-----------|----------------------|
| 1 | **read** | None — no approval needed |
| 2 | **search** | None |
| 3 | **summarize** | None |
| 4 | **draft** | None |
| 5 | **recommend** | Optional review |
| 6 | **write** | HIL approval strongly recommended |
| 7 | **approve** | Mandatory human gate |
| 8 | **execute** | Mandatory human gate |
| 9 | **delete** | Mandatory human gate + audit log |

Steps 1-5 are low-governance. Steps 6-9 are high-governance and typically trigger metered billing events.

## Phase 2: Map Operations to Vendor Meters

For each system in the vendor list, map identified operations to the vendor's known billing meter. Use the reference table below as a starting point; flag any vendor not in the table as **[UNKNOWN METER — verify with vendor before renewal]**.

### Vendor Meter Reference (2026-Q2)

| Vendor | Meter name | Unit | Approx triggers |
|--------|-----------|------|----------------|
| Salesforce | Flex Credits / Agentforce Credits | Credit per action | Any Agentforce-dispatched operation; flows via Apex Action cost more than REST |
| Microsoft 365 | Copilot Credits / Agent 365 Credits | Credit per message or action | Copilot Studio agent turns; Graph API calls via agent identity incur separate metering |
| ServiceNow | Assist Currency / Action Fabric units | Unit per flow step | GenAI/Assist actions; governed-path (Flow Designer) cheaper than raw REST |
| HubSpot | Breeze Outcomes / Actions | Per AI-assisted outcome | AI-drafted emails, scoring events, sequence automation |
| Atlassian | Rovo Credits | Credit per AI interaction | Rovo agent queries, Confluence AI, Jira AI suggestions |
| Workday | Flex Credits / Agent System of Record units | Per agent request | HCM/Finance agent operations; reading cheaper than writing |
| Zendesk | Automated Resolutions | Per resolved ticket | Any ticket resolved without human agent touch |
| SAP | API Call units / BTP credits | Per API call | BTP extension operations; some actions governed-path discounted |

*This table is a starting point. Conversion ratios and SKU names change at renewal — always verify current rates from the vendor.*

## Phase 3: Map Identity Model

For each system, identify the identity used:

| Identity type | What it means | Billing implication |
|--------------|--------------|-------------------|
| Human SSO / delegated OAuth | Agent acts as a named user | May count as a seat + agent credit double-bill |
| Service account | Agent uses a shared system identity | Usually one seat regardless of agent volume |
| OBO (On-Behalf-Of) token | Agent acts under a delegated human token | Audit trail exists; some vendors charge the human seat |
| Agent identity (Entra Agent ID, Salesforce agent user) | Agent has its own identity | Clean separation; meter is agent-only |

Flag **double-bill risk** when a vendor would charge both a human seat and an agent credit for the same operation.

## Phase 4: Output — System Touch Map

Produce the following table for each vendor in the workflow:

```
## System Touch Map — [Workflow Name]
Generated: [today's date]

---

### [Vendor Name]

| Operation | Taxonomy step | Meter hit | Identity used | Cost-risk flag |
|-----------|--------------|-----------|---------------|----------------|
| [action]  | read (1)     | none      | service account | ✅ low risk   |
| [action]  | write (6)    | Flex Credit | human SSO   | ⚠️ DOUBLE-BILL RISK |
| [action]  | execute (8)  | Flex Credit | agent identity | ⚠️ HIGH COST — approval gate recommended |

**Identity model:** [type]
**Governed-path available?** [yes / no / unknown]
**Estimated meter events per workflow run:** [N]
**Cost risk:** [low / medium / high / unknown]

---
```

After the per-vendor tables, add a **Summary Risk Table**:

```
## Summary Risk Table

| Vendor | Highest-risk operation | Meter type | Identity risk | Overall |
|--------|----------------------|-----------|--------------|---------|
| ...    | ...                  | ...       | ...          | ...     |

## Flags for Renewal Negotiation

- [ ] [Vendor]: [specific flag — e.g., "Flex Credit conversion ratio not disclosed in current contract"]
- [ ] [Vendor]: [e.g., "human SSO + agent credit double-bill on write operations"]
- [ ] [Vendor]: [e.g., "governed path available but agent uses raw REST — switch before renewal"]
```

## Rules

- Every vendor in the input list must appear in the output, even if no metered operations were identified (mark as "no metered operations detected — verify").
- Never invent operations the user didn't describe. If the workflow is ambiguous, flag the ambiguity and ask.
- The vendor meter table is a reference starting point, not ground truth. Always add the disclaimer that conversion ratios change at renewal.
- Steps 6-9 (write/approve/execute/delete) must always carry a cost-risk flag — these are where the meters click fastest.
- If a vendor is not in the reference table, mark as [UNKNOWN METER] and recommend vendor documentation review before renewal.

## Verification Checklist

- [ ] Every vendor in the input appears in the output table
- [ ] Every operation is classified on the 9-step taxonomy
- [ ] Every operation that maps to a meter has a cost-risk flag
- [ ] Identity model is documented per vendor
- [ ] Double-bill risk flagged where human SSO is used for agent actions
- [ ] Summary risk table produced
- [ ] Renewal flags section populated

## Source

Nate's Newsletter, 2026-05-15 — "SaaS Agent Licensing: What Your 2026 Renewal Will Look Like"
Core insight: SaaS vendors are quietly rewriting 2026 contracts to add an agent meter on top of seats — procurement teams have not yet learned to negotiate it. A system touch map is the prerequisite for any renewal conversation involving agents.
