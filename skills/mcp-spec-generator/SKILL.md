---
name: mcp-spec-generator
description: Takes any SaaS product or internal system and outputs a complete MCP server specification — tool list, input/output schemas, auth model, state-machine endpoints, audit/event endpoints, and dependency-graph queries — structured so an AI agent can use the tool as control-plane infrastructure rather than a chat wrapper. Use when the user says "spec an MCP server for X", "write an MCP spec", "how would I wrap X as MCP", or wants a buildable blueprint before implementing a new MCP server.
---

# MCP Server Spec Generator

Produces a complete, buildable MCP server specification for any SaaS product or internal system. Output is a markdown spec plus annotated JSON schemas, designed as a direct input to implementation.

## Trigger

Use when the user:
- Names a tool and asks "how would I MCP-wrap this?" or "spec an MCP server for X"
- Says "write an MCP spec", "give me the tool list for X as MCP", "what tools should this MCP server expose?"
- Has completed a stack scoring pass and wants to build servers for Wrappable tools
- Needs a structured blueprint before handing off to a developer or autonomous coding agent

## Phase 1: Target Tool Intake

Ask for:
1. **Tool name and type** — what category (issue tracker, CRM, calendar, ERP, storage, etc.)
2. **Primary use case** — what workflows will agents run through this MCP server?
3. **Existing API surface** — REST, GraphQL, gRPC, webhooks? (if known)
4. **Auth mechanism** — OAuth 2.0, API key, service account, etc.?
5. **Agent use pattern** — will agents read-only, read-write, or own work items?

If the user doesn't know some answers, proceed with reasonable defaults and flag assumptions.

## Phase 2: Core Data Model Analysis

Before specifying tools, identify the tool's core objects:
- **Primary object** — the main entity agents will work with (ticket, deal, event, record)
- **State field** — what field tracks lifecycle state (status, stage, phase)?
- **Owner field** — what field tracks who/what is responsible (assignee, owner, rep)?
- **History object** — where is the audit trail stored (comments, activity log, events)?
- **Relationship fields** — what links objects to each other (parent, blocks, epic)?

List these explicitly — they determine which MCP tools are worth exposing.

## Phase 3: Tool List

Draft the minimal set of MCP tools needed for agent-useful coverage. Group by function:

### Read Operations
```
list_<objects>(filters, limit, cursor) → [objects]
get_<object>(id) → object
get_<object>_history(id) → [events]
get_dependencies(id) → {blocks: [], blocked_by: []}
```

### Write Operations
```
create_<object>(fields) → object
update_<object>(id, fields) → object
transition_<object>(id, from_state, to_state) → object
assign_<object>(id, assignee) → object
```

### Search / Query
```
search_<objects>(query, filters) → [objects]
get_<objects>_by_state(state) → [objects]
get_<objects>_by_assignee(assignee_id) → [objects]
```

### Event / Webhook Registration (if applicable)
```
subscribe_events(event_types, callback_url) → subscription
unsubscribe_events(subscription_id) → void
```

Flag any tool that requires write access with `[WRITE]`. Flag tools that expose sensitive data with `[SENSITIVE]`.

## Phase 4: Schema Specification

For each tool, specify:

```json
{
  "name": "transition_issue",
  "description": "Move an issue from one state to another. Use this when an agent needs to advance work through the pipeline.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "issue_id": {"type": "string", "description": "Unique identifier of the issue"},
      "to_state": {"type": "string", "enum": ["in_progress", "review", "done"], "description": "Target state"},
      "comment": {"type": "string", "description": "Optional reason for the transition"}
    },
    "required": ["issue_id", "to_state"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "issue_id": {"type": "string"},
      "previous_state": {"type": "string"},
      "new_state": {"type": "string"},
      "transitioned_at": {"type": "string", "format": "date-time"}
    }
  }
}
```

Prioritize: cover the state machine, assignee, audit, and dependency tools completely. Trim tools that don't serve agent workflows.

## Phase 5: Auth and Transport Model

Specify:

### Authentication
- **Mechanism**: OAuth 2.0 / API Key / Service Account / mTLS
- **Token storage**: environment variable name (e.g., `TOOL_API_KEY`)
- **Scope requirements**: list minimum required scopes for each tool group (read, write)
- **Token refresh**: how to handle expiry (refresh token flow / re-auth / TTL note)

### Transport
- **Protocol**: stdio (recommended for Claude Code) or HTTP/SSE (for multi-client)
- **Base URL**: `https://api.<tool>.com/v2` (or equivalent)
- **Rate limits**: note known limits that affect agent batch operations

### Error Handling
- Document which errors are retryable vs. terminal
- Specify how to surface rate-limit errors (429) to the calling agent

## Phase 6: Full Spec Output

Assemble into a single markdown document:

```markdown
# MCP Server Spec: [Tool Name]

## Overview
- Tool: [name]
- Version: 1.0 (draft)
- Auth: [mechanism]
- Transport: stdio

## Core Data Model
| Object | State Field | Owner Field | History | Relationships |
|--------|------------|-------------|---------|---------------|
| [object] | [field] | [field] | [endpoint] | [fields] |

## Tools

### [tool_name]
**Description**: [one line, agent-focused]
**Input**: [schema]
**Output**: [schema]
**Notes**: [rate limits, permissions, caveats]

[repeat for each tool]

## Authentication Setup
```env
TOOL_NAME_API_KEY=your_key_here
# or OAuth:
TOOL_NAME_CLIENT_ID=...
TOOL_NAME_CLIENT_SECRET=...
```

## Implementation Notes
- [Library recommendations]
- [Known quirks in the API]
- [Recommended retry policy]
```

## Verification

A good MCP spec:
- Has at least one tool covering each of: state transitions, assignee writes, history reads, dependency queries
- All `required` fields in schemas are truly required (not "nice to have")
- Auth section names the exact environment variables an implementer would set
- Description fields are written from the agent's perspective ("use this when an agent needs to..."), not the human's
- No tool is included that a human would use but an agent would not

## Source

Extracted from Nate's Newsletter (natesnewsletter@substack.com), 2026-05-02 — "AI agents are about to route around every tool that can't pass 5 structural tests. Here's the diagnostic." Technique: MCP server spec generation as the bridge between tool scoring and buildable agent infrastructure.
