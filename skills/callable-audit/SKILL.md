---
name: callable-audit
description: Audit whether a business is callable by an AI agent end-to-end. Takes a business name, URL, or description and walks a structured rubric — discoverable surface, full economic task completion (discover → compare → decide → pay → confirm), auth model — producing a verdict of agent-callable, wrappable, or chat-only-dead-end with a per-surface score. Use when asked "can an agent buy from this business", "is this service agent-callable", "callable audit", or "agent-commerce readiness".
---

# Callable Audit

Assess whether a business can be reached, evaluated, and transacted with by an AI agent without a human re-routing through a UI. Returns a per-surface score and a verdict.

## When to Invoke

Trigger on: "callable audit", "is this business callable", "can an agent transact here", "agent-commerce readiness", "agent-accessible", "discoverable by agents", or when a user provides a business name/URL and asks how agent-ready it is from a buyer's perspective.

## Inputs

Accept any of:
- A business name (e.g. "Shopify")
- A URL (homepage, pricing page, or checkout flow)
- A product/service description in free text

If multiple surfaces exist (website, API docs, MCP server, plugin), audit each surface separately.

## Phase 1: Surface Discovery

Identify all agent-reachable surfaces the business exposes:

| Surface Type | Examples | How to Check |
|---|---|---|
| MCP server | `.well-known/mcp.json`, plugin manifest | Fetch `<domain>/.well-known/mcp.json`; check plugin directories |
| Typed REST/GraphQL API | OpenAPI spec, GraphQL schema | Check `/docs`, `/openapi.json`, `<domain>/graphql` |
| Agent-readable catalog | Structured product data, RSS, sitemap | Check for JSON-LD, schema.org markup, machine-readable pricing |
| Checkout automation | Stripe Link, hosted payment endpoint, B2B procurement API | Check payment docs |
| Chat/NLP only | Chatbot, FAQ widget | Flag as chat-only |

If a URL is provided, fetch and inspect it. If only a name, reason from publicly known documentation.

## Phase 2: Economic Task Completion Rubric

Score each step of the full economic task. For each step: 1 = impossible without a human, 3 = partially automatable, 5 = fully agent-operable.

### Step 1 — Discover (Can an agent find this business and its offerings?)
- Is the business indexed in a way agents can retrieve? (LLM training data, web search, agent directories)
- Are products/services described in machine-readable structured data?
- Is there an MCP server, plugin manifest, or API the agent can call directly?

### Step 2 — Compare (Can an agent evaluate options against criteria?)
- Are pricing, features, and constraints machine-readable?
- Are comparison attributes (specs, tiers, SLAs) in a structured format?
- Can an agent filter/query the catalog programmatically?

### Step 3 — Decide (Can an agent make a selection without ambiguity?)
- Is the selection interface (add-to-cart, configure, quote request) API-accessible?
- Are decision inputs well-typed (required fields, validation rules exposed)?
- Can the agent complete configuration without a visual UI?

### Step 4 — Pay (Can an agent authorize and complete a transaction?)
- Is there a payment endpoint the agent can call (Stripe Link, agent-payment token, B2B purchase order API)?
- Are spend caps and authorization delegation supported?
- Is idempotency supported (agent can retry without double-charging)?

### Step 5 — Confirm (Can an agent receive and verify order confirmation?)
- Does the business return a structured confirmation (JSON receipt, order ID, tracking reference)?
- Is there a status-check endpoint the agent can poll?
- Is the confirmation machine-readable without screen-scraping?

## Phase 3: Auth & Security Assessment

Assess the authentication model for agent compatibility:
- **API key**: Supported and documented? (agent-friendly)
- **OAuth 2.0 / PKCE**: Supported? (agent-friendly with proper delegation)
- **Session cookies / CAPTCHA**: Requires human browser session? (agent-hostile)
- **Agent payment tokens**: Scoped spend tokens supported? (future-proof)

Note any fraud or rate-limit controls that would block legitimate agent traffic.

## Phase 4: Score & Verdict

Calculate the overall score:

```
Per-surface score = average of 5 step scores (1-5 scale)
Overall score = average across all surfaces
```

Map to verdict:

| Score | Verdict | Meaning |
|---|---|---|
| 4.0–5.0 | **Agent-Callable** | Agent can complete the full economic task autonomously |
| 2.5–3.9 | **Wrappable** | Agent can complete the task with a thin wrapper (scraper, RPA, custom adapter) |
| 1.0–2.4 | **Chat-Only Dead End** | Agent can discover but not transact; human required at critical steps |

## Phase 5: Output Report

```
# Callable Audit: [Business Name]
Date: [today]

## Verdict: [AGENT-CALLABLE / WRAPPABLE / CHAT-ONLY DEAD END]
Overall Score: X.X / 5.0

## Surface Inventory
| Surface | Type | Score |
|---------|------|-------|
| [surface] | [MCP/API/Catalog/Chat] | X.X |

## Economic Task Scores
| Step | Score | Notes |
|------|-------|-------|
| Discover | X/5 | ... |
| Compare | X/5 | ... |
| Decide | X/5 | ... |
| Pay | X/5 | ... |
| Confirm | X/5 | ... |

## Auth Model
[Description of auth options and agent-compatibility assessment]

## Critical Gaps
[What prevents a higher verdict — specific blockers, not generic advice]

## Recommended Path to Agent-Callable
1. [Highest-leverage change]
2. [...]
```

## Verification

A good audit:
- Scores all 5 economic task steps with evidence, not assumptions
- Identifies the specific blocking step (usually Pay or Confirm for most businesses)
- Does not rate a business "Agent-Callable" if Pay requires a human browser session
- Recommended path items are specific and actionable (not "add an API")

## Source Attribution

Diagnostic frame derived from Nate's Newsletter (2026-05-03): "Executive Briefing: What Stripe Sessions 2026 actually means for how you sell" — the named diagnostic "the new competition is to be callable." The 5-step economic task model (discover → compare → decide → pay → confirm) is extracted from the briefing's "callable business" rubric.
