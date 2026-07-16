---
name: agent-infra-scorer
description: Score any enterprise tool (Jira, Salesforce, Workday, Google Calendar, etc.) against a 5-test structural diagnostic to determine whether it qualifies as agent infrastructure (keep), wrappable (replace with MCP), or legacy (replace). Produces a per-tool verdict and a ranked stack table. Use when the user says "score my stack", "is Jira agent-ready", "agent infrastructure test", "which tools should I MCP-wrap", or wants to audit a tool portfolio for AI-agent compatibility.
---

# Agent Infrastructure Scorer

Evaluates any enterprise tool against five structural tests that determine whether it can serve as a control-plane substrate for AI agents — not just a wrapped chat surface.

## Trigger

Use when the user:
- Names a specific tool and asks if it's "agent-ready", "worth wrapping", or "infrastructure vs. legacy"
- Says "score my stack", "run the 5 tests", "agent infrastructure test", or "which of my tools are agent infrastructure"
- Provides a list of tools and asks for a ranking
- Is deciding whether to build an MCP server for a tool or replace it outright

## Phase 1: Tool Intake

Accept one or more tool names. Ask for any available context:
- The tool's primary purpose (issue tracking, CRM, calendar, ERP, etc.)
- Whether an MCP server already exists for it
- How it is currently used in automated workflows (if at all)

If the user provides a list, confirm the full list before proceeding. Do not silently skip tools.

## Phase 2: The 5 Structural Tests

For each tool, evaluate the following tests. Answer YES / PARTIAL / NO with brief evidence:

### Test 1: State Machine
Does the tool expose a **programmable state machine**? Can an agent move items through defined states (e.g., open → in-progress → done) via API without human clicks?

Evidence to look for: transition APIs, workflow automation endpoints, status-update mutations.

### Test 2: Assignee Field
Does the tool support **agent identity as an assignee**? Can an agent be assigned ownership of a work item (ticket, deal, task, event) and have that ownership persisted and queryable?

Evidence to look for: `assignee` or `owner` fields on objects, service-account assignment support, API-writable owner fields.

### Test 3: Audit History
Does the tool maintain a **machine-readable audit trail**? Can an agent read who did what, when, and why — via API, not just a UI changelog?

Evidence to look for: event webhooks, audit log endpoints, change history APIs, append-only activity streams.

### Test 4: Dependency Graph
Does the tool expose a **queryable dependency graph**? Can an agent understand which items block or depend on others — enabling DAG-aware scheduling?

Evidence to look for: `parent`/`child` relationships, `blocks`/`blocked-by` fields, sub-task hierarchies, dependency query APIs.

### Test 5: [Pending — full article paywalled]
A fifth structural property has been identified in the original diagnostic framework but is not yet publicly documented. Mark this test as UNKNOWN for all tools until the source article is fully accessible. Do not invent a test to fill this slot.

## Phase 3: Score Each Tool

For each tool, compute a score:
- YES = 2 points, PARTIAL = 1 point, NO = 0 points
- Test 5 (UNKNOWN) is scored as 0 and flagged as pending

**Scoring rubric:**
| Score | Verdict | Action |
|-------|---------|--------|
| 8–10 | Agent Infrastructure | Keep and invest — build MCP server if none exists |
| 5–7 | Wrappable | Build a thin MCP wrapper targeting the passing tests |
| 3–4 | Marginal | Evaluate replacement cost vs. MCP investment |
| 0–2 | Legacy | Plan replacement with an agent-native alternative |

Note: Test 5 being UNKNOWN caps the maximum possible score at 8. Adjust verdicts accordingly.

## Phase 4: Stack Table Output

Produce a ranked table, best to worst:

```
## Agent Infrastructure Score — [Tool Name or "Stack"]

| Tool | T1: State | T2: Assignee | T3: Audit | T4: Deps | T5: TBD | Score | Verdict |
|------|----------|-------------|----------|---------|---------|-------|---------|
| Linear | YES | YES | YES | YES | UNKNOWN | 8/10 | Agent Infrastructure |
| Jira | PARTIAL | YES | PARTIAL | YES | UNKNOWN | 6/10 | Wrappable |
| Salesforce | YES | YES | NO | PARTIAL | UNKNOWN | 5/10 | Wrappable |
| Google Calendar | PARTIAL | PARTIAL | NO | NO | UNKNOWN | 2/10 | Legacy |

### Recommended Actions
1. [Tool] — [Verdict] — [Specific next step]
2. ...

### Stack-Level Summary
- [N] tools qualify as agent infrastructure
- [N] tools are worth wrapping via MCP
- [N] tools should be replaced when convenient
- Top priority: [Tool] — [Why]
```

## Phase 5: Follow-up Offers

After delivering the table, offer:
- "Want an MCP server spec for any of the Wrappable tools?" (generate an MCP spec for the tool)
- "Want a leadership migration brief for the Legacy tools?" (hand off to `executive-briefing` or a migration brief skill)
- "Want to re-run after Test 5 is confirmed?" (note that the score is provisional)

## Verification

A good scoring pass:
- Cites specific API features as YES/PARTIAL/NO evidence, not just assumed behavior
- Distinguishes between "the UI does this" (doesn't count) and "the API exposes this" (counts)
- Flags Test 5 as UNKNOWN rather than guessing
- Produces at least one actionable recommendation per tool

## Source

Extracted from Nate's Newsletter (natesnewsletter@substack.com), 2026-05-02 — "AI agents are about to route around every tool that can't pass 5 structural tests. Here's the diagnostic." Technique: 5-test diagnostic for agent-infrastructure classification of enterprise tools.
