---
name: claude-architect-audit
description: >
  Audit your Claude Code setup against Anthropic's 5 Certified Architect domains.
  Checks CLAUDE.md layering, enforcement strategy (prompts vs hooks), tool descriptions,
  context management, and agent architecture. Use when you want to level up your
  Claude Code configuration, prepare for the architect certification, or diagnose
  why Claude isn't performing well in your project.
---

# Claude Architect Audit

Structured self-assessment against Anthropic's Claude Certified Architect framework.
Covers all 5 domains with actionable checks and fixes.

Source: Mark Kashef — "Anthropic's Claude Architect Guide In 39 Minutes" (2026-03-22)
https://www.youtube.com/watch?v=vizgFWixquE

## Phase 1: CLAUDE.md Layering (Domain: Configuration Management)

Check that CLAUDE.md follows the three-layer architecture — not a monolithic dump.

### Checks

1. **User-level** (`~/.claude/CLAUDE.md`) — personal preferences only: editor settings, explanation format, communication style. NOT project rules.
2. **Project-level** (`<project>/CLAUDE.md`) — team-shared: coding conventions, architecture decisions, verification loops, tech stack. Version-controlled.
3. **Path-specific rules** (`.claude/rules/*.md`) — scoped rules with glob patterns at the top. Testing rules load only when editing tests. API rules load only in API folders.

### Action

```
Audit:
- Read ~/.claude/CLAUDE.md — flag any project-specific content that should move to project level
- Read <project>/CLAUDE.md — flag any personal preferences that should move to user level
- Check .claude/rules/ — if empty, identify 2-3 high-value path-specific rules to create
- Flag token waste: any rule that loads on every session but only applies to <20% of tasks
```

### Fix Pattern

Split monolithic CLAUDE.md into layers. Create `.claude/rules/testing.md` with:
```
---
pattern: "tests/**"
---
# Testing Rules
- Use pytest with asyncio_mode = "auto"
- Every test file needs a docstring explaining what it covers
```

## Phase 2: Enforcement Strategy (Domain: Governance)

Determine whether each behavioral rule should be a **prompt** or a **hook**.

### Decision Framework

| Characteristic | Use Prompt | Use Hook |
|---------------|-----------|----------|
| Failure impact | Low — style/formatting | High — security/compliance/data |
| Tolerance | 90%+ compliance acceptable | Must be 100% — zero tolerance |
| Nature | Suggestions, preferences | Laws, hard blocks |
| Examples | Code style, comment format, naming | No secrets in commits, no force-push to main, API model verification |

### Checks

1. List all rules in CLAUDE.md that say "NEVER" or "ALWAYS"
2. For each: can a single violation cause real harm? If yes → should be a hook, not a prompt
3. Check `~/.claude/hooks.json` — are critical rules enforced there?
4. Check for "prompt-only" rules that have historically failed (user had to correct Claude)

### Action

```
Audit:
- Grep CLAUDE.md for NEVER/ALWAYS/MUST patterns
- Cross-reference with hooks.json
- Flag high-risk rules that lack hook enforcement
- Recommend hookify candidates
```

## Phase 3: Tool Descriptions (Domain: Tool Orchestration)

Claude selects tools based on descriptions. Vague or overlapping descriptions cause wrong tool selection.

### Checks

1. Review MCP server tool descriptions — are they specific enough to distinguish from similar tools?
2. Check for overlapping tool scopes (e.g., two tools that both "retrieve data")
3. Verify `tool_choice` strategy: are critical first steps forced? Are subsequent steps auto?

### Action

```
Audit:
- List all available MCP tools and their descriptions
- Flag any pair with >60% semantic overlap
- Check if any critical workflows use tool_choice: "auto" where "forced" would be safer
- Recommend description rewrites for ambiguous tools
```

## Phase 4: Context Window Management (Domain: Performance)

Keep Claude sharp across long sessions. Information in the middle of context gets fuzzy.

### Three Strategies

1. **Pin key facts** — extract critical information and place it at the top of the conversation (system prompt, CLAUDE.md). Claude pays strongest attention to the first ~40% and the most recent messages.
2. **Trim verbose outputs** — tool results often include metadata that doesn't move the task forward. Configure tools to return minimal payloads. Strip unnecessary fields.
3. **Delegate to sub-agents** — heavy research/analysis tasks should run in isolated agent contexts. Only the clean summary returns to the main session. Use `context:fork` in skills.

### Checks

1. Is `/memory` showing context usage >60%? Time to start a fresh session with a summary.
2. Are tool outputs bloating context with metadata? (e.g., full API responses when you only need 3 fields)
3. Are research-heavy skills using `context:fork`?
4. Is there a pattern of Claude "forgetting" instructions mid-session?

### Action

```
Audit:
- Check context-hygiene practices: /fork, /by-the-way, context:fork usage
- Identify skills that should have context:fork but don't
- Flag any CLAUDE.md content >500 lines (likely too large)
- Recommend session checkpoint strategy
```

## Phase 5: Agent Architecture (Domain: System Design — 27% of exam)

How you structure multi-agent systems and tool orchestration.

### Key Concepts

- **tool_choice modes**: `auto` (Claude decides), `any` (must use a tool, picks which), `forced` (specific tool required)
- **Guardrail pattern**: Force tool calls for first 1-2 steps to ensure consistent entry, then loosen to `auto` for autonomous execution
- **Sub-agent isolation**: Each agent maintains its own context. Parent gets clean summaries only.
- **Commands as reusable prompts**: `/review-pr`, `/generate-tests`, `/daily` — save once, trigger with slash

### Checks

1. Do multi-step workflows have forced first steps?
2. Are agent teams using proper isolation (worktrees, context:fork)?
3. Are reusable patterns saved as commands/skills rather than re-typed each time?
4. Is there a clear separation between orchestrator and worker agents?

### Action

```
Audit:
- List all slash commands — are common workflows covered?
- Check agent-team prompts for proper role/dependency structure
- Verify worktree isolation for parallel agent execution
- Flag any "God agent" patterns (single agent doing everything)
```

## Verification

After running all 5 phases, produce a scorecard:

| Domain | Score | Key Finding | Action Item |
|--------|-------|-------------|-------------|
| CLAUDE.md Layering | /5 | | |
| Enforcement Strategy | /5 | | |
| Tool Descriptions | /5 | | |
| Context Management | /5 | | |
| Agent Architecture | /5 | | |

**Total: /25**

- 20-25: Architect-ready
- 15-19: Solid foundation, specific gaps to close
- 10-14: Major restructuring needed
- <10: Start with Phase 1 and work sequentially
