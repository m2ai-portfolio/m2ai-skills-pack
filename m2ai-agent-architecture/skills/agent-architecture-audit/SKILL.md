---
name: agent-architecture-audit
description: Evaluate an agent codebase against 12 infrastructure primitives (permission model, token budget, crash recovery, tool assembly, streaming events, state machine, provenance, stop reasons, boot sequence, verification harness, memory decay, health checks) and return a severity-ranked gap analysis with prioritized upgrade path. Use when auditing agent architecture, reviewing agent readiness, or planning what infrastructure to build next.
---

# Agent Architecture Audit

Evaluates an existing agent codebase against 12 production infrastructure primitives derived from Claude Code's internal architecture. Returns a gap analysis ranked by severity with a phased upgrade path.

## Trigger

Use when the user says "audit my agent", "agent architecture review", "what infrastructure am I missing", "agent readiness check", "12 primitives", "production readiness audit", or asks whether their agent system is ready for production.

## Phase 1: Identify the Agent Codebase

Determine what to audit:
1. If the user specifies a path, use that
2. If in a project directory with agent code, use that
3. Ask the user to point you at the codebase

Scan for agent infrastructure signals:
- Entry points (main loop, server start, CLI handler)
- Tool/function calling patterns
- LLM API calls (Anthropic, OpenAI, Google, etc.)
- State management (DB, files, in-memory)
- Configuration files (settings, env, hooks)

## Phase 2: Evaluate Against 12 Primitives

Score each primitive as PRESENT, PARTIAL, or MISSING. For each, check specific indicators:

### Day-One Primitives (must-have before first user)

**1. Permission Model**
- Are destructive tools gated behind approval?
- Are there deny-lists or allow-lists per mode/context?
- Indicators: permission checks, approval flows, tool filtering

**2. Token Budget Guardian**
- Is there a pre-turn token budget check?
- Does the system halt gracefully on budget exhaustion?
- Indicators: token counting, budget ceiling, stop-on-exceed logic

**3. Crash Recovery / Checkpointing**
- Is session state persisted after significant events?
- Can the agent resume after an unexpected crash?
- Indicators: state serialization, checkpoint writes, resume logic

**4. Health Check / Doctor**
- Can the agent validate its own dependencies at startup?
- Are API credentials, connections, and tools verified?
- Indicators: startup validation, /doctor or health endpoint, dependency checks

### Week-One Primitives (needed for reliable daily use)

**5. Tool Pool Assembly**
- Are tools filtered by context/mode/permissions?
- Is the system prompt minimized by excluding irrelevant tools?
- Indicators: dynamic tool lists, mode-based filtering, tool registry

**6. Streaming Event System**
- Are typed events emitted during execution?
- Can external systems observe agent progress in real-time?
- Indicators: event emitters, typed event schemas, SSE/websocket streams

**7. State Machine with Idempotency**
- Are long-running workflows modeled as explicit states?
- Do retries avoid double-firing side effects?
- Indicators: state enums, transition guards, idempotency keys

**8. Stop Reason Taxonomy**
- Does every conversation end with a structured stop reason?
- Are stop reasons distinguishable (completed, budget, error, timeout, cancelled)?
- Indicators: stop reason enums, structured return values, exit handlers

### Month-One Primitives (for production maturity)

**9. Staged Boot Sequence**
- Is initialization ordered and parallelized where possible?
- Do failures at any stage produce clear diagnostics?
- Indicators: boot phases, parallel init, pre-validation

**10. Verification Harness**
- Are there invariant tests for agent behavior?
- Do tests cover: destructive tool approval, schema validation, budget stops?
- Indicators: test suites, invariant assertions, CI integration

**11. Memory with Decay and Provenance**
- Does memory track source, age, and trust level?
- Do old memories decay or get consolidated?
- Indicators: memory metadata, aging logic, provenance fields

**12. Provenance-Aware Context Assembly**
- Are context fragments tagged with source and trust level?
- Are contradictions between sources detected?
- Indicators: metadata on injected context, source tracking, conflict flags

## Phase 3: Score and Rank

Produce a scorecard:

```
Agent Architecture Audit
========================
Codebase: [path or name]
Date: [today]

Day-One Primitives (Critical)
  1. Permission Model        [PRESENT / PARTIAL / MISSING]
  2. Token Budget Guardian    [PRESENT / PARTIAL / MISSING]
  3. Crash Recovery           [PRESENT / PARTIAL / MISSING]
  4. Health Check             [PRESENT / PARTIAL / MISSING]

Week-One Primitives (Important)
  5. Tool Pool Assembly       [PRESENT / PARTIAL / MISSING]
  6. Streaming Events         [PRESENT / PARTIAL / MISSING]
  7. State Machine + Idem.    [PRESENT / PARTIAL / MISSING]
  8. Stop Reason Taxonomy     [PRESENT / PARTIAL / MISSING]

Month-One Primitives (Maturity)
  9. Staged Boot Sequence     [PRESENT / PARTIAL / MISSING]
  10. Verification Harness    [PRESENT / PARTIAL / MISSING]
  11. Memory Decay/Provenance [PRESENT / PARTIAL / MISSING]
  12. Context Provenance      [PRESENT / PARTIAL / MISSING]

Score: X/12 (PRESENT=1, PARTIAL=0.5, MISSING=0)
Rating: [PRODUCTION-READY / NEARLY-READY / SIGNIFICANT-GAPS / EARLY-STAGE]
```

Rating thresholds:
- 10+ = PRODUCTION-READY
- 7-9.5 = NEARLY-READY
- 4-6.5 = SIGNIFICANT-GAPS
- <4 = EARLY-STAGE

## Phase 4: Upgrade Path

For each MISSING or PARTIAL primitive, provide:

1. **What's needed** -- concrete implementation description (2-3 sentences)
2. **Complexity** -- Weekend project / Multi-sprint
3. **Priority** -- based on tier (Day-One > Week-One > Month-One)
4. **Dependencies** -- other primitives that should come first

Order the upgrade path chronologically:
```
Recommended Upgrade Path
========================
Sprint 1 (This week):
  - [Primitive] -- [What to build] -- [Complexity]

Sprint 2 (Next week):
  - [Primitive] -- [What to build] -- [Complexity]

Sprint 3+ (Month):
  - [Primitive] -- [What to build] -- [Complexity]
```

## Output Format

Lead with the scorecard. Follow with the upgrade path. Keep explanations tight -- this is a diagnostic tool, not a tutorial.

## Source Attribution

Technique derived from Nate's Newsletter (2026-04-03): "Your Agent Is 80% Plumbing" -- 12 infrastructure primitives mapped from Claude Code's leaked source architecture, organized into day-one/week-one/month-one priority tiers.
