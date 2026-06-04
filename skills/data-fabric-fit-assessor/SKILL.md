---
name: data-fabric-fit-assessor
description: Given a client's or team's existing data infrastructure (Microsoft 365, Google Workspace, Salesforce, custom RAG, etc.), recommend which AI agent products will benefit from native data-graph access vs. which will require costly migration. Maps four major data fabrics to agent products optimized for each.
---

# Data Fabric Fit Assessor

Enterprise AI adoption decisions are increasingly driven by data infrastructure fit, not model benchmarks. An agent that runs natively against a team's existing data graph delivers immediate value; one that requires data migration or re-platforming delays ROI by months and introduces compliance risk. This skill produces a data-fabric-first recommendation.

## Trigger

Use when the user says "/data-fabric-fit-assessor", "which agent fits our data", "we're on Microsoft 365 what agent should we use", "does this agent work with our existing data", "data graph fit", or when evaluating AI agents for an enterprise with existing data infrastructure.

Also use when an advisory client asks "which AI tool is right for our team" and the team has a known data infrastructure.

## Phase 1: Intake

Collect the following. If the user is evaluating their own team, ask directly. If working from a client profile, extract from available context.

1. **Primary data infrastructure** — which platforms store the team's working data?
   - Microsoft 365 (Exchange, SharePoint, Teams, OneDrive)
   - Google Workspace (Gmail, Drive, Calendar, Docs)
   - Salesforce (CRM, Service Cloud, Sales Cloud)
   - Custom RAG / internal databases (Postgres, S3, Snowflake, proprietary)
   - Other (specify)

2. **Secondary infrastructure** — any additional platforms used regularly?

3. **Primary work types** — what does the team spend most of its AI-assisted time on?
   (coding, writing/research, CRM/sales ops, M365-native tasks, customer service, other)

4. **Data residency or compliance constraints** — any requirements that restrict data leaving the org's infrastructure? (HIPAA, SOC 2, GDPR, air-gap, FedRAMP)

5. **Technical capacity** — developer available, IT ops only, or non-technical?

## Phase 2: Map to the Four Data Fabrics

Classify the team's infrastructure into one or more of these fabrics:

### Fabric A — Microsoft Graph (Microsoft 365)

**What it is:** The unified API and data graph behind Exchange, SharePoint, Teams, OneDrive, and Copilot. Identity is Entra ID.

**Agents with native fabric access:**
- **Microsoft Copilot Cowork / Work IQ** — reads calendar, email, Teams messages, SharePoint files natively via Graph API without import.
- **Microsoft 365 Copilot** — embedded in Office apps, same fabric.
- Agents using the Graph API directly (requires app registration).

**Agents that require data migration or API integration:**
- Claude (no native Graph access without MCP connector or custom integration)
- Gemini in Workspace (different fabric; requires sync if M365 is primary)

---

### Fabric B — Google Workspace

**What it is:** Gmail, Drive, Calendar, Docs, Sheets, and Meet. Identity is Google account.

**Agents with native fabric access:**
- **Gemini in Google Workspace** (Gemini for Workspace) — reads Drive, Calendar, Gmail natively.
- Google Vertex AI agents with Workspace grounding.

**Agents that require integration:**
- Microsoft Copilot (different fabric)
- Claude (requires MCP connector or manual file sharing)

---

### Fabric C — Salesforce 360

**What it is:** CRM, Service Cloud, Sales Cloud, Marketing Cloud, Data Cloud (Salesforce's unified customer data graph).

**Agents with native fabric access:**
- **Salesforce Agentforce** — native access to all Salesforce objects, flows, and customer data via the Salesforce metadata API and Data Cloud.
- **Salesforce Headless 360** — 60 pre-built MCP tools for calling Salesforce from external agents (Claude Code, Cursor, etc.).

**Agents that require integration:**
- Generic AI assistants without Salesforce connectors.
- Claude (unless using Headless 360 MCP tools).

---

### Fabric D — Custom / Open Data Graph

**What it is:** Internal databases, data warehouses (Snowflake, BigQuery, Redshift), custom RAG pipelines, private document stores, or bespoke APIs.

**Best-fit agents:**
- **Custom agent frameworks** (Claude Agent SDK, direct API, LangChain) — full control, can connect to any data source.
- **Self-hosted open-source agents** — max data residency control.
- **Claude Code** — reads files, runs queries, calls APIs; excellent for developer-owned custom infrastructure.

**Poor fit:**
- Hosted consumer agents (Copilot, Gemini consumer) — they cannot reach private internal data without an enterprise integration.

---

## Phase 3: Cross-Fabric Analysis

If the team spans multiple fabrics, identify:

1. **Primary fabric** — where does 70%+ of working data live?
2. **Cross-fabric friction points** — where does the team regularly move data between fabrics? These are integration pain points an agent won't solve without custom glue code.
3. **Agent that covers the most fabric surface** — for mixed environments, which single agent reaches the most data without migration?

## Phase 4: Recommendation

Produce a structured recommendation:

1. **Best-fit agent(s)** — for the primary fabric, which agent has native access?
2. **Best-fit for secondary needs** — if work types span multiple fabrics, which pairing covers the most ground?
3. **Migration cost estimate** — if no agent has native fabric access, what's the rough integration effort? (hours for MCP config, days for custom connector, weeks for full data migration)
4. **Compliance flag** — if data residency requirements rule out any hosted agent, call it out explicitly.

## Phase 5: Output

```
DATA FABRIC FIT ASSESSMENT
===========================
Primary fabric:   {Fabric A–D | custom description}
Secondary fabric: {if applicable}
Work types:       {list}
Compliance:       {constraints or NONE}

RECOMMENDATION
--------------
Primary agent:    {agent name}
  Fit rationale:  {one sentence — why this agent owns this fabric}
  Data access:    NATIVE | CONNECTOR REQUIRED | MIGRATION REQUIRED
  
Secondary agent:  {agent name or NONE}
  For:            {which work type or fabric}
  Data access:    NATIVE | CONNECTOR REQUIRED | MIGRATION REQUIRED

Agents ruled out:
  {Agent X}: {reason — wrong fabric, compliance block, etc.}

Cross-fabric friction:
  {describe where data movement between fabrics creates workflow gaps}

Next step:
  {concrete action — e.g., "Enable Gemini for Workspace on the tenant" 
   or "Set up Salesforce Headless 360 MCP tools for the Claude Code team"}
===========================
```

## What This Does NOT Do

- Does not benchmark model quality, reasoning, or accuracy.
- Does not evaluate vendor pricing or contract terms.
- Does not replace a security review for the recommended agent's data handling.
- Does not configure the integration — it recommends it. Implementation is a separate step.

## Source

Framework derived from Nate Kadlac newsletter (2026-04-29): "The 5-question filter I run every agent launch through." Nate's framing of enterprise agent adoption as driven by data graph fit (not benchmarks) and his mapping of Microsoft Graph / Google Workspace / Salesforce 360 as the three dominant enterprise data fabrics anchors this skill. The four-fabric taxonomy and migration-cost framing are extensions.
