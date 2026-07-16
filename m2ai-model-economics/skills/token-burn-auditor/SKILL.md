---
name: token-burn-auditor
description: Audit the live Claude Code environment for token waste -- measures per-session overhead, flags system prompt bloat, checks plugin/skill loading totals, and gives before/after deltas when changes are made. Real-time linter for AI workflows.
---

# Token Burn Auditor

Audits your current Claude Code environment to identify where tokens are being wasted. Measures actual overhead, flags bloat, and produces actionable reduction targets.

## Trigger

Use when the user says "audit my tokens", "where are my tokens going", "token burn", "session overhead", "why is my context so full", "token waste", or asks about optimizing their Claude Code environment for token efficiency.

## Phase 1: Measure Current Overhead

Run the following diagnostics:

1. **Skill frontmatter scan** -- count total skills in `~/.claude/skills/` and estimate token load from all SKILL.md files:
   ```bash
   find ~/.claude/skills -name "SKILL.md" | wc -l
   find ~/.claude/skills -name "SKILL.md" -exec wc -w {} + | tail -1
   ```

2. **CLAUDE.md chain** -- measure the full instruction chain that loads on every session:
   - `~/.claude/CLAUDE.md` (global)
   - Project-level `CLAUDE.md`
   - Any `.claude/CLAUDE.md` in project
   - Memory files referenced by these

3. **MCP server count** -- check how many MCP servers are configured

4. **Hook overhead** -- count configured hooks

5. **Session history weight** -- if JSONL session logs exist, sample recent ones for size

## Phase 2: Calculate Token Budget

Estimate token consumption using these approximations:
- 1 word ~ 1.3 tokens (English text)
- 1 line of code ~ 10 tokens
- YAML/JSON frontmatter ~ 1.5x word count in tokens

Produce a breakdown table:

| Source | Est. Words | Est. Tokens | % of 200K |
|--------|-----------|-------------|-----------|
| Global CLAUDE.md | X | X | X% |
| Project CLAUDE.md | X | X | X% |
| Skill descriptions (N skills) | X | X | X% |
| MCP server schemas (N servers) | X | X | X% |
| Hooks config | X | X | X% |
| Memory files | X | X | X% |
| **Total static overhead** | **X** | **X** | **X%** |

Note: 200K is the effective context for Sonnet/Opus. Adjust if the user specifies a different limit.

## Phase 3: Identify Waste

Flag issues in priority order:

1. **Critical (>10% of context)**: Any single source consuming >20K tokens
2. **Warning (5-10%)**: Sources between 10K-20K tokens
3. **Info (<5%)**: Normal overhead, no action needed

Specific patterns to flag:
- Skills that haven't been invoked in 30+ days (check `skill_invocations.db` if available)
- Duplicate or overlapping skill coverage
- CLAUDE.md sections that repeat information already in skills
- MCP servers that are configured but unused
- Memory files that have grown beyond 500 words

## Phase 4: Recommend Reductions

For each flagged issue, provide:
1. **What to do** -- specific action (archive skill, trim CLAUDE.md section, etc.)
2. **Token savings** -- estimated tokens recovered
3. **Risk** -- what capability is lost if this is removed

Produce a summary:
```
Current static overhead: ~XXK tokens (XX% of 200K context)
Achievable reduction:    ~XXK tokens
Post-optimization:       ~XXK tokens (XX% of 200K context)
```

## Phase 5: Before/After Delta (Optional)

If the user makes changes based on recommendations, re-run Phase 1-2 and show the delta:
```
Before: XXK tokens (XX%)
After:  XXK tokens (XX%)
Saved:  XXK tokens
```

## Output Format

Keep output concise and scannable. Use tables over paragraphs. Lead with the number, not the explanation.

## Source Attribution

Technique derived from Nate's Newsletter (2026-04-02): "You're Loading 66,000 Tokens of Plugins Before You Even Type" -- token waste taxonomy and environment-level auditing approach.
