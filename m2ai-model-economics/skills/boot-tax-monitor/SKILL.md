---
name: boot-tax-monitor
description: Monitor and alert when Claude Code session startup overhead (plugins, skills, MCP servers, CLAUDE.md chain) exceeds a configurable token threshold. Prevents the silent context bloat that eats your working memory before you type a single prompt.
---

# Boot Tax Monitor

Checks your Claude Code environment's startup token cost and warns when it exceeds a safe threshold. Designed to run periodically or on-demand to catch creeping bloat.

## Trigger

Use when the user says "boot tax", "startup overhead", "check my boot cost", "how heavy is my setup", "session startup cost", or wants to know how much context is consumed before they even start working.

## Phase 1: Measure Boot Tax

Calculate the total token cost of everything that loads when a new Claude Code session starts:

### 1. CLAUDE.md Chain
Measure global CLAUDE.md, project-level CLAUDE.md, project .claude/CLAUDE.md, and all MEMORY.md files.

### 2. Skill Descriptions
All skill `description` fields from SKILL.md frontmatter load into the system prompt. Count total skills and estimate combined description token weight.

### 3. MCP Server Tool Schemas
Each MCP server registers tool schemas that consume tokens. Count servers and estimate ~500 tokens per tool per server (conservative).

### 4. Hooks Configuration
Count total hooks across all event types.

## Phase 2: Score Against Threshold

Default thresholds (adjustable):

| Level | Token Range | Status |
|-------|------------|--------|
| Lean | <30K | All good -- plenty of working memory |
| Normal | 30K-60K | Acceptable for power users |
| Heavy | 60K-90K | Warning -- consider trimming |
| Critical | >90K | Alert -- significant context waste |

Calculate: `available_working_memory = context_limit - boot_tax`

For a 200K context window:
- Lean setup: ~170K working memory
- Critical setup: ~110K or less working memory

## Phase 3: Report

Output a single compact report:

```
Boot Tax Report
===============
CLAUDE.md chain:     XXK tokens
Skill descriptions:  XXK tokens (N skills)
MCP tool schemas:    ~XXK tokens (N servers)
Hooks:               XXK tokens (N hooks)
Memory files:        XXK tokens
-------------------------------
Total boot tax:      XXK tokens
Context limit:       200K tokens
Working memory:      XXK tokens (XX%)

Status: [LEAN / NORMAL / HEAVY / CRITICAL]
```

If HEAVY or CRITICAL, append the top 3 reduction opportunities with estimated savings.

## Phase 4: Trend Tracking (Optional)

If the user runs this regularly, store results to show trends:
```bash
echo "$(date -I),BOOT_TAX_TOKENS" >> ~/.claude/boot-tax-log.csv
```

On subsequent runs, show: `Last check: YYYY-MM-DD (XXK tokens) -> Today: XXK tokens (delta)`

## Integration Notes

- Pairs well with `token-burn-auditor` for deep-dive analysis
- Can be automated via `/loop` or `/schedule` for periodic checks
- Results can inform `compensating-complexity-auditor` when evaluating whether skill/hook overhead is justified

## Source Attribution

Technique derived from Nate's Newsletter (2026-04-02): "You're Loading 66,000 Tokens of Plugins Before You Even Type" -- the "66K token" problem of invisible startup overhead.
