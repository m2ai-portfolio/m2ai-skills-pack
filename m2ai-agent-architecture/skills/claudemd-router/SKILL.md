---
name: claudemd-router
description: Restructure a bloated CLAUDE.md into a lean router that delegates to compartmentalized .claude/rules/ files. Use when CLAUDE.md exceeds ~80 lines, when adding a new domain of instructions, or when the user says "clean up my CLAUDE.md", "my CLAUDE.md is too long", or "organize my rules".
---

# CLAUDE.md Router Pattern

Keep CLAUDE.md lean (~50 lines) as an air traffic controller. Detailed instructions live in `.claude/rules/` files. CLAUDE.md points to them — Claude only loads a rule file when the task matches.

## Why

- A 300-line CLAUDE.md gets injected into every session, burning context on instructions irrelevant to the current task
- Rules files are loaded on-demand — only when Claude determines the task matches their description
- Each rule file can be iterated independently without touching the central config
- Shared projects benefit: CLAUDE.md + rules go in the repo, personal overrides go in `.claude.local.md`

## Phase 1: Audit

1. Read the current CLAUDE.md
2. Identify distinct instruction domains (e.g., email style, code review, deploy process, API conventions, testing rules)
3. For each domain, note the line count and whether it's always-relevant (keep in CLAUDE.md) or task-specific (extract to rules)

**Always-relevant (stays in CLAUDE.md):**
- Project name and one-line purpose
- Build/test/lint commands
- Key architecture constraints (< 5 lines each)
- Pointers to rule files

**Task-specific (extract to rules):**
- Detailed style guides (email tone, report format, copywriting)
- API-specific procedures (auth flows, endpoint patterns)
- Domain-specific conventions (database access patterns, state machine rules)
- Deployment checklists

## Phase 2: Extract Rules

For each task-specific domain, create a file in `.claude/rules/`:

```
.claude/rules/
├── email-drafting.md
├── code-review.md
├── deploy-checklist.md
└── api-conventions.md
```

Each rule file should be self-contained:
- Start with a one-line purpose
- Include all the detail that was previously inline in CLAUDE.md
- Keep to one concern per file
- Target 20-80 lines per rule file

## Phase 3: Rewrite CLAUDE.md as Router

Replace extracted sections with one-line pointers. Pattern:

```markdown
# Project Name

One-line description.

## Commands
- `npm run build` — compile
- `npm test` — run tests

## Architecture (always loaded)
- All DB access through Repository singleton
- State transitions via state_machine.can_transition()

## Rules (loaded on demand)
- Email drafting → see .claude/rules/email-drafting.md
- Code review standards → see .claude/rules/code-review.md
- Deploy process → see .claude/rules/deploy-checklist.md
- API conventions → see .claude/rules/api-conventions.md
```

## Phase 4: Local Overrides

If the project is shared, create `.claude.local.md` for personal preferences:
- Timezone, name, communication style
- Personal shortcuts or aliases
- Add to `.gitignore`

## Verification

- [ ] CLAUDE.md is under 80 lines
- [ ] Each extracted rule file is self-contained (no dangling references)
- [ ] No duplicate instructions between CLAUDE.md and rule files
- [ ] `.claude.local.md` is in `.gitignore` (if created)
- [ ] Run a test prompt touching one domain — confirm Claude loads the correct rule file

## Source

Extracted from: "One Folder Makes Claude Code 10x Better" by Mark Kashef (2026-03-27)
https://www.youtube.com/watch?v=oYIXe6aqh_U
