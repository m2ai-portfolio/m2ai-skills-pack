---
name: agent-memory-architecture-matrix
description: Interactive decision matrix that walks a builder through choosing between provider-hosted memory (fast, locked) and self-owned memory (portable, more maintenance), weighted to their actual constraints. Outputs an architectural decision record with rationale. Use when the user is designing an agent's memory layer, comparing memory backends, deciding between Claude memory, Mem0, Zep, SQLite, or custom, or writing a memory architecture ADR.
---

# Agent Memory Architecture Decision Matrix

Guides a builder from raw constraints to a concrete memory architecture choice, then produces an ADR they can commit to their repo.

## When to Invoke

Trigger on: "how should I store agent memory", "which memory backend", "Claude memory vs Mem0 vs Zep", "design memory layer", "memory architecture ADR", "persistent agent state".

## Decision Dimensions

Ask the user (one at a time, inline):

1. **Portability requirement** — must the memory survive platform migration? (yes/nice-to-have/no)
2. **Latency budget** — is sub-100ms recall mandatory, or is 1-2s acceptable?
3. **Memory volume** — rough count of distinct memories after 6 months (hundreds / thousands / millions)
4. **Recall style** — keyword search / semantic search / structured queries / mixed
5. **Team size maintaining it** — solo builder / small team / dedicated platform team
6. **Budget** — hosted spend tolerance per month
7. **Compliance** — any data residency, PII, or audit requirements

## Backend Candidates

Score each on a 1-5 scale per dimension:

| Backend | Portability | Latency | Scale | Maintenance | Cost | Compliance |
|---------|-------------|---------|-------|-------------|------|------------|
| Provider-hosted (Claude/GPT/Gemini memory) | 1 | 5 | 5 | 5 | 4 | 2 |
| Mem0 (hosted) | 3 | 4 | 4 | 4 | 3 | 3 |
| Zep (hosted or self-host) | 4 | 4 | 4 | 3 | 3 | 4 |
| SQLite + embedding column | 5 | 3 | 3 | 3 | 5 | 5 |
| Postgres + pgvector | 5 | 4 | 5 | 2 | 3 | 5 |
| Custom JSON files + FTS | 5 | 2 | 2 | 2 | 5 | 5 |

## Weighting

Multiply each backend's scores by the user's stated priorities, then rank. Tie-break by portability (the most-underweighted axis per Nate's 2026-04-08 thesis).

## Output — ADR Template

```markdown
# ADR: Agent Memory Architecture

**Date**: {date}
**Status**: Proposed

## Context
{1-paragraph summary of the agent, its memory use case, and the constraints the user stated}

## Decision
We will use **{chosen backend}** for persistent memory because:
- {top reason tied to the user's highest-weighted dimension}
- {portability stance — explicit}
- {latency stance — explicit}

## Alternatives Considered
| Backend | Score | Why Not |
|---------|-------|---------|
| ...     | ...   | ...     |

## Portability Plan
How memories are exported and re-imported if we migrate. If the chosen backend is provider-hosted and non-portable, **this section must call that out as a known risk and specify a snapshot cadence.**

## Rollback
What replaces this if the backend disappears, is acquired, or changes terms.
```

## Verification

- [ ] All 7 dimensions were asked (or had sensible defaults applied with a note)
- [ ] The chosen backend has the highest weighted score
- [ ] Portability Plan is non-empty even if the answer is "we accept the lock-in"
- [ ] ADR saved to a repo path the user specifies, or to `/tmp/adr-agent-memory-{date}.md`

## Source

Nate's Newsletter — "512,000 Lines of Leaked Code Reveal the Lock-In Strategy Coming for Your AI Stack" (2026-04-08). The thesis that behavioral/memory context is the most-underrated lock-in axis shaped the tie-break rule above.
