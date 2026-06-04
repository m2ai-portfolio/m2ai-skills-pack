---
name: session-work-log
description: Produces a structured session-end artifact capturing what was attempted, what changed, what blocked progress, and what the next agent or session needs to know. Machine-readable by design -- survives model swaps and cross-agent handoffs. Trigger phrases: "write a work log", "session work log", "log this session", "create a handoff artifact", "what did we do this session", "session end log".
---

# Session Work Log

A session ends. The work continues -- but context evaporates. A human note ("picked up from last time, refactored auth") is not enough for an agent that will resume the task cold. This skill produces a structured artifact the next session can read programmatically: what changed, what was blocked, what state the system is in, what comes next.

This is distinct from a delegation brief (which is forward-looking, written before handing off work). The work log is backward-looking, written after work concludes.

## When to trigger

- User says "write a work log", "log this session", "session end", "create a handoff artifact"
- User is wrapping up a session and wants context preserved for the next agent or session
- User explicitly says "the next agent should know X"
- Any session where meaningful state changes occurred (files written, tests run, bugs found, decisions made)

## Phases

### Phase 1 -- Gather Session State

Collect the following from the current session context:

1. **What was attempted**: the original goal or task as stated
2. **What changed**: files created or modified, commands run, migrations applied, configs updated
3. **What was verified**: tests run and their results, manual checks performed
4. **What blocked**: errors hit, decisions deferred, external dependencies unresolved
5. **Current system state**: what is running, what is stopped, what is in an intermediate state
6. **What comes next**: the next concrete action for whoever picks this up

If any field is unclear, ask one short question before writing. Don't leave fields empty -- write "none" or "not determined" explicitly.

### Phase 2 -- Write the Artifact

Write the work log to `SESSION_WORK_LOG.md` at the project root (or `$SESSION_LOG_PATH` if set).

Format:

```markdown
# Session Work Log

**Date**: YYYY-MM-DD
**Session goal**: [original task in one sentence]

## Attempted

- [Action 1]
- [Action 2]

## Changed

| File / Resource | Change |
|-----------------|--------|
| path/to/file.ts | Added X, removed Y |
| db/schema.sql   | Added column Z to table T |

## Verified

- [Test suite / check] -- [result: passed / failed / skipped]
- [Manual check] -- [result]

## Blocked

- [Blocker 1]: [brief description of what is stuck and why]
- [Blocker 2]: [what would unblock it]

## System state

- [Service / process]: [running / stopped / in progress]
- [Migration state]: [applied through migration N]

## Next action

[One concrete next step. If multiple paths exist, name the recommended one and why.]

## Context for next session

[Any non-obvious context: env var that must be set, workaround in place, external system in a particular state, decision that was made but not committed.]
```

### Phase 3 -- Confirm and Save

Show the draft to the user. Accept corrections. Write the final version.

State where the file was written.

## Storage

Default: `SESSION_WORK_LOG.md` at project root. Each run appends a new dated section rather than overwriting -- the file accumulates session history.

Override: `$SESSION_LOG_PATH` environment variable.

## Verification

- [ ] All 7 sections present (attempted, changed, verified, blocked, system state, next action, context)
- [ ] "Changed" table lists specific files or resources, not vague summaries
- [ ] "Blocked" section is present -- "none" is a valid value, not a missing section
- [ ] "Next action" is one concrete step, not a wish list
- [ ] No hardcoded absolute paths in the artifact
- [ ] File written and path confirmed to user

## Rules

- The artifact is machine-readable first. Prose is for the "context for next session" section only.
- Append, never overwrite. Session history is valuable.
- If the session was trivial (nothing changed, nothing blocked), still write the log -- "no changes" is useful signal.
- Credentials and secrets must never appear in the log. Reference env var names only.

## Source

Nate's Newsletter, 2026-05-07
https://natesnewsletter.substack.com/p/openclaw-agent-runtime-model-swapping
Pattern: TaskFlow Work Log -- structured session-end artifact that survives model swaps and cross-agent handoffs. The missing machine-readable complement to human-facing handoff notes.
