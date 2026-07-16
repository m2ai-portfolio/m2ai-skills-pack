---
name: memory-fingerprint-architect
description: Design a personalized Claude Code memory system by cloning existing open-source memory frameworks, auditing them with Claude Code, and cherry-picking the patterns that fit your workflow. Produces a lightweight memory spec with salience rules, decay/promotion schedules, and multi-signal retrieval, then wires the system via CLAUDE.md, hooks, or agent-scoped memory. Use when saying "design my memory system", "build my memory", "personalize my CLAUDE.md memory", "memory architect", or "memory fingerprint".
---

# Memory Fingerprint Architect

Design a memory system that reflects how *you* actually work — not a generic framework someone else built.
The core insight: memory is a fingerprint. No two should look the same.

## Prerequisites

- Claude Code installed and running
- `git` available in PATH
- A few minutes to answer questions about your workflow

## Phase 1: Clone & Audit Existing Frameworks

1. Search GitHub for open-source Claude Code memory systems (query: `claude-code memory CLAUDE.md`).
   Pick 2–3 repos that have stars or recent activity.

2. Clone them to a working directory:

```bash
git clone <repo-url-1> /tmp/memory-audit/repo1
git clone <repo-url-2> /tmp/memory-audit/repo2
```

3. For each repo, ask Claude Code:

> Read all the files in /tmp/memory-audit/repo1. What memory strategies does this system use?
> List: how memories are saved, how they are retrieved, what triggers decay or promotion,
> and what the injection mechanism is (CLAUDE.md / hooks / agent-scoped).

4. Collect the strategy list across all repos into a comparison matrix. Columns: strategy, injection method, decay rule, complexity.

## Phase 2: Identify Your Patterns

Ask yourself (or have Claude Code interview you with these questions):

- What kinds of things do you forget between sessions that slow you down?
- What context feels redundant to re-explain every session?
- How often do you work in the same codebase vs. switching projects?
- Do you prefer explicit memory (you decide what to save) or automatic capture?
- What's the blast radius of a wrong or stale memory? (High → be conservative)

Map your answers to strategies from Phase 1. Pick the smallest set that covers your friction points.

## Phase 3: Draft a Lightweight Memory Spec

Using the cherry-picked patterns, write a memory spec (a short markdown doc) covering:

**Salience rules** — what triggers a save:
- Corrections Claude made that shouldn't repeat
- Preferences you stated about style, output format, or tool choice
- Project-specific invariants (auth patterns, DB access rules, naming conventions)
- Feedback you gave that was non-obvious

**Disclosure rules** — what gets surfaced per session:
- Always: user role, active project context, top 3 open decisions
- On-demand: detailed project history, past mistakes by category
- Never surface: resolved bugs, one-off decisions with no recurrence value

**Compaction rules** — what gets summarized or pruned:
- Merge memories within the same category when count exceeds a threshold (e.g., 5 similar feedback items → 1 consolidated rule)
- Prune memories not accessed in N sessions (default: 10)
- Pin high-impact memories so they survive pruning

**Decay & Promotion schedule**:
- New memory: status = `fresh` (surfaces every session)
- After 3 sessions without access: status = `dormant` (only surfaces when relevant keyword appears)
- After 10 sessions without access: candidate for pruning
- Promotion: any memory explicitly invoked by the user → `pinned` (survives pruning)

**Multi-signal retrieval triggers**:
- Keyword match: memory surfaces when the session topic overlaps its tags
- File-path match: memories tagged to a file/module surface when that file is edited
- Error-type match: memories about a bug class surface when that error type appears

## Phase 4: Choose an Injection Approach

Pick one or combine:

**Approach 1 — CLAUDE.md (simplest)**
Write your memory spec directly into your project or user-level `CLAUDE.md` under a `## Memory` section.
Best for: static facts, invariants, style preferences that rarely change.

```markdown
## Memory
- User role: [your role and expertise level]
- Key project invariants: [...]
- Feedback history: [consolidated rules from past sessions]
```

**Approach 2 — Hooks (dynamic)**
Use a `SessionStart` hook that reads memory files and injects relevant ones based on the current working directory or recent git activity.

```python
# ~/.claude/hooks/session-start-memory.py
# Reads memory files from a configurable directory (default: ~/.claude/memory/)
# Injects the top-N most relevant memories into session context based on:
#   - cwd match
#   - recency
#   - salience score
```

**Approach 3 — Agent-Scoped (isolation)**
Each agent or project gets its own memory namespace. Useful when you work across multiple clients or projects with very different conventions.
Memory files live under `<project-root>/.claude/memory/` and are only injected for that project.

## Phase 5: Wire & Verify

1. Implement the chosen injection approach.
2. Start a fresh Claude Code session and ask: "What do you know about me and this project?"
3. Verify the response includes your injected memories without including stale or irrelevant context.
4. Run 2–3 real work sessions. After each, note what memory was missing or wrong.
5. Patch the spec until the "Who am I?" query produces a useful, accurate answer.

## Maintenance Loop

After every 10 sessions (or weekly, whichever comes first):
- Review memories for staleness: delete anything no longer true
- Promote memories that kept appearing manually → mark as pinned
- Compact clusters of similar feedback into single consolidated rules
- Check compaction: if total memory file size exceeds a self-set limit (e.g., 20KB), prune aggressively

## What Not to Store

- Code patterns, architecture, file paths → readable from the codebase
- Bug fixes → the fix is in the code; the commit message has the context
- Git history → `git log` is authoritative
- Ephemeral task state → use todos, not memory
- Anything already in CLAUDE.md (duplication causes confusion)

## Source Attribution

Technique from Mark Kashef: "Master ALL 7 Levels of Claude Code Memory" (2026-04-22)
https://www.youtube.com/watch?v=OMkdlwZxSt8
