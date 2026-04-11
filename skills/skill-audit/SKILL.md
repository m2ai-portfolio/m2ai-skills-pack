---
name: skill-audit
description: Audit your Claude Code skills directory, CLAUDE.md, and recent session patterns to surface candidates for new skills -- gaps, redundancies, and formalization opportunities.
---

# Skill Backlog Audit

Scans your existing skill library, CLAUDE.md instructions, and workflow patterns to identify what should be formalized into a skill but hasn't been yet.

## Trigger

Use when the user says "audit my skills", "what skills am I missing", "skill audit", "skill backlog", "what should be a skill", or asks about gaps in their skill library.

## Phase 1: Inventory

Scan these sources and build a full inventory:

1. **Skills directory** (`~/.claude/skills/`) -- list every skill, its description, trigger patterns, and category
2. **Plugins** (`~/.claude/plugins/installed_plugins.json`) -- list installed plugins and their capabilities
3. **CLAUDE.md files** -- read `~/.claude/CLAUDE.md` and the current project's `CLAUDE.md` for repeated instruction patterns that could be skills
4. **Hooks** (`~/.claude/settings.json`, `~/.claude/settings.local.json`) -- check for hook-based behaviors that might work better as skills

Build a table:

| # | Skill/Plugin | Category | Trigger Coverage | Last Modified |
|---|-------------|----------|-----------------|---------------|

## Phase 2: Gap Analysis

Analyze the inventory for:

### Missing Skills
- Repeated multi-step workflows in CLAUDE.md that aren't skills yet
- Patterns the user does frequently (check conversation history if available) that have no skill
- Common Claude Code operations with no skill coverage (deployment, testing, refactoring patterns)

### Redundant Skills
- Skills with overlapping trigger patterns (risk of wrong skill firing)
- Skills that cover the same domain from different angles (candidates for merging)

### Underspecified Skills
- Skills missing description fields (won't trigger reliably for agents)
- Skills with vague triggers ("use when needed")
- Skills without verification/output phases

## Phase 3: Recommendations

Produce a ranked list of recommendations:

```
PRIORITY | ACTION     | TARGET              | RATIONALE
---------|------------|---------------------|----------
1        | CREATE     | <skill name>        | <why>
2        | MERGE      | <skill A> + <B>     | <why>
3        | IMPROVE    | <existing skill>    | <what's weak>
```

Limit to top 10 recommendations. For each CREATE recommendation, include:
- Suggested skill name
- One-line description
- Trigger patterns
- Estimated complexity (trivial / weekend / multi-sprint)

## Phase 4: Output

Present findings as:
1. **Summary stats**: total skills, total plugins, coverage gaps found, redundancies found
2. **Recommendations table** (from Phase 3)
3. **Quick wins**: any recommendations that could be implemented in under 30 minutes

Do NOT auto-create skills. This is an audit -- the user decides what to act on.

## Source Attribution

Technique: Skill Backlog Audit prompt pattern
Source: Nate's Newsletter (natesnewsletter@substack.com), 2026-03-30
Post: "Your Best AI Work Vanishes Every Session. 4 Prompts That Make It Permanent"
