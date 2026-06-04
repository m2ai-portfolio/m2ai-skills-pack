---
name: claude-code-memory-architect
description: Interviews the user to design and build a personalized Claude Code memory system — choosing which building blocks (decay, promotion, multi-signal retrieval, salience, compaction) to include, then wiring the result into CLAUDE.md, hooks, or agent-scoped memory. Use when a user wants to build, redesign, or consolidate their Claude Code memory layer. Trigger phrases: "build my memory system", "design memory for Claude Code", "memory architect", "7 levels of memory", "personalize my CLAUDE.md memory", "memory fingerprint".
---

# Claude Code Memory Architect

Every Claude Code memory system should be a fingerprint — unique to how that person works.
This skill interviews the user, teaches them the building blocks, and builds their personalized stack.

## Core Principle

Memory is not one-size-fits-all. Before building, the user needs to answer:
- What do I actually want to remember across sessions?
- What should decay or get promoted over time?
- How do I want memory injected into Claude's context?

## Phase 1: Research (Optional but Recommended)

If the user wants to survey existing approaches before designing their own:

1. Identify 2-3 reference memory repos (can be public GitHub repos or examples the user provides).
2. Audit each with Claude Code using this prompt per repo:
   > "Summarize this memory system: what does it remember, how is it stored, how is it injected into context, does it have decay/promotion logic, and what's the maintenance burden?"
3. For each repo, note: what's worth keeping, what's overkill, what's missing for this user's needs.
4. Produce a one-page comparison before designing anything.

## Phase 2: User Interview

Ask these questions one at a time. Accept short answers — depth is in Phase 3.

1. **What are you trying to remember?** (user facts, project facts, style preferences, past mistakes, decisions, relationships, recurring tasks — pick all that apply)
2. **How stale does memory get?** A project memory from 3 months ago — still valid? (yes/maybe/usually stale)
3. **Recall mode** — do you want memory surfaced automatically at session start, or only when explicitly queried?
4. **Volume** — rough count of distinct memories after 6 months: tens / hundreds / thousands
5. **Maintenance tolerance** — willing to curate memory manually? (yes, sometimes, no — should be automatic)
6. **Team or solo?** Does anyone else use this Claude Code environment?
7. **Sensitive data** — are any memories PII or confidential? (affects storage choice)

## Phase 3: Building Block Education

Present only the blocks relevant to the user's answers. For each block, one-sentence plain-English explanation + whether it applies to this user.

| Block | What it does | When it matters |
|-------|-------------|-----------------|
| **Salience scoring** | Rates how important a memory is at creation time | When volume is hundreds+ |
| **Disclosure gating** | Controls which memories are shared vs. private | When team or sensitive data |
| **Compaction** | Merges similar memories to prevent duplication | When maintenance tolerance is low |
| **Decay** | Reduces weight of old memories over time | When memories go stale in months |
| **Promotion** | Elevates frequently-accessed memories to always-on | When some facts are always relevant |
| **Multi-signal retrieval** | Combines keyword + semantic + recency signals for lookup | When volume is hundreds+ |
| **Category tagging** | Groups memories by type (user / project / feedback / reference) | When recall mode is query-based |

Mark each: INCLUDE / SKIP / OPTIONAL for this user.

## Phase 4: Memory Recipe

Produce a one-page memory spec in this format:

```markdown
## My Memory Recipe

**What I'm remembering:** {list from interview}
**Stale after:** {days/months/never}
**Recall mode:** {automatic at session start / query-based / both}
**Blocks included:** {list from Phase 3}
**Blocks skipped:** {list with one-line reason each}

### Storage
{where memories live: CLAUDE.md inline / separate memory file / structured JSON}

### Maintenance cadence
{how often memories are reviewed or auto-compacted}
```

Get user confirmation before proceeding.

## Phase 5: Build

Implement the memory system according to the recipe. The three injection approaches:

### Approach 1: CLAUDE.md inline
Write memories directly as sections in the user's CLAUDE.md. Best for: small volume, always-on facts, no decay needed.

```markdown
## My Memory
[type: user] Role: senior platform engineer, strong Go background, new to React
[type: feedback] Prefer inline examples over abstract explanations
[type: project] Current focus: auth rewrite — deadline 2026-06-01
```

### Approach 2: Hooks
Write a `SessionStart` hook that loads memories from a file and injects them as context. Best for: larger volume, automatic recall, decay/promotion logic.

```python
# ~/.claude/hooks/load-memory.py
# Reads memory file, filters by recency/salience, outputs to session context
```

The hook should:
- Load memories from a structured file (JSON or YAML)
- Filter: skip memories with decay score below threshold
- Sort: promoted memories first, then by last_accessed descending
- Output: formatted string injected into session start

### Approach 3: Agent-scoped
Memories stored per-agent in each agent's own context file. Best for: multi-agent environments where different agents need different memory subsets.

```
agents/
  research/memory.md   # research-focused memories
  coding/memory.md     # code style, project context
  shared/memory.md     # facts all agents need
```

## Phase 6: Wiring

After writing the memory files/hooks:

1. Test the injection: open a new session, confirm memories appear in context.
2. Verify the user can see: "Who am I?" or "What do you know about me?" returns accurate, non-stale content.
3. Write a one-line memory update procedure the user will actually follow when something changes.

## Verification

- [ ] User interview completed (all 7 questions answered or explicitly skipped)
- [ ] Building blocks reviewed — each either included or skipped with a reason
- [ ] Memory recipe confirmed by user before build
- [ ] At least one approach implemented and tested in a new session
- [ ] "Who am I?" sanity check passes (Claude returns accurate summary from memory)
- [ ] No hardcoded absolute paths — all memory file paths are env-configurable or use `~`

## Source

Mark Kashef — "Master ALL 7 Levels of Claude Code Memory" (2026-04-22)
https://www.youtube.com/watch?v=OMkdlwZxSt8

Core extractions: the fingerprint framing ("no two memory systems should look the same"), the 3-step research technique (clone → audit → cherry-pick), the memory building blocks taxonomy (salience/disclosure/compaction/decay/promotion/multi-signal retrieval), and the three injection approaches (CLAUDE.md / hooks / agent-scoped).
