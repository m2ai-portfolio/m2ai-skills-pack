---
name: code-review-memory
description: Accumulates repo-specific code review lessons and surfaces them before the next review of the same file or module. Learns from recurring issues -- migration bugs, error-handling patterns, fixture quirks, security gaps -- so the same mistake isn't flagged for the first time twice. Trigger phrases: "review this", "check this PR", "code review", "review these changes", "what do we know about this file".
---

# Code Review Memory

Every codebase has patterns that recur: the migration that breaks under concurrent writes, the error path that silently swallows exceptions, the fixture that breaks when the timezone changes. This skill stores those lessons per-repo and surfaces them at the start of each review so the reviewer already knows what to watch for.

## When to trigger

- User asks for a code review, PR review, or file-level review
- User says "what do we know about this file" or "any history on this module"
- User runs a review tool and wants prior lessons loaded first
- Any time a review finds a new lesson worth preserving for next time

## Phases

### Phase 1 -- Surface Prior Lessons

Before reviewing, check the memory store for lessons about the files being reviewed.

1. Identify the files in scope (from diff, PR, or explicit mention).
2. Read the repo memory store (default: `.code-review-memory.md` at repo root, or `$CODE_REVIEW_MEMORY_PATH` if set). If no store exists, skip ahead to Phase 2.
3. For each file or module in scope, extract matching lessons (by file path or module name).
4. Surface them as a block before the review begins:

```
## Prior lessons for this area

- [auth/middleware.ts] Error paths that return 200 on auth failure (2026-03-10)
- [db/migrations/] Migration rollbacks fail when column has DEFAULT -- always test both directions (2026-04-02)
```

If no prior lessons exist for these files, say so briefly and proceed.

### Phase 2 -- Conduct the Review

Perform the code review as requested. Focus on:
- Correctness and edge cases
- Error handling and failure modes
- Security boundaries (input validation, auth checks, secrets handling)
- Known patterns from prior lessons (surfaced in Phase 1)

### Phase 3 -- Extract New Lessons

After the review, identify any findings worth preserving for next time:

- Recurring pattern that will likely appear again
- Non-obvious constraint (a hidden invariant, a framework quirk, a library version dependency)
- Bug that took real investigation to find

For each new lesson, ask the user to confirm before writing:
> "Worth adding to memory? [file: auth/middleware.ts] Error paths that return 200 on auth failure."

Only write confirmed lessons. Do not auto-write every review finding.

### Phase 4 -- Write to Memory Store

Append confirmed lessons to `.code-review-memory.md` in this format:

```markdown
## [file-or-module-path]

- [YYYY-MM-DD] [Lesson text. One sentence. What to watch for and why.]
```

Group by file/module. If the file section already exists, append to it. Never overwrite prior entries.

If `$CODE_REVIEW_MEMORY_PATH` is set, write there instead.

## Memory Store Format

```markdown
# Code Review Memory

## auth/middleware.ts

- [2026-03-10] Error paths that return 200 on auth failure -- always check the catch block returns 401/403.
- [2026-04-15] JWT expiry is not validated client-side; server-side check is authoritative.

## db/migrations/

- [2026-04-02] Migration rollbacks fail when a column has a DEFAULT value and rows exist -- test both directions.
- [2026-04-20] Concurrent writes during migration window cause duplicate-key errors on the user_sessions table.

## tests/fixtures/

- [2026-03-28] Timezone-sensitive fixtures break when the CI runner is UTC but local is CST -- always freeze time.
```

## Storage

Default: `.code-review-memory.md` at repo root (gitignored recommended -- add to `.gitignore`).
Override: `$CODE_REVIEW_MEMORY_PATH` environment variable.

If the team should share lessons, remove from `.gitignore` and commit the file.

## Verification

- [ ] Prior lessons loaded and surfaced before review begins (or "no prior lessons" stated)
- [ ] Review conducted with prior lessons as context
- [ ] New lessons extracted and confirmed with user before writing
- [ ] Memory store updated (or no new lessons to add -- stated explicitly)
- [ ] Memory file path is configurable, not hardcoded

## Rules

- Only lessons the user explicitly confirms get written. Never auto-populate.
- Lesson text is one sentence, actionable, and file/module-scoped.
- Memory accumulates -- never overwrite prior entries when adding new ones.
- If the store grows beyond 200 entries, suggest a compaction pass (group similar lessons, remove stale ones).

## Source

Nate's Newsletter, 2026-05-07
https://natesnewsletter.substack.com/p/openclaw-agent-runtime-model-swapping
Pattern: Cumulative code-review memory -- store recurring repo-specific lessons and surface before next review of same file/module.
