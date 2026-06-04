---
name: memory-system-assembler
description: Build a personalized Claude Code memory system by auditing open-source memory repos, cherry-picking patterns that match your workflow, and assembling them into a coherent design. Use when setting up memory for the first time, redesigning an existing memory system, or evaluating new memory patterns from the OSS ecosystem.
---

# Memory System Assembler

Guides a builder from zero to a working, personalized Claude Code memory system by sampling the open-source memory ecosystem rather than reinventing it.

## Trigger

Use when the user says "build my memory system", "design my Claude Code memory", "what memory patterns should I use", "audit memory repos", "help me set up memory for Claude Code", "my memory feels generic", or "how do I customize Claude Code memory."

## Phase 1: Workflow Interview

Ask the user one question at a time in natural conversation:

1. **Session cadence** -- How many Claude Code sessions per day? (1-3 / 4-8 / 8+)
2. **Primary work type** -- What do you use Claude Code for most? (code / writing / research / multi-project management / mixed)
3. **What breaks for you** -- When memory fails, what gets lost? (preferences, decisions, project context, cross-session patterns, all of the above)
4. **Persistence horizon** -- How far back does memory need to reach? (current session only / about a week / indefinitely)
5. **Maintenance appetite** -- How much time per week are you willing to spend maintaining memory? (0 minutes / ~5 minutes / 30+ minutes)
6. **Solo or shared** -- Is this a solo Claude Code environment or shared across a team?

## Phase 2: Map the 7 Memory Layers

Teach the user the building blocks before picking them. Present this table and explain each layer briefly:

| Layer | What it stores | Lifespan | Maintenance |
|-------|---------------|----------|-------------|
| 1. In-context | Current session facts injected via prompt | Session only | Zero |
| 2. CLAUDE.md rules | Durable behavioral rules and conventions | Permanent | Manual edits |
| 3. Memory files | Structured facts in a `/memory/` directory | Permanent | Auto-capture or manual |
| 4. Hooks | Triggered capture (SessionStart, PostToolUse, etc.) | Permanent | One-time setup |
| 5. Scheduled compaction | Periodic summaries of session transcripts | Rolling window | Cron or manual |
| 6. External store | SQLite or vector DB for semantic recall | Permanent | Integration work |
| 7. Agent-managed | A sub-agent writes learnings back after each task | Permanent | Agent ownership |

Ask: "Which of these layers do you already have? Which are missing from your setup?" Use the gaps and the interview answers to focus the next phase.

## Phase 3: Audit Reference Repos

Based on the interview, suggest 2-3 open-source Claude Code memory repos to clone and audit. For each:

```bash
git clone <repo_url> /tmp/memory-audit/<repo-name>
```

Then audit it inside Claude Code with this prompt:

> "Read this repo and tell me: (1) which of the 7 memory layers it implements, (2) what files it creates or modifies, (3) estimated maintenance burden per week, (4) the single most useful pattern for someone whose primary work type is [user's answer from Phase 1]."

Produce a comparison table after auditing all repos:

| Repo | Layers covered | Key pattern | Fits this user? |
|------|---------------|-------------|-----------------|
| ...  | ...           | ...         | Yes / No / Partial |

## Phase 4: Cherry-Pick and Assemble

From the audit results, select patterns that scored "Yes" or "Partial" for this user's workflow. For each selected pattern:

- State which layer it addresses
- Describe what file it creates or modifies
- State the weekly maintenance cost honestly

Generate an assembly plan before writing any files:

```
Memory System Plan
==================
Layers in scope: [list]
Files to create: [list]
Hooks to install: [list]
Estimated setup time: [X minutes]
Estimated weekly maintenance: [X minutes]

Step 1: [concrete action]
Step 2: [concrete action]
...
```

Get the user's confirmation before proceeding to Phase 5.

## Phase 5: Generate Artifacts

For each selected pattern, produce the actual file content:

**CLAUDE.md memory section** -- rules for what to remember and when. Example:

```markdown
## Memory Protocol

After every session, capture:
- Decisions made (what and why)
- Preferences the user corrected
- Project context that would take >30 seconds to re-establish

Store in `./memory/` as dated markdown files.
```

**Memory file templates** -- e.g., `memory/user.md`, `memory/project.md` with frontmatter:

```markdown
---
type: user | project | feedback | reference
updated: YYYY-MM-DD
---
```

**Hook stubs** -- if the user has hooks enabled:

```python
# session-start-memory.py (SessionStart hook)
# Reads memory files and injects them as context at session start
import os, glob
memory_dir = os.path.join(os.getcwd(), "memory")
for f in glob.glob(f"{memory_dir}/*.md"):
    print(open(f).read())
```

**Compaction script stub** -- if maintenance appetite >= 5 min/week:

```python
# compact_memory.py -- run weekly or when memory files exceed 50 entries
# Summarizes dated memory files into a single rolling summary
```

All paths use `./` or an environment variable -- no hardcoded absolute paths.

## Verification

- [ ] All 6 interview questions answered (or sensible defaults applied with a note)
- [ ] User knows which of the 7 layers they are and are not implementing, and why they skipped the others
- [ ] At least one open-source repo was audited before cherry-picking patterns
- [ ] Assembly plan was confirmed by user before any files were generated
- [ ] All generated file paths use `./` or env-configurable values -- no hardcoded personal directories
- [ ] Weekly maintenance cost stated explicitly and accepted

## Source

Mark Kashef -- "Master ALL 7 Levels of Claude Code Memory" (YouTube, 2026-04-22). Video ID: `OMkdlwZxSt8`. Core insight: with 35+ open-source memory systems available, memory should be treated like a fingerprint -- no two should look the same. The clone-audit-cherry-pick pattern avoids reinventing the wheel while keeping the result personalized to actual workflow.
