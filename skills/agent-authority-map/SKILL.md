---
name: agent-authority-map
description: Audit and visualize what an agent is actually allowed to do — parses Claude Code settings, hooks, MCP server configs, and tool permissions to surface authority gaps where the agent takes actions no human explicitly approved. Use when the user says "agent authority map", "what can my agent do", "permission audit", "authority gaps", or wants to inventory autonomous actions before a deployment review.
---

# Agent Authority Map

Document and visualize the actual permission surface of a Claude Code agent (or any autonomous agent with a config-driven permission model). Surfaces "authority vacuums" — actions the agent is silently authorized to take that no human explicitly approved.

Inspired by Nate's observation that "the most dangerous vulnerabilities are organizational authority vacuums" — agents inherit broad permissions, then act on them without anyone noticing the gap between policy and practice.

## When to Use

- Before promoting a Claude Code config from a personal sandbox to a shared/team setup
- After installing new plugins, MCP servers, or hooks that may have expanded the permission surface
- During a deployment review when you need to answer "what is this agent allowed to touch?"
- When onboarding a new collaborator and you need to show them the blast surface

## Inputs

- Path to a Claude Code project directory (defaults to current working directory)
- Optional: path to user-level `~/.claude/settings.json` for global scope

## Phases

### Phase 1 — Inventory permission sources

Read all of these (skip silently if missing):

1. `~/.claude/settings.json` — global allow/deny lists, env vars, hooks
2. `<project>/.claude/settings.json` — project allow/deny
3. `<project>/.claude/settings.local.json` — local overrides
4. `~/.claude/installed_plugins.json` — installed plugins
5. `<project>/.mcp.json` and `~/.claude.json` — MCP server registrations
6. All hook files referenced from settings (PreToolUse, PostToolUse, Stop, etc.)

### Phase 2 — Classify each permission

For every entry, classify into:

- **EXPLICIT ALLOW** — user wrote a `permissions.allow` rule for this
- **EXPLICIT DENY** — user wrote a `permissions.deny` rule
- **IMPLICIT ALLOW** — tool exists in default tool set, no rule written, no deny match
- **HOOK-GATED** — a PreToolUse hook intercepts this action
- **MCP-EXPOSED** — capability comes from an MCP server (note which server)

### Phase 3 — Detect authority gaps

Flag any of the following as **GAPS**:

- File-write tools (Write, Edit, NotebookEdit) with no PreToolUse hook AND no explicit allow
- Bash with broad allow rules (e.g. `Bash(*)`, `Bash(npm:*)` without further constraint) and no command-validator hook
- MCP servers granting network/external-API access without an explicit allow rule
- Hooks that reference scripts that no longer exist on disk
- Permission rules in `settings.local.json` that contradict `settings.json` (local widens what global narrowed)

### Phase 4 — Produce the map

Output a structured report with these sections:

```
AGENT AUTHORITY MAP
===================
Scope: <project path>
Generated: <timestamp>

PERMISSION SURFACE
- Tools allowed: N (E explicit, I implicit)
- Tools denied: N
- Hooks active: N (PreToolUse: N, PostToolUse: N, Stop: N)
- MCP servers: N (capabilities: ...)

AUTHORITY GAPS (sorted by severity)
1. [HIGH] Bash(*) allowed with no command validator hook
2. [MED]  MCP server "X" can write to external API with no allow rule
3. [LOW]  Hook script /path/to/foo.sh referenced but missing

RECOMMENDED ACTIONS
- ...
```

## Verification

- Re-run after applying recommended fixes; gap count should decrease
- Cross-check against `claude --debug` startup output to confirm the same hooks/permissions Claude is actually loading
- Compare two runs (before/after a plugin install) to see exactly what authority changed

## Source Attribution

Concept extracted from Nate's Newsletter, 2026-04-05: *"Executive Briefing: OpenClaw Deployments Are Spreading Through Your Org"* — specifically the framing of "organizational authority vacuums" as the highest-severity deployment risk.
