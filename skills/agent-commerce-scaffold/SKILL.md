---
name: agent-commerce-scaffold
description: Scaffold a new agentic-commerce product with all 8 commercial-responsibility domains pre-stubbed -- Identity, Authorization, Fraud, Payment credentials, Settlement, Refunds, Liability, CRM. Each domain gets a README, an interface contract, and a TODO:assign-owner marker so no layer silently goes un-owned. Use when the user says "scaffold an agent product", "agent commerce scaffold", "init agentic product", "commerce agent init", "agent commerce structure", "6-layer scaffold", "8-layer scaffold", or is starting a new agent that will touch money, wallets, or payment authorizations.
---

# Agent Commerce Scaffold

Create a new agent product directory with all 8 commercial-responsibility domains pre-stubbed. The most common failure mode in agentic commerce is not a technical bug — it is silently ignoring layers that don't feel relevant yet. This scaffold forces every domain to be acknowledged at project start, not discovered post-launch.

## When to Use

- Starting a new agent that will handle payments, authorizations, or wallet operations
- Scaffolding a the agent platform agent that will touch any commercial rail
- Onboarding a new agent product spec that needs a project skeleton
- Running a responsibility audit (`/responsibility-audit`) and wanting to scaffold a remediated product from scratch

## Inputs

1. **Product name** — the agent product name (used for the root directory and README header)
2. **Product description** — one paragraph describing what the agent does
3. **Principal** — whose authority the agent acts under (a human user, an organization, an operator)
4. **Target directory** — where to create the scaffold (default: current working directory)

If any input is missing, ask before scaffolding — each value goes directly into the generated READMEs and interface contracts.

## Phase 1: Parse Inputs

Confirm the four inputs with the user. Restate as:

```
Product: <name>
Description: <one-line>
Principal: <who>
Target: <directory>/<name>/
```

Ask for confirmation before writing files.

## Phase 2: Create Root Structure

Create the following at `<target>/<product-name>/`:

```
<product-name>/
├── README.md               ← product overview + domain index
├── RESPONSIBILITY_MAP.md   ← filled-in responsibility map (who owns each layer)
└── domains/
    ├── identity/
    ├── authorization/
    ├── fraud/
    ├── payment-credentials/
    ├── settlement/
    ├── refunds/
    ├── liability/
    └── crm/
```

Each domain directory gets:
- `README.md` — domain description, questions to answer, and `TODO: assign-owner` marker
- `interface.md` — interface contract stub (inputs, outputs, failure modes)

## Phase 3: Write Root README

```markdown
# <product-name>

<description>

**Principal:** <principal>
**Scaffolded:** <today>

## Commercial Responsibility Domains

| Domain              | Owner        | Status      |
|---------------------|--------------|-------------|
| Identity            | TODO         | not-started |
| Authorization       | TODO         | not-started |
| Fraud               | TODO         | not-started |
| Payment Credentials | TODO         | not-started |
| Settlement          | TODO         | not-started |
| Refunds             | TODO         | not-started |
| Liability           | TODO         | not-started |
| CRM                 | TODO         | not-started |

Run `/responsibility-audit` on this spec before connecting to a live payment rail.
```

## Phase 4: Write RESPONSIBILITY_MAP.md

```markdown
# Responsibility Map — <product-name>

For each domain, assign: owner (builder / merchant / operator / payments-network), status (owned / partial / missing / unclear), and one-line notes.

| Domain              | Owner | Status  | Notes |
|---------------------|-------|---------|-------|
| Identity            |       | missing |       |
| Authorization       |       | missing |       |
| Fraud               |       | missing |       |
| Payment Credentials |       | missing |       |
| Settlement          |       | missing |       |
| Refunds             |       | missing |       |
| Liability           |       | missing |       |
| CRM                 |       | missing |       |
```

## Phase 5: Write Per-Domain READMEs

For each of the 8 domains, write `domains/<domain>/README.md` using this template:

```markdown
# <Domain Name>

<!-- TODO: assign-owner -->
**Assigned to:** UNASSIGNED
**Status:** not-started

## What this domain covers

<one paragraph from the responsibility-audit rubric for this domain>

## Questions to answer before going live

<3-5 questions from the /responsibility-audit skill for this domain>

## Interface contract

See `interface.md` for the input/output contract.

## Dependencies

- None identified yet
```

Use the layer definitions from `/responsibility-audit` verbatim — this creates a live reference so the team doesn't have to re-read the rubric.

## Phase 6: Write Per-Domain interface.md

For each domain, write `domains/<domain>/interface.md`:

```markdown
# <Domain Name> — Interface Contract

## Inputs

- (define what this domain receives from the agent or other domains)

## Outputs

- (define what this domain returns: tokens, receipts, audit records, error codes)

## Failure modes

| Failure | Effect | Handling |
|---------|--------|----------|
| (list known failure modes for this domain) | | |

## Evidence requirements

- (what evidence trail must this domain produce for refunds/audits/disputes?)

<!-- TODO: assign-owner before going live -->
```

## Verification

- [ ] All 8 domain directories created, none silently skipped
- [ ] Root `README.md` has the responsibility table with all 8 rows
- [ ] `RESPONSIBILITY_MAP.md` exists and is pre-filled with `missing` status
- [ ] Every domain `README.md` has a `TODO: assign-owner` marker
- [ ] Every domain `interface.md` has failure modes section (even if empty)
- [ ] No domain README silently skips the "questions to answer" section

## Next Steps After Scaffolding

1. Run `/responsibility-audit` on the product spec to score each domain
2. Fill in owners in `RESPONSIBILITY_MAP.md` based on the audit
3. Run `/agent-auth-spec` to generate the authorization spec for legal/finance review
4. Build each domain module, replacing `TODO: assign-owner` with the actual owner

## Source Attribution

Framework from Nate's Newsletter, 2026-05-12: "Agentic Commerce Is A Protocol War. Here's Who's Fighting."
Scaffold pattern addresses the named failure mode: most agentic-commerce products only think about 2 of the 8 responsibility layers at build time.
