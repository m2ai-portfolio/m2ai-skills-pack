---
name: context-cost-line-item-analyzer
description: Decompose an agent's token spend into context-as-input vs output-as-output, identify the specific context drivers (startup overhead, system prompt bloat, MCP tool registration, plugin chain, CLAUDE.md chain), and produce targeted reduction recommendations. Use when the user says "context cost breakdown", "why is context eating my budget", "context line items", "decompose my token spend", "what's consuming my context window", or asks why context -- not output -- is the expensive line item in their agent economics.
---

# Context Cost Line Item Analyzer

Breaks down an agent session's token spend by driver category, separating context-loaded-before-first-prompt from output-generated-during-session. Identifies the largest context contributors and ranks reduction opportunities by token savings.

## Trigger

Use when the user says "context cost breakdown", "context line items", "why is context so expensive", "decompose my token spend", "what's eating my context window", "context vs output analysis", or wants to understand *why* context -- not output -- is the dominant cost in their agent workflow.

## Phase 1: Classify Spend

Separate total token spend into two buckets:

**Context bucket (loaded before first useful token of output):**
- Startup overhead: global CLAUDE.md, project CLAUDE.md, MEMORY.md files
- Skill descriptions: all SKILL.md `description` frontmatter fields
- MCP tool schemas: all registered MCP server tool definitions
- Hook configurations: PreToolUse, PostToolUse, Stop, SessionStart hooks
- System prompt: base instructions, persona, rules injected by the harness
- Prior conversation turns retained in context (compacted or not)

**Output bucket (generated during the session):**
- Tool call parameters and results
- Assistant text responses
- Thinking/reasoning tokens (if extended thinking enabled)

Ask the user to provide: current session token usage breakdown (available from Claude Code `/cost` or session stats), their CLAUDE.md chain, and their MCP server list. If unavailable, estimate from environment scan.

## Phase 2: Environment Scan

If the user cannot provide a usage breakdown, estimate from the local environment:

```
Scan checklist:
[ ] Count CLAUDE.md files in chain (global + project + .claude/)
[ ] List all skills/ and count description field character lengths
[ ] List MCP servers from settings.json / settings.local.json
[ ] List hooks from settings files
[ ] Check MEMORY.md size
```

Estimate tokens: ~4 chars per token (rough heuristic for English prose).

## Phase 3: Driver Ranking Table

Produce a ranked table of context drivers:

```
Context Cost Line Items
========================
Driver                        Tokens    % of Context
-----------------------------  -------  ------------
MCP tool schemas (N servers)   XXK       XX%
CLAUDE.md chain (N files)      XXK       XX%
Skill descriptions (N skills)  XXK       XX%
System prompt                  XXK       XX%
Prior turns (compacted)        XXK       XX%
Hooks configuration            XXK       XX%
MEMORY.md files                XXK       XX%
-----------------------------  -------  ------------
Total context load             XXK       100%

Output tokens this session:    XXK
Context:Output ratio:          X.X:1

Diagnosis: [CONTEXT-HEAVY / BALANCED / OUTPUT-HEAVY]
```

A ratio above 3:1 (context to output) signals that context cost is the problem, not output volume.

## Phase 4: Reduction Recommendations

For each top driver, propose a targeted intervention:

| Driver | Reduction Action | Estimated Savings |
|--------|-----------------|-------------------|
| MCP schemas | Disable unused MCP servers | Up to X tokens/session |
| Skill descriptions | Shorten verbose descriptions | Up to X tokens/session |
| CLAUDE.md chain | Consolidate or trim rules | Up to X tokens/session |
| Prior turns | Reduce compaction threshold | Up to X tokens/session |
| System prompt | Defer boilerplate to first user turn | Up to X tokens/session |

Rank by savings potential. Do not recommend disabling something that is actively referenced by a running workflow.

## Phase 5: Report Output

```
Context Cost Analysis — [DATE]
==============================
[Driver ranking table from Phase 3]

Top 3 Reduction Opportunities:
1. [Action] — saves ~XXK tokens/session (~$X.XX/month at current usage)
2. [Action] — saves ~XXK tokens/session
3. [Action] — saves ~XXK tokens/session

Context:Output ratio: X.X:1 ([status])
```

If the ratio is already under 2:1, report that context is not the problem and redirect attention to output efficiency.

## Integration Notes

- Pairs with `token-burn-auditor` (which measures total overhead) and `boot-tax-monitor` (which tracks startup cost specifically)
- Use after a heavy session to understand where the spend went before optimizing
- Reduction actions can be handed to `compensating-complexity-auditor` to check whether any MCP or skill flagged for removal is actively load-bearing
- Can be run on a per-project or per-agent basis by scoping the CLAUDE.md chain and settings files

## Source Attribution

Technique derived from Nate's Newsletter (2026-05-10): "Executive Briefing: Six announcements in 48 hours just changed how enterprise AI gets bought" -- Nate's observation that "context, not tokens, is the line item ruining agent economics" and that capping usage kills the use case without fixing the cause.
