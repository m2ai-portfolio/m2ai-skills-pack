---
name: middleware-trap-detector
description: Diagnose whether an agent deployment is falling into the "middleware trap" — wrapping legacy systems without redesign, mirroring manual bottlenecks at machine speed, or pass-through pipelines with no validation. Use when the user says "middleware trap", "deployment health", "is this deployment safe", "wrapping legacy", "automated bottleneck", or wants a pre-deployment risk scan of an existing agent integration.
---

# Middleware Trap Detector

Lightweight diagnostic that takes a description, codebase, or config of an existing agent deployment and flags whether it exhibits the **middleware trap**: an agent layered on top of broken foundations that scales every dysfunction at machine speed.

This is the deployment-pattern equivalent of `compensating-complexity-auditor` (which audits prompts) and `bitter-lesson-scorecard` (which audits architecture). It audits the *integration shape*.

## When to Use

- A team is about to ship an agent that integrates with an existing legacy system
- An agent has been live for ~30 days and someone wants a "is this still healthy?" check
- A consulting engagement where you need to triage an existing OpenClaw / Claude Code deployment
- Before approving an agent's promotion from dev to production

## Inputs

- Either: a free-text description of the deployment (system, agent role, data flow, approval gates)
- Or: a path to a codebase + a brief description of what the agent does
- Or: a `.mcp.json`, hooks config, or pipeline DAG file

## Trap Patterns to Detect

Score each pattern as PRESENT / ABSENT / UNKNOWN. Each PRESENT contributes to the overall risk score.

### Trap 1 — Legacy Wrapping Without Redesign
- Agent calls into a legacy API without any data model translation
- Agent's outputs are formatted to match the legacy system's quirks rather than redesigning the workflow
- Tell-tale: agent prompts contain phrases like "format this exactly like the existing report"

### Trap 2 — Pass-Through With No Validation
- Data flows agent → downstream system with no schema check, sanity check, or human gate
- No try/except around external calls; no retry policy; no dead-letter queue
- Tell-tale: pipeline has no validation step between extraction and write

### Trap 3 — Bottleneck Inversion
- Agent's production rate is N× higher than human review capacity
- No batching, no review queue, no auto-approve threshold tuned to capacity
- Tell-tale: PR/email/record output rate >10× the team's historical baseline with the same review headcount

### Trap 4 — Authority Vacuum
- Agent takes actions that no role explicitly owns approval for
- Permissions inherited from a sandbox config; nobody signed off on production scope
- Tell-tale: when asked "who approves X?", the answer is "the agent does it automatically"

### Trap 5 — Dirty Data Propagation
- Agent reads from a known-dirty source (inconsistent formats, stale references) without normalization
- Agent's writes accumulate in places nobody monitors for quality
- Tell-tale: data quality issues exist but were considered "out of scope" for the agent

### Trap 6 — SaaS Replacement Without SLAs
- Agent replaces a paid SaaS tool but doesn't replicate its SLAs (backups, compliance, support)
- Tell-tale: cost savings narrative exists; resilience narrative does not

## Phases

### Phase 1 — Gather context
Ask up to 5 targeted questions if inputs are sparse. Example: "What system does the agent write to?", "What's the human review rate?", "Where does the input data come from?".

### Phase 2 — Score each trap
PRESENT (2 pts), LIKELY (1 pt), ABSENT (0 pts), UNKNOWN (0 pts but flagged).

### Phase 3 — Produce the risk report

```
MIDDLEWARE TRAP REPORT
======================
Deployment: <name>
Overall risk: <LOW | MEDIUM | HIGH | CRITICAL>
Score: X / 12

TRAPS DETECTED
1. [PRESENT] Bottleneck Inversion — agent produces 50 PRs/day, team reviews 5/day
2. [LIKELY]  Authority Vacuum — no documented approver for external API writes
3. [ABSENT]  Legacy Wrapping
...

UNKNOWNS (re-run after answering)
- Data source quality: not assessed

REMEDIATION (ranked by ROI)
1. Add review-capacity gate before scaling output
2. Document approval owner for external writes
3. ...
```

## Verification

- Re-score after applying remediations; score should drop by at least the points from fixed traps
- For agents that fail this check, re-run after 30 days of operation to confirm fixes held
- Cross-check with `agent-blast-radius` to validate that the production rate claims match reality

## Source Attribution

Concept extracted from Nate's Newsletter, 2026-04-05: *"Executive Briefing: OpenClaw Deployments Are Spreading Through Your Org Here's What Nobody Audited"* — specifically the "middleware trap" framing and the four named failure modes (legacy wrapping, bottleneck inversion, authority vacuum, dirty data propagation).
