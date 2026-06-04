---
name: agent-environment-optimizer
description: Audit an agent's execution environment for cold-start patterns, missing warm caches, stale dependencies, and session persistence gaps. Scores against best practices from OpenAI Hosted Shell and METR research showing unoptimized environments negate AI productivity gains. Use when the user says "optimize agent environment", "cold start audit", "agent environment check", "why is my agent slow to start", "warm cache audit", "session persistence check", or wants to speed up agent execution by fixing the environment layer.
---

# Agent Environment Optimizer

Audit whether an agent's execution environment follows persistent-environment best practices. Flags cold-start patterns that silently eat productivity gains and suggests fixes.

## Source

Nate's Newsletter, 2026-04-16. References OpenAI's Hosted Shell pattern and METR study showing unmodified environments negate AI gains.

## Trigger

Use when the user asks about agent startup speed, execution environment optimization, cold-start problems, or why their agent takes so long before doing useful work.

## Prerequisites

- Target environment must be accessible (local machine, SSH target, or container)
- Works for Claude Code, the agent platform agents, or any LLM agent setup

## Phase 1: Environment Discovery

Identify the agent's execution context:

1. **Runtime type**: local process, container, SSH remote, cloud VM
2. **Session model**: ephemeral (fresh each run) vs. persistent (long-lived process)
3. **Entry point**: how the agent starts (CLI, daemon, cron, webhook)

Gather data:
```bash
# Language runtimes and versions
python3 --version 2>/dev/null; node --version 2>/dev/null
# Package manager caches
ls -la ~/.cache/pip/ 2>/dev/null; ls -la ~/.npm/_cacache/ 2>/dev/null
# Build caches
ls -la ~/.cache/pre-commit/ 2>/dev/null
# Git state
git status 2>/dev/null | head -5
```

## Phase 2: 6-Dimension Assessment

Score each dimension 1-5 (1 = fully cold, 5 = fully warm):

### D1: Dependency Availability
- [ ] All package dependencies pre-installed (not installed at runtime)
- [ ] Lock files present and up to date
- [ ] No `pip install` / `npm install` in startup path
- [ ] Virtual environments pre-built and activated

### D2: Compilation Cache
- [ ] Build artifacts cached between runs (dist/, __pycache__, .next/)
- [ ] TypeScript compilation cache warm
- [ ] Pre-commit hook environments pre-built
- [ ] No "first run" compilation penalty

### D3: Context Pre-loading
- [ ] CLAUDE.md / system prompts loaded without file I/O at query time
- [ ] Memory/context databases pre-warmed
- [ ] MCP server connections established before first tool call
- [ ] Relevant project files indexed or cached

### D4: Auth Persistence
- [ ] API tokens loaded from environment, not fetched per-request
- [ ] SSH keys pre-loaded in agent
- [ ] OAuth tokens refreshed proactively, not on-demand
- [ ] No interactive auth prompts in automated flows

### D5: Session Continuity
- [ ] Agent state survives process restarts
- [ ] Conversation history persisted to disk/DB
- [ ] Work-in-progress checkpointed (not lost on crash)
- [ ] Session ID / context carried across invocations

### D6: Tool Readiness
- [ ] CLI tools on PATH without activation steps
- [ ] MCP servers pre-started (not cold-started per query)
- [ ] Database connections pooled
- [ ] File watchers / indexes pre-built

## Phase 3: Cold-Start Pattern Detection

Flag these specific anti-patterns:

| Pattern | Signal | Impact |
|---------|--------|--------|
| **Install-on-boot** | `pip install` / `npm install` in entrypoint | 30-120s added per start |
| **Auth-on-first-call** | Token fetch in first tool invocation | 2-10s + potential failure |
| **Index-on-demand** | File indexing triggered by first search | 5-60s depending on repo size |
| **Cache-miss cascade** | No __pycache__, no .next/, no node_modules/.cache | Cumulative 10-30s |
| **Context-reload** | Full CLAUDE.md chain re-parsed every message | Token waste per turn |
| **Ephemeral workspace** | /tmp or container with no volume mount | All state lost between runs |

## Phase 4: Optimization Report

Produce a scorecard:

```
Agent Environment Score: XX/30

D1 Dependency Availability:  X/5
D2 Compilation Cache:        X/5
D3 Context Pre-loading:      X/5
D4 Auth Persistence:         X/5
D5 Session Continuity:       X/5
D6 Tool Readiness:           X/5

Cold-Start Patterns Found: N
Estimated startup overhead: ~Xs
```

Then list fixes ranked by impact:

```
#1 FIX: [Pattern name]
   Current: [what happens now]
   Target:  [what should happen]
   How:     [specific command or config change]
   Saves:   ~Xs per agent start
```

## Phase 5: Implementation Checklist

Generate a concrete checklist the user can execute:

- [ ] Fix #1: [specific action]
- [ ] Fix #2: [specific action]
- [ ] Fix #3: [specific action]
- [ ] Re-run this audit to verify score improvement

## Verification

- All 6 dimensions assessed with evidence (not assumed)
- Cold-start patterns backed by actual file/config checks, not guesses
- Fix recommendations are specific enough to execute without further research
- Estimated time savings are conservative (under-promise)
