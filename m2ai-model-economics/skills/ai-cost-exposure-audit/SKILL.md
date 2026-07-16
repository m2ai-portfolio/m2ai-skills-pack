---
name: ai-cost-exposure-audit
description: Walk through a three-prompt sequential audit of your organization's AI inference cost-structure exposure -- inventory dependencies, stress-test sensitivity to subsidized-pricing collapse, and assess workload portability. Use when you want to map your exposure to the AI inference cost curve before it breaks your budget.
---

# AI Cost-Structure Exposure Audit

A three-prompt sequential audit that maps an organization's exposure to the AI inference cost curve -- who owns the inference layers you depend on, what happens when subsidized pricing converges to real unit economics, and which workloads can move on-device vs which are cloud-bound.

## Trigger

Use when the user says "/ai-cost-exposure-audit", "audit my AI cost exposure", "map my inference dependencies", "what's my exposure to AI pricing changes", "cost curve audit", or "find my AI exposure".

## Phase 1: Intake

Collect (or infer from context):
1. **Organization type** -- startup / SMB / enterprise / individual practitioner
2. **Primary AI use cases** -- list of workflows that depend on LLM APIs (e.g., customer chat, code generation, document processing)
3. **Providers in use** -- OpenAI, Anthropic, Google, Azure OpenAI, OpenRouter, self-hosted, etc.

If given a codebase path, offer to scan it: grep for API client imports and model name literals to auto-populate the provider list.

Tell the user:
```
Starting AI Cost-Structure Exposure Audit
Organization: {type}
Providers detected: {list}
Working through 3 audit prompts...
```

## Phase 2: The Three-Prompt Audit

Run these prompts sequentially -- each builds on the prior output.

---

### Prompt 1 -- Dependency Inventory

Present to the user:

> "List every workflow in your organization where an AI inference call is required to complete the task (not just 'nice to have'). For each: which provider, which model tier (small/medium/large/frontier), and is the model name hardcoded or configurable?"

Wait for the user's response, then produce a structured table:

| Workflow | Provider | Model Tier | Hardcoded? | Notes |
|----------|----------|------------|-----------|-------|

Flag any workflow where the model is hardcoded to a specific frontier model (e.g., `gpt-4o`, `claude-opus-4-7`) -- these carry the highest lock-in risk.

---

### Prompt 2 -- Sensitivity Analysis

Using the dependency table from Prompt 1, present:

> "For each workflow above: what would happen to your unit economics if that provider's API price doubled tomorrow? Which workflows would you cut, which would you absorb, and which would break your margin?"

Produce a sensitivity matrix:

| Workflow | Current Cost Tier | 2x Price Impact | Response |
|----------|-----------------|----------------|---------|
| ... | Low / Med / High | Tolerable / Margin Pressure / Business-Breaking | Cut / Absorb / Must-find-alternative |

Highlight any workflow marked **Business-Breaking** -- these are the exposure points that require mitigation before the inflection happens, not after.

---

### Prompt 3 -- Portability Assessment

For each high-risk workflow surfaced in Prompt 2, present:

> "For each business-breaking workflow: could it run on a smaller model (e.g., 8B-70B local) with acceptable quality loss? Is the output latency-sensitive? Does the data involved allow cloud processing, or is there a regulatory/privacy constraint forcing local inference?"

Produce a portability table:

| Workflow | Smaller Model Viable? | Latency Constraint | Data Sensitivity | Can Go On-Device? |
|----------|--------------------|-------------------|-----------------|------------------|
| ... | Yes / No / Partial | Real-time / Batch | Public / Internal / Regulated | Yes / No / Partial |

Workflows where **Can Go On-Device? = No** and **2x Impact = Business-Breaking** are the critical exposure points -- cloud-bound and economically fragile.

## Phase 3: Exposure Summary

Produce a one-page summary:

```
=================================================================
AI COST-STRUCTURE EXPOSURE AUDIT
=================================================================
Date: {date}
Organization: {type}

CRITICAL EXPOSURE (cloud-bound + business-breaking at 2x price):
  {list workflows}

MANAGEABLE EXPOSURE (absorb or cut at 2x):
  {list workflows}

ON-DEVICE CANDIDATES (portability score: High):
  {list workflows}

TOP RECOMMENDATIONS
1. {highest-leverage action -- e.g., replace hardcoded model with configurable env var}
2. {next action}
3. {next action}

NOTE: This audit reflects stated dependencies, not a live cost analysis.
      Verify current pricing via each provider's pricing page before
      acting on sensitivity estimates.
=================================================================
```

## What This Does NOT Do

- Does not calculate exact dollar costs -- pull your usage dashboard and multiply by the rate change you are stress-testing.
- Does not recommend specific hardware for on-device migration -- scope that separately from the portability candidates.
- Does not scan codebases automatically unless the user consents to the scan in Phase 1.

## Source

Derived from Nate Kadlac newsletter (2026-04-26): "Executive Briefing: The AI cost curve your strategy is riding just broke + 3 prompts to find your exposure." Public teaser only -- the specific prompts are paywalled. This skill reconstructs the three-prompt shape from the section headers and thesis.
