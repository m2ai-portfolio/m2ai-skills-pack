---
name: automation-platform-decision-guide
description: Decision-support skill for choosing between agent automation platforms. Given a use case and org context, recommends between scheduling platforms (n8n, Make, Workspace Agents), custom agent frameworks (Claude Code, SDK), and personal AI assistants — and explains the governance, cost, and lock-in tradeoffs of each.
---

# Automation Platform Decision Guide

Produces a structured recommendation for which AI automation platform to adopt for a given use case. Prevents common mistakes: over-engineering with custom frameworks when a scheduling platform suffices, or adopting a hosted platform when governance requirements demand on-prem control.

## Trigger

Use when the user says "/automation-platform-decision-guide", "which automation platform should we use", "should we use Workspace Agents or build custom", "n8n vs Make vs custom agent", "which platform for our AI automation program", or when planning enterprise AI automation infrastructure.

## Phase 1: Intake

Collect from the user:

1. **Primary use case** — describe 2-3 workflows you want to automate.
2. **Organization size** — individual, small team (<20), mid-size (20-500), enterprise (500+).
3. **Technical capacity** — who maintains automation infrastructure? (developer, ops, non-technical admin, none)
4. **Governance requirements** — are there data residency, compliance, or security requirements? (HIPAA, SOC 2, GDPR, air-gap)
5. **Budget posture** — credit-based (pay per run) vs. flat-cost (self-hosted)?
6. **Existing stack** — which tools are already connected? (Slack, Gmail, Notion, Salesforce, SharePoint, Jira, etc.)

## Phase 2: Evaluate Against Four Platforms

Score each platform against the user's context. Use: STRONG FIT / ACCEPTABLE / POOR FIT.

### Platform 1: Hosted Scheduling Platform (e.g., Workspace Agents, Zapier, Make, n8n Cloud)

| Factor | Ideal profile |
|--------|--------------|
| Setup time | Low — visual builder, pre-built connectors |
| Technical capacity needed | Low — non-technical admins can manage |
| Data residency | Data leaves your infrastructure (unless enterprise tier) |
| Cost model | Credit-based or per-task pricing |
| Maintenance overhead | Vendor-managed infrastructure |
| Lock-in risk | High — workflow definitions stored in vendor's format |
| Best for | Repeating ops, cross-tool data movement, non-technical teams |
| Poor for | Novel reasoning tasks, compliance-heavy environments, cost-sensitive at scale |

### Platform 2: Open Scheduling Platform (self-hosted n8n, Activepieces, Windmill)

| Factor | Ideal profile |
|--------|--------------|
| Setup time | Medium — requires server, Docker, or cloud VM |
| Technical capacity needed | Medium — developer or ops familiarity needed |
| Data residency | Full control — runs in your infrastructure |
| Cost model | Infrastructure cost only; no per-run fees |
| Maintenance overhead | Self-managed (updates, backups, monitoring) |
| Lock-in risk | Low — open-source, exportable workflows |
| Best for | Compliance requirements, cost-sensitive at scale, orgs with DevOps capacity |
| Poor for | Non-technical teams, one-person ops without support |

### Platform 3: Custom Agent Framework (Claude Code, agent SDKs, direct API)

| Factor | Ideal profile |
|--------|--------------|
| Setup time | High — requires development, CI/CD, deployment |
| Technical capacity needed | High — software developer required |
| Data residency | Full control |
| Cost model | LLM API token cost; infrastructure cost |
| Maintenance overhead | Fully self-managed |
| Lock-in risk | Low — code is yours; provider-switchable with effort |
| Best for | Novel workflows not supported by connectors, workflows requiring code execution, tight integration with existing codebases |
| Poor for | Teams without engineering support, simple data-movement workflows |

### Platform 4: Personal AI Assistant (chat-based, interactive)

| Factor | Ideal profile |
|--------|--------------|
| Setup time | None |
| Technical capacity needed | None |
| Data residency | Data goes to provider (unless on-prem model) |
| Cost model | Subscription or token-based |
| Maintenance overhead | None |
| Lock-in risk | Medium — prompts are portable but workflows are manual |
| Best for | One-off tasks, tasks requiring judgment on novel inputs, high-stakes outputs with human review |
| Poor for | Repeating tasks, tasks requiring system integrations |

## Phase 3: Recommendation

Based on the intake and evaluation:

1. **Primary recommendation** — which platform and why.
2. **Secondary option** — what you'd use if the primary has a deal-breaker.
3. **Hard blockers** — if any factor makes a platform unacceptable (data residency, no technical support), flag it explicitly.

### Decision heuristics

- If compliance + data residency is required → self-hosted platform or custom framework; never hosted SaaS
- If no technical capacity → hosted scheduling platform only
- If workflow requires code execution or novel reasoning → custom framework
- If budget-sensitive at scale (>1000 runs/month) → self-hosted or custom; hosted credit models become expensive fast
- If workflows cross 5+ tools with no custom logic → scheduling platform (hosted or self-hosted)
- If workflows are unique to your org's data model → custom framework

## Phase 4: Lock-In and Exit Analysis

For the recommended platform, provide a brief lock-in assessment:

```
Lock-in risk: LOW | MEDIUM | HIGH

What's vendor-specific:
- {list: workflow definitions, data stored in platform, connector configs}

Exit path:
- {how to migrate off if vendor raises prices, acquires, or breaks}

Mitigation:
- {one concrete step to reduce lock-in — e.g., "Export workflow definitions weekly to git"}
```

## Phase 5: Output

```
AUTOMATION PLATFORM RECOMMENDATION
===================================
Use case: {summary}
Org profile: {size + technical capacity}
Governance: {requirements}

Recommendation: {Platform name}
Fit:            STRONG FIT
Rationale:      {2-3 sentences}

Alternative:    {Platform 2 name} — use if {condition}

Hard blockers ruled out:
  - {Platform X}: {reason disqualified}

Lock-in risk:   {LOW|MEDIUM|HIGH}
Exit path:      {one sentence}

Next step: {concrete action — e.g., "Set up a self-hosted n8n instance and migrate the top 3 workflows" | "Start with the hosted free tier and re-evaluate at 500 runs/month"}
===================================
```

## What This Does NOT Do

- Does not evaluate specific vendors within a category (e.g., n8n vs Activepieces feature comparison). Use vendor docs for that.
- Does not estimate implementation cost or timeline.
- Does not score individual workflows for automation fit. Use a workflow fit scorer for that.
- Does not account for existing contractual commitments (e.g., Salesforce bundle pricing that includes automation).

## Source

Framework distilled from Nate Kadlac newsletter (2026-04-27): "Your team spends 5 hours a week on work a sales consultant automated in an afternoon." Nate's analysis of Workspace Agents (April 2026) as an ops/automation platform rather than an AI assistant — and its governance and pricing implications — is the anchor for this platform comparison framework.
