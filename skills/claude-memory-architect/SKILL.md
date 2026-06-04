---
name: claude-memory-architect
description: Interview-driven skill that designs a custom Claude Code memory system tailored to how the user actually works. Clones open-source memory repos, audits their patterns, then builds a personal memory spec using building blocks — decay, promotion, multi-signal retrieval, salience, disclosure, compaction — deployed via CLAUDE.md entries, hooks, or agent-scoped files. Trigger phrases: "build my memory system", "design my CLAUDE.md memory", "memory architect", "personal memory spec", "I keep repeating context to Claude".
---

# Claude Memory Architect

Memory is a fingerprint. No two people should have the same one. This skill interviews you, audits existing patterns from the community, and builds you a memory system that fits your working style rather than a template.

## When to Invoke

- User says "build my memory system", "design my Claude memory", "memory architect", "what should I remember between sessions"
- User notices they repeat the same context at the start of every session
- User has tried a generic memory template and it didn't stick
- User is starting a new project and wants to set up memory intentionally from the beginning

## Phase 1: Interview (7 Questions, One at a Time)

Ask these sequentially. Never batch them.

1. **What type of work do you do most?** (code, writing, analysis, client work, mixed)
2. **What do you most often re-explain to Claude at session start?** (project context, preferences, active tasks, all of the above)
3. **How far back does "recent context" meaningfully go?** (hours, days, weeks)
4. **Do you need memory across multiple projects or one project?** (sets scope)
5. **Can you tolerate a few seconds of memory loading at session start, or does startup speed matter?** (hooks vs CLAUDE.md)
6. **Are there things you never want Claude to remember?** (explicit exclusions)
7. **Will you actively maintain your memory, or do you need it to decay gracefully on its own?** (determines decay rules)

## Phase 2: Repo Audit (Clone & Cherry-Pick)

Identify 2-3 public Claude Code memory repos relevant to the user's answers. For each:

- What is the core philosophy? (structured facts / narrative / event log / hybrid)
- What injection mechanism does it use? (CLAUDE.md / hook / external store)
- What would break if the user adopted this verbatim?
- What single pattern from this repo is worth stealing?

Summarize what to take and what to leave:

```
PATTERN INVENTORY
=================
Keep:
  - [Pattern A] from [Repo X] — because [reason tied to user's answers]
  - [Pattern B] from [Repo Y] — because [reason]

Skip:
  - [Pattern C] — incompatible with [constraint user stated]
  - [Pattern D] — overkill given [user's maintenance tolerance]
```

## Phase 3: Design the Memory Spec

Build the user's personal memory spec using these building blocks. Use only the ones that earn their place.

### Building Blocks

**Salience** — What gets written at all? Bias toward surprises, corrections, and non-obvious preferences. Skip facts Claude can re-derive from the code.

**Disclosure** — What can Claude surface unprompted vs only when asked? High-salience memories may surface freely. Sensitive or speculative memories stay latent.

**Decay** — How long before a memory becomes stale? Define a TTL per category (e.g. active tasks: 7 days, preferences: indefinite, project context: 30 days).

**Promotion** — What triggers a memory from short-term to long-term? (repeated relevance, user confirmation, a certain output type)

**Multi-Signal Retrieval** — Does retrieval rely on keyword match, semantic similarity, recency, or a combination? Pick the retrieval signal that matches the user's lookup habits.

**Compaction** — When the memory store grows large, what gets summarized vs discarded? Establish a compaction cadence if the user's volume warrants it.

Output a lightweight spec:

```markdown
# My Memory Spec

## What I remember
- [category]: [what goes here], TTL: [decay window]
- [category]: [what goes here], TTL: [decay window]

## What I don't remember
- [explicit exclusion]: [why]

## Retrieval approach
[how memories surface — keyword / semantic / recency / explicit lookup]

## Compaction rule
[when to summarize vs delete]
```

## Phase 4: Choose Injection Approach

Pick exactly one primary approach (or a deliberate combination):

### Approach A — CLAUDE.md Entries
Write memory directly into CLAUDE.md as structured sections. Low overhead. Read at every session. Best for stable, slow-changing context (preferences, project invariants, explicit rules).

### Approach B — Hooks (SessionStart / UserPromptSubmit)
A hook reads memory files at session start and injects relevant entries. Higher flexibility — memory files can be updated without touching CLAUDE.md. Best for high-volume, frequently-changing memory.

### Approach C — Agent-Scoped
Memory lives in an agent's own CLAUDE.md or system prompt. Isolated from the main session. Best when multiple specialized agents need separate memory contexts.

For most users: start with **Approach A** for stable facts, add a **SessionStart hook** only if volume grows beyond what's readable inline.

## Phase 5: Build and Wire

Write the initial memory content. For each entry:

```markdown
## [Category]
<!-- TTL: [decay window] | Salience: [high/medium/low] -->
[memory content]
```

If a hook is chosen, write the hook script skeleton. If agent-scoped, identify which agent owns which memory section.

Finish with a verification test: ask Claude "who am I?" or "what are you working on?" and confirm the answer reflects the memory correctly without prompting.

## Verification

- [ ] All 7 interview questions answered (no blanks)
- [ ] At least one repo was audited and pattern inventory produced
- [ ] Memory spec exists with explicit TTLs and exclusions
- [ ] Injection approach chosen with a stated reason
- [ ] Verification query produced the expected memory-grounded answer

## Source

Mark Kashef — "Master ALL 7 Levels of Claude Code Memory" (2026-04-22)
https://www.youtube.com/watch?v=OMkdlwZxSt8

Core technique: the 3-step clone-audit-cherry-pick process, the "memory fingerprint" philosophy (no two memory systems should look the same), and the building block vocabulary (decay, promotion, salience, disclosure, compaction, multi-signal retrieval). Injection approaches drawn from the video's three-path taxonomy.
