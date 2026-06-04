---
name: kill-switch-audit
description: Verify that a named agent in production has a real, one-step kill path at each of 5 layers (runtime cancel, credential revocation, gateway block, payment freeze, workflow interrupt). Use before shipping a new autonomous agent, during a security review, or any time you need to answer "can we actually stop this agent right now?"
---

# Kill-Switch Audit

Verifies that a live or pre-production agent has a documented, executable kill path at each of the 5 layers that constitute a complete emergency stop. Produces a per-layer pass/fail receipt with remediation for any layer that fails.

## Trigger

Use when the user:
- Says "kill-switch audit", "can we stop this agent?", "verify our kill paths", or "/kill-switch-audit"
- Is about to deploy an autonomous agent and wants to confirm stop controls exist
- Suspects an agent is misbehaving and needs to know which kill paths are actually available right now
- Is responding to a security review that asks "how do you stop a rogue agent?"

## Phase 1: Agent Intake

Ask for:
- Agent name or description
- Runtime environment (Claude Code, LangGraph, Temporal, custom scheduler, etc.)
- Identity mechanism (service account, API key, bot token)
- Whether the agent can make payments or call payment APIs
- Whether the agent uses a workflow framework (LangGraph, Prefect, Temporal, etc.)

If the user cannot answer these questions, note which layers will be scored UNKNOWN rather than PASS/FAIL.

## Phase 2: 5-Layer Kill-Switch Verification

Evaluate each layer independently. Score PASS / PARTIAL / FAIL / UNKNOWN.

### Layer 1: Runtime Cancel
Can the agent's current execution be stopped mid-run without killing the entire host process?

Verification questions:
- Is there a cancellation endpoint or signal that takes effect within one tool-call cycle?
- If the agent is scheduled, does cancelling the current run prevent the next scheduled run?
- Does cancellation produce a clean state (no orphaned side effects)?

**PASS**: explicit cancel/pause API exists; tested or documented; stops within one cycle.
**PARTIAL**: process kill is possible (SIGTERM/SIGKILL) but state is lost or next run fires immediately.
**FAIL**: no documented stop mechanism other than killing the host machine.
**UNKNOWN**: insufficient information to verify.

### Layer 2: Credential Revocation
Can the agent's identity (API key, service account, bot token) be revoked in one step without affecting other services?

Verification questions:
- Does the agent use its own dedicated credential (not shared with humans or other services)?
- Is revocation a single API call or dashboard action (not a multi-step service restart)?
- After revocation, do subsequent API calls fail immediately (not after TTL expiry)?

**PASS**: dedicated credential exists; one-step revocation confirmed; immediate effect.
**PARTIAL**: dedicated credential exists but revocation requires a service restart, or TTL means the agent can continue calling APIs for minutes/hours after revocation.
**FAIL**: agent uses a shared credential; revoking it breaks other services, making revocation impractical.
**UNKNOWN**: insufficient information to verify.

### Layer 3: Gateway Block
Can the agent's outbound tool calls be blocked at the gateway layer without touching the agent's code?

Verification questions:
- Is there an MCP server, API gateway, or firewall rule that mediates the agent's tool calls?
- Can specific tools or all tools be blocked by updating the gateway config (not redeploying the agent)?
- Is the block effective immediately without a cache TTL delay?

**PASS**: gateway layer exists and can block specific tools or all tools in under 60 seconds.
**PARTIAL**: gateway exists but blocking requires a redeployment or has a multi-minute TTL delay.
**FAIL**: agent calls APIs directly; no intermediary layer to block.
**UNKNOWN**: insufficient information to verify.

### Layer 4: Payment Freeze
Can the agent's payment instrument be frozen independently of other agents and services?

Verification questions:
- Does the agent have its own payment instrument (not a shared company card or API key)?
- Is there a one-step freeze that stops charges without freezing the whole account?
- Is an audit log of agent-initiated charges available to reconstruct spending?

**PASS**: per-agent payment instrument with one-step freeze and charge audit log.
**PARTIAL**: shared payment instrument with a global spending cap; no per-agent freeze.
**FAIL**: agent has payment access with no programmatic limit or freeze mechanism.
**N/A**: agent cannot initiate payments. Mark N/A and skip.

### Layer 5: Workflow Interrupt
If the agent uses a workflow framework, can an in-progress workflow be stopped via that framework's API?

Verification questions:
- Does the agent use LangGraph, Temporal, Prefect, Celery, or a similar workflow framework?
- Does that framework expose a workflow cancellation API (not just process kill)?
- Can a specific workflow run be stopped without stopping all runs?

**PASS**: workflow framework exposes cancellation API; specific run can be stopped.
**PARTIAL**: framework supports cancellation but it requires admin access or affects all concurrent runs.
**FAIL**: no workflow framework interrupt available; only process kill.
**N/A**: agent does not use a workflow framework. Mark N/A.

## Phase 3: Kill-Switch Receipt

```
## Kill-Switch Audit: [Agent Name]
Date: [date]

| Layer | Name | Status | Evidence / Gap |
|-------|------|--------|---------------|
| 1 | Runtime Cancel | PASS/PARTIAL/FAIL/UNKNOWN | [what was verified or what is missing] |
| 2 | Credential Revocation | ... | ... |
| 3 | Gateway Block | ... | ... |
| 4 | Payment Freeze | ... / N/A | ... |
| 5 | Workflow Interrupt | ... / N/A | ... |

### Overall Kill-Switch Status
COMPLETE - 4+ layers PASS (or N/A where applicable). Agent can be stopped reliably.
PARTIAL - [N] layers PASS, [N] PARTIAL/FAIL. Kill is possible but requires multi-step coordination.
INCOMPLETE - [N] layers FAIL or UNKNOWN. Do not deploy to production without remediation.

### Remediation (ordered by ease)
1. **Layer [N] - [Name]**: [Specific action to establish or fix this kill path.]
2. [Next...]

### Incident Response Guide (if status is COMPLETE or PARTIAL)
If the agent needs to be stopped right now:
1. [Layer with fastest effect]: [exact command or action]
2. [Next fastest]: [exact command or action]
3. [Remaining layers to close the loop]: [exact command or action]
```

## Phase 4: Follow-up Offers

After delivering the receipt, offer:
- "Want to run the full 7-row control map for this agent?" (run `/control-map`)
- "Want to document this kill procedure in the agent's AGENTS.md?"

## Verification

A good kill-switch audit:
- Scores every layer (no skipping; UNKNOWN is valid when information is unavailable)
- Does not score a layer PASS based on assumed or theoretical capability - only verified documentation, tested paths, or explicit configuration
- Produces an incident response guide (ordered by kill speed) when status is COMPLETE or PARTIAL
- Distinguishes "kill process" (brute force) from "cancel gracefully" (designed kill path)

## Source

Extracted from Nate's Newsletter (natesnewsletter@substack.com), captured 2026-05-20.
Article: "Seven questions decide whether your AI agent ships. Most teams can answer two."
URL: https://natesnewsletter.substack.com/p/agent-infrastructure-control-layer
Technique: 5-layer kill-switch verification protocol for production agents.
Related: control-map (full 7-row agent control audit, of which kill switch is Row 7).
