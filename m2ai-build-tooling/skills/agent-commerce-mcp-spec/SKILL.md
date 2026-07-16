---
name: agent-commerce-mcp-spec
description: Take a business's existing storefront, catalog, or checkout flow and emit a complete MCP server spec that makes it agent-callable end-to-end — tool list, JSON schemas, auth model, payment rails, and idempotency guarantees. Optionally scaffolds a Python mcp-sdk server skeleton. Use when asked "make this storefront agent-callable", "generate MCP spec for my shop", "agent commerce spec", "MCP server for checkout", or "how do I expose my catalog to agents".
---

# Agent Commerce MCP Spec Generator

Converts a business's existing commerce surface into a complete MCP server specification that an agent can use to discover, compare, select, pay, and confirm — the full economic task, end-to-end.

## When to Invoke

Trigger on: "make my store agent-callable", "generate MCP spec for commerce", "agent commerce spec", "MCP server for checkout", "how do I expose my catalog to agents", "spec out an agent-buyable API", or after a callable audit reveals a business is "wrappable" and the user wants a build target.

## Inputs

Ask the user (skip any already answered):

1. **Business surface to spec** — URL (homepage, pricing page, API docs, checkout flow) or a text description of products/services
2. **Commerce type** — B2C e-commerce / B2B SaaS subscription / B2B procurement / marketplace / service booking
3. **Existing infrastructure** — Does the business already have an API? (Shopify, Stripe, custom?) Auth method in use?
4. **Payment rail preference** — Card (Stripe), stablecoin, both, or defer to spec
5. **Spec format** — MCP tool schema only (default) OR MCP + OpenAI function-calling + Gemini function-calling (transport-agnostic)

## Phase 1: Surface Analysis

Inspect the provided URL or description. Identify:
- **Catalog structure**: What are the objects being sold? (products, plans, services, quotes)
- **Key attributes**: What does a buyer need to compare and decide? (price, features, availability, constraints)
- **Checkout flow**: What inputs are required to complete a purchase?
- **Auth surface**: How does the business authenticate buyers today?
- **Existing machine-readable surfaces**: OpenAPI spec? Shopify storefront API? Stripe pricing? RSS?

## Phase 2: Tool List Design

Define the MCP tools required to complete the full economic task. For each tool:

```yaml
tool:
  name: <snake_case_verb_noun>
  description: <one sentence: what the agent does with this tool>
  inputs: <JSON Schema object>
  outputs: <JSON Schema object>
  idempotency: <none | key-based | safe-retry>
  auth_required: <true | false>
  side_effects: <read-only | writes-order | charges-payment>
```

**Standard tool set for a commerce surface:**

| Tool | Purpose | Side Effects |
|---|---|---|
| `search_catalog` | Full-text + filtered search across products/plans | read-only |
| `get_product` | Fetch a single product with full attribute set | read-only |
| `compare_products` | Side-by-side comparison of 2-5 products on agent-supplied criteria | read-only |
| `check_availability` | Verify stock, slots, or quota before committing | read-only |
| `create_quote` | Generate a scoped, time-limited quote or cart | writes draft |
| `configure_order` | Set buyer-specific options (quantity, variant, delivery) | writes draft |
| `authorize_payment` | Delegate spend authority and select payment rail | charges-payment |
| `submit_order` | Finalize and submit the order | charges-payment |
| `get_order_status` | Poll order status by order ID | read-only |
| `cancel_order` | Cancel a pending or in-progress order (if supported) | writes-order |

Adapt this set to the specific business — a SaaS subscription may replace `submit_order` with `activate_subscription`; a service business may replace `search_catalog` with `check_availability`.

## Phase 3: Schema Design

For each tool, write the full JSON Schema for inputs and outputs. Follow these constraints:

**Input schemas:**
- All required fields must be explicitly marked `"required": [...]`
- Enum fields must list all valid values
- Monetary amounts must specify currency: `{ "amount": number, "currency": "USD" }`
- IDs must use the business's native identifier type

**Output schemas:**
- Always include a top-level `success: boolean`
- Error case must include `error_code` (machine-readable) and `message` (human-readable)
- Monetary fields follow the same `amount + currency` pattern
- Order confirmation must include: `order_id`, `status`, `total`, `confirmation_url` (or null)

## Phase 4: Auth Model

Select the authentication model based on the business's existing infrastructure and agent-compatibility:

| Model | When to use | Agent-compatibility |
|---|---|---|
| API key (header) | Business has existing REST API with key auth | High — simple to inject |
| OAuth 2.0 Authorization Code + PKCE | Business uses OAuth for existing integrations | High — standard delegation |
| Agent payment token (Stripe Link) | Business uses Stripe; buyer has pre-authorized wallet | High — native agent-payment |
| Session cookie + CSRF | Business has web-only checkout | Low — requires RPA wrapper |

Document:
- How an agent obtains credentials
- How spend authorization is delegated (if payment is involved)
- Token expiry and renewal approach
- Scoped permissions (read-only vs. can-purchase)

## Phase 5: Idempotency & Safety

For any tool with side effects, define the idempotency model:

- **`create_quote`** / **`configure_order`**: Idempotent by quote ID. Agent can re-call with same inputs to retrieve the existing quote.
- **`authorize_payment`** / **`submit_order`**: Require an agent-supplied `idempotency_key` (UUID). Server must honor duplicate detection within a TTL window (recommend 24h).
- **`cancel_order`**: Idempotent — canceling an already-canceled order is a no-op with `success: true`.

Include a `max_spend_cap` parameter on `authorize_payment` to allow the calling agent to enforce a budget limit before the server is called.

## Phase 6: Output

Emit the spec in two parts:

### Part A — MCP Server Spec (Markdown)

```markdown
# MCP Server Spec: [Business Name] Commerce API
Version: 1.0.0
Commerce type: [type]
Auth model: [model]
Payment rails: [card | stablecoin | both]

## Tools
[Full tool list with descriptions]

## Schemas
[JSON Schema blocks per tool]

## Auth Flow
[Step-by-step agent authentication flow]

## Idempotency Model
[Per-tool idempotency rules]

## Error Codes
[Machine-readable error registry]
```

### Part B — Python mcp-sdk Skeleton (optional, on request)

Scaffold a minimal Python server using `mcp-sdk` that:
- Registers all tools with their schemas
- Stubs each handler with `# TODO: implement against [existing API/endpoint]`
- Wires up auth (API key injection or OAuth token exchange)
- Includes a `pyproject.toml` with `mcp-sdk` and `httpx` as dependencies

Output the skeleton as a file tree with the key files populated.

## Verification

A complete spec:
- Covers all 5 economic task steps (discover, compare, decide, pay, confirm)
- Has JSON Schema for every tool (not just descriptions)
- Specifies idempotency for every tool with side effects
- Includes an error code registry (at least: `not_found`, `out_of_stock`, `payment_declined`, `rate_limited`)
- Does not require a browser session for any step

## Source Attribution

Technique derived from Nate's Newsletter (2026-05-03): "Executive Briefing: What Stripe Sessions 2026 actually means for how you sell" — the "agent-commerce MCP server spec generator" idea (idea #2), grounded in Stripe Sessions 2026 infrastructure announcements (Stripe Link wallet for agents, card + stablecoin dual rails) and the named convergence of Microsoft, Meta, Visa, Mastercard, and PayPal on agent-payment primitives.
