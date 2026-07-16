---
name: control-map
description: Walk any agent workflow through a 7-row control map (runtime, governed data, identity/principal, action authorization, payment authority, observability, kill switch) to identify which row fails first and generate concrete remediations. Use when designing a new agent workflow, auditing an existing one, or answering "what controls does this agent have?" before shipping.
---

# Control Map

Walk any agent workflow through the 7 load-bearing control rows that separate a safe, production-grade agent from a "scary" one. Identifies the first failing row and produces targeted remediations.

## Trigger

Use when the user:
- Describes an agent workflow and asks "is this safe to ship?", "what controls does it have?", or "which row fails first?"
- Says "run the control map", "control layer audit", "7-row check", or "/control-map"
- Is designing a new agent and wants to sanity-check the control architecture before writing code

## Phase 1: Workflow Intake

Accept a description of the agent workflow. Ask for:
- What the agent does (purpose and scope)
- What tools, APIs, or systems it calls
- Whether it can spend money, write to persistent storage, or send external messages
- Whether it runs autonomously (scheduled) or only on human request

If the description is vague, ask one clarifying question before proceeding.

## Phase 2: 7-Row Control Map Evaluation

Evaluate each row in order. Answer PRESENT / PARTIAL / ABSENT with one-line evidence:

### Row 1: Runtime
Can the agent's execution be paused or cancelled mid-run?

Evidence to look for: process kill signal, task cancellation endpoint, timeout enforced at the runner level, ability to stop the agent loop without losing state.

**PRESENT**: runtime has an explicit cancel/pause endpoint that takes effect within one tool-call cycle.
**PARTIAL**: process can be killed externally but state is lost or the next schedule re-runs immediately.
**ABSENT**: no documented way to stop a running agent instance other than killing the host process.

### Row 2: Governed Data
Is the data the agent reads and writes protected by access policy?

Evidence to look for: row-level security, scoped read tokens, data access logged per-agent, no broad wildcard SELECT or write grants.

**PRESENT**: agent uses scoped credentials with policy enforcement; wildcard grants are absent.
**PARTIAL**: access is scoped but not audited, or logging exists but policy enforcement is absent.
**ABSENT**: agent uses shared admin credentials or broad production database access.

### Row 3: Identity / Principal
Does the agent have a distinct, durable identity separate from a human user?

Evidence to look for: dedicated service account or bot token (not a personal API key), machine identity that can be revoked independently, identity traceable to the agent in audit logs.

**PRESENT**: agent has its own service identity; revocation of that identity stops the agent without affecting humans.
**PARTIAL**: agent uses a shared bot token or a scoped personal token but revoking it would also break other services.
**ABSENT**: agent operates under a human user's credentials.

### Row 4: Action Authorization
Is there an explicit allowlist of actions the agent is permitted to take?

Evidence to look for: tool allowlists in agent config, scoped OAuth/API permission grants, CLAUDE.md or AGENTS.md with explicit tool restrictions, human-in-the-loop gate before destructive actions.

**PRESENT**: agent has a documented, enforced allowlist; actions outside the list fail at the authorization layer.
**PARTIAL**: allowlist exists in docs or config but is not enforced at runtime.
**ABSENT**: agent can call any available tool or API without restriction.

### Row 5: Payment Authority
Is there a defined spending limit and a freeze mechanism?

Evidence to look for: per-agent spend cap in the payment provider, ability to freeze the agent's payment instrument without affecting others, audit log of agent-initiated charges.

**PRESENT**: agent has a per-agent spending cap; a one-step freeze stops all charges.
**PARTIAL**: global account limit exists but is shared across agents; no per-agent freeze.
**ABSENT**: agent has access to a payment method with no programmatic limit or freeze path.

*If the agent cannot spend money, mark this row N/A.*

### Row 6: Observability
Can a human reconstruct what the agent did, when, and why after the fact?

Evidence to look for: structured log of every tool call with timestamp and input/output, cost tracking per run, trace ID that links a multi-step agent run into one unit.

**PRESENT**: every tool call is logged with timestamp, input, output, and run trace ID; logs are queryable.
**PARTIAL**: some logging exists but inputs/outputs are redacted, trace IDs are missing, or logs are unstructured.
**ABSENT**: only success/failure status is logged; no way to audit what the agent actually did.

### Row 7: Kill Switch
If the agent goes wrong, can it be stopped across all 5 sub-layers simultaneously?

Evaluate each sub-layer:
- **Runtime cancel**: execution can be stopped mid-run (same as Row 1)
- **Credential revocation**: the agent's identity (Row 3) can be revoked, making further API calls fail
- **Gateway block**: tool calls can be blocked at the gateway layer (MCP server, API gateway, firewall rule)
- **Payment freeze**: the agent's payment instrument can be frozen (Row 5, or N/A)
- **Workflow interrupt**: if the agent uses a workflow framework (LangGraph, Temporal, etc.), the in-progress workflow can be stopped via that framework's API

**PRESENT**: at least 4 of 5 sub-layers have a documented, one-step kill path.
**PARTIAL**: 2-3 sub-layers have kill paths; the others require multi-step manual intervention.
**ABSENT**: fewer than 2 sub-layers have a documented kill path.

## Phase 3: First-Failure Identification

Scan the rows in order. Report the **first** row that is ABSENT or PARTIAL as the primary failure point.

If multiple rows are ABSENT, report the lowest-numbered one as the blocking failure and list the others as secondary.

## Phase 4: Report

```
## Control Map: [Agent/Workflow Name]
Date: [date]

| Row | Name | Status | Evidence |
|-----|------|--------|----------|
| 1 | Runtime | PRESENT/PARTIAL/ABSENT | [one-line evidence] |
| 2 | Governed Data | ... | ... |
| 3 | Identity/Principal | ... | ... |
| 4 | Action Authorization | ... | ... |
| 5 | Payment Authority | ... / N/A | ... |
| 6 | Observability | ... | ... |
| 7 | Kill Switch | ... | ... |

### First Failure: Row [N] - [Row Name]
[One sentence on why this row fails and what the production consequence is.]

### Remediation (ordered by impact)
1. **Row [N] - [Row Name]**: [Specific action - tool, config setting, or architectural change.]
2. [Next failing row...]

### Ready to Ship?
YES - all rows PRESENT (or N/A where applicable).
NO - fix Row [N] before deploying to production.
```

## Phase 5: Follow-up Offers

After delivering the report, offer:
- "Want a kill-switch audit? I can verify each of the 5 kill-switch sub-layers in detail." (run `/kill-switch-audit`)
- "Want to pressure-test your vendor choices against the same 7 rows?" (run `/vendor-pressure-test`)

## Verification

A good control-map pass:
- Evaluates every row with no skipping
- Uses PRESENT/PARTIAL/ABSENT consistently
- Cites specific evidence for each row, not generic statements
- Identifies exactly one primary failure point (the lowest-numbered failing row)
- Produces at least one concrete, actionable remediation per failing row

## Source

Extracted from Nate's Newsletter (natesnewsletter@substack.com), captured 2026-05-20.
Article: "Seven questions decide whether your AI agent ships. Most teams can answer two."
URL: https://natesnewsletter.substack.com/p/agent-infrastructure-control-layer
Technique: 7-row control map for agent production readiness.
