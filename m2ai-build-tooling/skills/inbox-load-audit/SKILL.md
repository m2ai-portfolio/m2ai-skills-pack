---
name: inbox-load-audit
description: Scans installed skills, plugins, MCP servers, hooks, and scheduled tasks to produce an inbox load score — how many independently-managed AI surfaces the user is maintaining. Outputs a score, breakdown, and top recommendations to reduce load.
---

# Inbox Load Audit

Diagnoses tool sprawl by counting and categorizing independently-managed AI surfaces (skills, plugins, MCP servers, hooks, scheduled tasks, active agents). Produces a single numeric score, a per-category breakdown, and actionable recommendations to reduce the number of surfaces that demand attention.

The audit answers the question Nate Kadlac put plainly: "the agents are real, they work, and the product they have collectively produced is another inbox." Inbox load audit makes that load measurable.

## Trigger

Use when the user says "inbox load audit", "how many inboxes do I have", "tool sprawl check", "how overloaded am I", "how many surfaces am I managing", "audit my setup", or asks why their AI tools feel like work rather than leverage.

## Phase 1: Discovery

Scan for installed AI surfaces. For each category, count and list items. Work from what the user provides or what is discoverable in the session context:

**Category A — Skills**
- All skill directories in the skills installation path
- Distinguish: active (invoked in last 14 days), stale (not invoked in 14+ days), unsponsored (no agent or callsite reference)

**Category B — MCP Servers**
- All entries in the MCP config (claude_desktop_config.json or equivalent)
- Each MCP server = one independently-managed API surface

**Category C — Hooks**
- All PreToolUse, PostToolUse, SessionStart, UserPromptSubmit hooks
- Each hook = one automated behavior that can fire unexpectedly and requires maintenance

**Category D — Scheduled Tasks / Crons**
- All recurring tasks (cron jobs, scheduled agents, automation routines)
- Each scheduled task = one inbox that accumulates output needing review

**Category E — Active Agents**
- Named agents with running processes or dispatch endpoints
- Each agent = one inbox of queued tasks and output that needs monitoring

**Category F — Plugins**
- Installed Claude Code plugins
- Flag: plugins with missing install paths (stale registry entries)

If the user cannot provide paths or configs, ask for a directory listing from their Claude Code settings.

## Phase 2: Score Calculation

```
Base score = (A_total × 1) + (B_total × 2) + (C_total × 1.5) + (D_total × 3) + (E_total × 4) + (F_total × 1)
```

Weight rationale:
- Skills (×1): passive until invoked — low maintenance per item
- MCP Servers (×2): each requires auth, version management, and error monitoring
- Hooks (×1.5): can fire silently; failure mode is often invisible
- Scheduled Tasks (×3): each creates output that becomes an inbox requiring attention
- Active Agents (×4): each has a task queue, error stream, and output stream
- Plugins (×1): low but nonzero — can break on Claude Code updates

**Stale multiplier:** add 50% to the base score for each stale or unsponsored item (items that add overhead without delivering value).

**Inbox Load Score (ILS):**
```
ILS = min(100, base_score + stale_penalty)
```

| ILS Range | Interpretation |
|-----------|---------------|
| 0–20 | Lean — setup is under control |
| 21–40 | Manageable — some cleanup opportunity |
| 41–60 | Heavy — tool proliferation is creating real drag |
| 61–80 | Overloaded — more time managing tools than using them |
| 81–100 | Critical — the tools are the inbox |

## Phase 3: Output

```
## Inbox Load Audit

| Category         | Count | Stale/Unsponsored | Weighted Score |
|------------------|-------|-------------------|----------------|
| Skills           |   X   |        Y          |      Z         |
| MCP Servers      |   X   |        Y          |      Z         |
| Hooks            |   X   |        Y          |      Z         |
| Scheduled Tasks  |   X   |        Y          |      Z         |
| Active Agents    |   X   |        Y          |      Z         |
| Plugins          |   X   |        Y          |      Z         |
| **Total**        |       |                   |   **ILS: XX**  |

**Status: [Lean / Manageable / Heavy / Overloaded / Critical]**

### Top 3 Reduction Recommendations

[Ordered by impact-per-effort:]

1. [Category] — [specific item or group] — [consolidation or removal action]
2. [Category] — [specific item or group] — [consolidation or removal action]
3. [Category] — [specific item or group] — [consolidation or removal action]

### Stale Surface List

[Items that scored the stale multiplier — prime candidates for removal or cold-archiving:]
- [item name] ([category]) — last active: [date or "unknown"]
```

## Phase 4: Recommendations Logic

Prioritize recommendations using this order:
1. **Scheduled tasks with no known consumer** — each fires, produces output, and has nobody reading it. Highest inbox-creation rate per item.
2. **Stale skills with no agent sponsor and no callsite reference** — dead weight that slows session startup and adds cognitive load.
3. **Duplicate-coverage items** — two skills doing the same thing (e.g., two audit skills for the same domain). Recommend consolidation.
4. **MCP servers not referenced in any active skill or CLAUDE.md rule** — load at startup, consume auth budget, never used.
5. **Plugins with missing install paths** — load at startup, fail silently, provide no value.

## Verification

A good audit:
- Lists every discovered item, not a sample
- Does not recommend deleting anything without confirming it has no active sponsor
- Stale multiplier is applied only to items with no verifiable activity, not just old items
- The ILS reflects reality: a user with 3 heavy scheduled agents should score higher than one with 20 passive skills
- Recommendations are specific (name the item) not categorical (don't say "reduce MCP servers" — say which one and why)

## Source

Extracted from Nate Kadlac newsletter (2026-05-05) — "The Anticipation Gap: Why 4 Problems Have to Be Solved Together for Consumer AI to Work" — diagnosis that reactive agents collectively produce "another inbox." Formalized into a measurable score using the `skill-audit` and `token-burn-auditor` audit patterns already in the the skill library library.
