---
name: action-class-policy
description: Interview the user about their agent usage patterns and risk tolerance, then generate a tiered action-class policy document. Each tier gets classification criteria, required approvals, rollback procedures, and monitoring expectations. Use when someone says "/action-class-policy", "define action classes", "agent permissions policy", "what actions can my agent take unsupervised", or wants a governance framework for agent autonomy.
---

# Action-Class Policy Generator

Produces a tiered action-class policy that governs what agents can do at each autonomy level. Not every agent action carries the same blast radius — this skill makes that explicit and codified.

## Trigger

Use when the user says "/action-class-policy", "define action classes", "agent permissions policy", "agent governance", "what can my agent do without asking", "blast-radius tiers", or wants to establish a structured approval framework for agent workflows.

## Phase 1: Context Interview

Ask the user the following questions (one at a time, not a wall of questions):

1. **What systems do your agents touch?** (e.g., filesystem, databases, external APIs, cloud infra, CI/CD, email/calendar, Slack, production services)
2. **What failure modes have you seen or worried about?** (e.g., accidental deletions, unexpected deploys, runaway API calls, data leaks)
3. **What approval processes already exist?** (e.g., PR reviews, deployment approvals, ticket workflows — even informal ones)
4. **How fast does your team move?** (Are delays for human approval acceptable, or does throughput matter?)
5. **Who needs to understand this policy?** (Just you? A team? A compliance stakeholder?)

Collect enough context to calibrate the tier thresholds. Do not proceed to Phase 2 until you have at least answers to questions 1 and 2.

## Phase 2: Tier Design

Generate a four-tier taxonomy calibrated to the user's systems. Default taxonomy (customize based on answers):

### Tier 0 — Read-Only
- **What**: Reads, queries, searches, diffs, status checks. No state changes.
- **Examples**: reading files, querying databases (SELECT only), fetching API data, running test suites (no side effects), listing resources
- **Approval**: None — agent proceeds autonomously
- **Rollback**: N/A
- **Monitoring**: Log volume; alert on unusually high read rates

### Tier 1 — Write with Review
- **What**: Creates or modifies non-production state. Changes are reversible or low-blast-radius.
- **Examples**: creating/editing files in a feature branch, inserting rows in a dev database, sending internal draft messages, creating draft PRs, calling non-destructive APIs
- **Approval**: Agent proceeds; output is staged/drafted and surfaced to human before publishing
- **Rollback**: Revert commit, delete draft, restore snapshot
- **Monitoring**: Log all writes; flag if write rate exceeds threshold

### Tier 2 — Production Mutation (Human-in-Loop)
- **What**: Modifies production state or data visible to end users / customers.
- **Examples**: merging to main, deploying to production, sending external emails, inserting rows in a production DB, updating live configuration
- **Approval**: Explicit human confirmation required before execution
- **Rollback**: Defined rollback path required before approval is granted
- **Monitoring**: Alert on every execution; retain full audit trail

### Tier 3 — Infrastructure Change (Escalation Required)
- **What**: Modifies infrastructure, access controls, billing, or irreversible data.
- **Examples**: provisioning cloud resources, changing IAM policies, dropping tables, mass-deleting records, modifying DNS, billing changes
- **Approval**: Two-step: agent proposes plan → human approves plan → agent executes with human watching
- **Rollback**: Rollback plan required in writing before execution begins
- **Monitoring**: Real-time human oversight during execution; post-execution review

## Phase 3: Policy Document Output

Produce a `action-class-policy.md` in the following format:

```markdown
# Action-Class Policy
Generated: [date]
System scope: [list of systems from Phase 1]

## Tier 0 — Read-Only
Criteria: [user-specific criteria]
Approval: None
Examples: [user-specific examples]
Rollback: N/A

## Tier 1 — Write with Review
Criteria: [user-specific criteria]
Approval: [specific approval mechanism]
Rollback: [specific rollback steps]
Monitoring: [specific monitoring]

## Tier 2 — Production Mutation
Criteria: [user-specific criteria]
Approval: [specific approval mechanism]
Rollback: [specific rollback steps]
Monitoring: [specific monitoring]

## Tier 3 — Infrastructure Change
Criteria: [user-specific criteria]
Approval: [specific approval mechanism]
Rollback: [specific rollback steps]
Monitoring: [specific monitoring]

## Classification Guide
When uncertain which tier an action belongs to, default to the higher tier.
[User-specific edge cases from Phase 1 answers]

## Review Schedule
This policy should be reviewed when: a new system is added, a new agent role is created,
an incident occurs, or quarterly (whichever comes first).
```

## Phase 4: Integration Notes

After delivering the policy document, offer concrete integration steps:

- **Claude Code hooks**: Show how to wire `PreToolUse` hooks that check an action against its tier before execution
- **AGENTS.md / CLAUDE.md**: Suggest adding the tier classifications to the project's agent instructions so agents are aware of their operating boundaries
- **Approval workflow**: If the user has a Slack/GitHub/Jira workflow, note which tier gates should route through it

## Notes

- This policy is a starting point. Real-world edge cases will surface within days of deployment — schedule a first review after one week.
- The tiers are named for communication clarity, not technical enforcement. Technical enforcement is a separate concern (hooks, middleware, platform controls).
- If the user has an existing approval workflow that doesn't map cleanly to four tiers, adapt the taxonomy — the goal is to make the blast-radius distinction explicit, not to enforce a specific number of tiers.

## Source

Derived from Nate Kadlac newsletter (2026-05-25): "AI made your app teams 10x faster. Nobody gave your platform team 10x the headcount." — "not every task an agent does carries the same weight" action-class principle, and PromptKit "Action-Class and Blast-Radius Policy Builder" prompt spec.
