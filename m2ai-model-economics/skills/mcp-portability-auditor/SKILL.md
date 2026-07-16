---
name: mcp-portability-auditor
description: Scan an agent stack (Claude Code plugins, Conway .cnw.zip files, Gemini extensions, ChatGPT GPTs) and flag which capabilities are locked to one platform vs portable via open MCP. Outputs a portability score per tool and a migration checklist. Use when the user asks to audit their agent extensions, score MCP portability, check for vendor-proprietary extension formats, or plan a move to open standards.
---

# MCP Portability Auditor

Classifies every extension, plugin, connector, and skill in a user's agent stack as either **Open (MCP-compatible)** or **Proprietary (vendor-locked)**, and produces a portability score.

## When to Invoke

Trigger on: "audit my MCP setup", "which of my plugins are portable", "check my extensions for lock-in", "score my agent stack for portability", "can I move my GPTs to Claude", "is this skill MCP-compatible".

## Inputs

Ask the user (skip any already answered):

1. **Claude Code plugins / skills directory** — usually `~/.claude/plugins/` and `~/.claude/skills/`
2. **MCP servers configured** — check `~/.claude.json` or Claude Desktop config
3. **ChatGPT / Custom GPTs in active use** — names and whether they rely on proprietary actions
4. **Gemini extensions / Gems** — any active extensions
5. **Conway `.cnw.zip` files** — if any (speculative until Conway ships)
6. **Cursor/Copilot/other IDE extensions** — if relevant

## Classification Rules

For each item, classify as:

- **OPEN (MCP)** — implemented via Model Context Protocol, works across any MCP-speaking client. Portability score: 5/5.
- **OPEN-ADJACENT** — uses a standard API (REST, OAuth) but ties to a single client's UI/invocation. Portable with moderate rework. Score: 3/5.
- **PROPRIETARY** — vendor-only format (`.cnw.zip`, Custom GPT actions, Gemini Gem manifests, Claude skills without MCP equivalents). Score: 1/5.
- **LOCKED** — contains proprietary state (training data, tuned behavior) that cannot be exported at all. Score: 0/5.

## Output Format

```markdown
# MCP Portability Audit — {date}

## Inventory
| Tool | Host | Format | Category | Score |
|------|------|--------|----------|-------|
| ...  | Claude Code | MCP server | OPEN | 5/5 |

## Portability Score
Overall: {weighted avg}/5 ({count} tools audited)

## Breakdown by Host
- Claude Code: N tools, avg X/5
- ChatGPT: ...
- Gemini: ...

## Migration Candidates (high value, currently locked)
1. {tool} — {why it matters} — {MCP equivalent or rebuild cost}

## Keep As-Is
Tools that are either already portable or whose lock-in cost is justified.

## Open-Source MCP Equivalents Worth Adopting
{list of community MCP servers that would replace proprietary items}
```

## Verification

- [ ] Every item has an explicit host, format, and category
- [ ] Proprietary items include a concrete migration path (or "no MCP equivalent yet — accept lock-in")
- [ ] Claude skills that are pure prompt content are flagged as PORTABLE regardless of host
- [ ] Output saved to `/tmp/mcp-portability-audit-{date}.md` unless user specifies otherwise

## Source

Nate's Newsletter — "512,000 Lines of Leaked Code Reveal the Lock-In Strategy Coming for Your AI Stack" (2026-04-08). Builds on Nate's observation that Conway's `.cnw.zip` format is an explicit bet against MCP as the portability standard.
