---
name: next
description: Generate a continuation prompt for a fresh session and list current tasks. Use when wrapping up a session or handing off work.
argument-hint: What will the next session be used for?
---

Build a handoff document so a fresh Claude Code session can continue this work without re-reading the conversation.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the document accordingly.

## Step 1: Gather context

1. Scan the conversation for: completed work, decisions made, files changed, bugs found, gotchas discovered, and outstanding items.
2. Run `git diff --stat` in the current working directory (if it is a git repo) to capture uncommitted changes.
3. Check for active tasks via TaskList.
4. Read the auto-memory index (MEMORY.md in the current project's memory directory) for relevant recent entries.

## Step 2: Write the handoff document

Save a Markdown file to the OS temporary directory:
- Path: `$TMPDIR/claude-handoff-<YYYY-MM-DD>-<short-slug>.md` (use `mktemp --tmpdir` parent; on Linux this is `/tmp`).
- The `<short-slug>` is a 2-3 word kebab-case label derived from the session's primary topic.

### Document structure

```markdown
# Handoff: <one-line summary>
Date: <YYYY-MM-DD>
Working directory: <cwd>

## What was done
<1-5 bullet points. Completed work only.>

## Current state
<Uncommitted changes, running processes, partial migrations, anything a fresh session needs to know about the environment right now.>

## What remains
### Ready to execute
<Items that can be started immediately.>

### Blocked / needs decision
<Items waiting on input, a prerequisite, or a human choice.>

### Backlog
<Known future work, not urgent.>

## Gotchas & discoveries
<Bugs found, workarounds applied, surprising behavior, constraints discovered. Omit if none.>

## Suggested skills
<List 1-5 Claude Code slash commands (e.g. `/diagnose`, `/self-healing-pipeline`) that would be useful in the next session, with a one-line reason each. Only suggest skills that are genuinely relevant to the remaining work.>

## References
<Paths or URLs to PRDs, plans, ADRs, issues, commits, diffs, or other artifacts that contain detail. Do NOT duplicate their content above -- just point to them.>
```

### Content rules

- **No duplication.** If detail exists in a plan, PRD, ADR, issue, commit message, or diff, reference it by path or URL instead of restating it.
- **Redact sensitive information.** Replace API keys, passwords, tokens, and PII with `[REDACTED]`. Never include secrets in the handoff document.
- **Self-contained.** Assume the next session has CLAUDE.md and auto-memory but NOT this conversation. Include enough context that the next agent can act without asking "what were we doing?"
- **Concise.** Target under 400 words for the entire document. Lead with action, not recap.

## Step 3: Output

1. Write the handoff document to the temp-dir path.
2. Print the full document contents to the conversation so the user can review it.
3. Print the file path so the user can paste it into the next session (e.g. `Read /tmp/claude-handoff-2026-05-26-auth-refactor.md`).
4. Print the task list from "What remains" as a clean standalone list below the document -- this doubles as a quick-reference without opening the file.
