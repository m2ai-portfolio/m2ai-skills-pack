---
name: make-anticipatory
description: Refactor any reactive slash-command skill or repeating manual workflow into an anticipatory one that fires automatically when the right condition is met. Produces a settings.json hook (PreToolUse, PostToolUse, Stop, or SessionStart) or cron trigger alongside any changes to the skill itself. Use when saying "make this anticipatory", "convert this to a hook", "make it fire automatically", "this skill never fires because I forget it", "add a trigger to this skill", or wanting to turn a reactive tool into a proactive one.
---

# Make Anticipatory — Reactive-to-Anticipatory Skill Refactor

Convert a skill, workflow, or command that requires manual invocation into one that fires automatically when the right condition is met. The reactive form exists. This skill wires the trigger.

## The Problem This Solves

Most skills are reactive: useful when remembered, forgotten when busy. An anticipatory variant fires itself on a session event, a tool call pattern, a schedule, or a stop signal. The skill content doesn't change; the trigger does. This pattern converts "I forgot to run X" into "X already ran."

## When to Use

- A skill produces great output but you rarely remember to invoke it
- A manual workflow is always triggered by the same upstream event (after a code change, after a session ends, before a PR)
- A recurring task runs on a fixed interval
- You want a skill to run at Claude Code start/stop without manual invocation

## Inputs

- Skill name or slash command to make anticipatory (or a free-text description of the workflow)
- Optionally: the upstream event or condition that should trigger it

## Phase 1: Classify the Reactive Skill

Determine the skill's current invocation model:

1. **User-invoked slash command** — the user types `/skill-name` to trigger it
2. **User-invoked workflow** — a multi-step process the user runs manually
3. **Already triggered but inconsistently** — has a hook but fires under wrong conditions

For user-invoked skills, read the SKILL.md from the user-specified path or ask the user to describe what the skill does and when it should fire.

## Phase 2: Identify the Right Trigger Mechanism

Map the desired trigger to the correct Claude Code mechanism:

| If it should fire... | Use this mechanism |
|----------------------|-------------------|
| When a specific tool is about to run (e.g., before any Edit) | `PreToolUse` hook in `settings.json` |
| After a specific tool completes | `PostToolUse` hook in `settings.json` |
| When a Claude Code session ends | `Stop` hook in `settings.json` |
| When a Claude Code session starts | `SessionStart` hook in `settings.json` |
| When the user submits a message matching a pattern | `UserPromptSubmit` hook in `settings.json` |
| On a fixed time schedule | Cron trigger (system cron or a scheduling skill) |
| When an external event fires | Webhook + cron (out of scope; flag to user) |

Ask the user to confirm the trigger type if it isn't clear from context.

## Phase 3: Write the Hook or Cron Definition

### For hooks (settings.json):

Generate the hook configuration in the correct Claude Code format:

```json
{
  "hooks": {
    "<HookType>": [
      {
        "matcher": "<tool-name or pattern, if applicable>",
        "hooks": [
          {
            "type": "command",
            "command": "claude -p '<skill description or trigger prompt>' --allowedTools '<required tools>'"
          }
        ]
      }
    ]
  }
}
```

For `Stop` or `SessionStart` hooks (no matcher needed):

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "claude -p '<skill trigger prompt>'"
          }
        ]
      }
    ]
  }
}
```

Write the minimum trigger prompt needed. The hook fires a headless Claude invocation; the prompt must be self-contained and not require interactive clarification.

### For cron:

Generate a cron entry:

```
# <skill-name> — anticipatory trigger
# Fires: <human-readable schedule>
<cron-expression>  claude -p '<trigger prompt>' >> ./logs/<skill-name>.log 2>&1
```

Example:
```
# daily-review — anticipatory trigger
# Fires: every day at 6:00 AM
0 6 * * *  claude -p 'Run the daily review skill: summarize yesterday, surface open tasks, flag overdue items' >> ./logs/daily-review.log 2>&1
```

## Phase 4: Update the Skill (if needed)

Some skills need a small wrapper for headless operation:

- If the skill requires user interaction (asks clarifying questions), flag this: fully anticipatory operation requires the skill to run with sensible defaults when no user input is available.
- If the skill writes to a user-specified path, set a default output path (`./<skill-name>.md` or a configurable env var).
- If the skill's trigger prompt differs from its manual invocation pattern, add an `## Anticipatory Invocation` section to the SKILL.md.

Only modify the SKILL.md if a behavioral change is actually needed. Configuration changes go in `settings.json`, not the skill.

## Phase 5: Produce the Deliverable

Output a diff-style summary:

```
MAKE-ANTICIPATORY RESULT
========================
Skill: {skill-name}
Trigger mechanism: {PreToolUse | PostToolUse | Stop | SessionStart | Cron}
Fires when: {human-readable description}

settings.json addition:
{the hook block to add}

SKILL.md changes (if any):
{summary of any changes, or "None — skill runs headlessly without modification"}

To activate:
1. Add the hook block to .claude/settings.json (project) or ~/.claude/settings.json (global)
2. Confirm the trigger fires by {verification step}
3. Monitor logs at {log location or "stdout on next Claude session"}
```

## Phase 6: Verification Gate

Present the deliverable and stop. Do not automatically write to `settings.json` or modify the skill without user confirmation.

The user confirms:
- **Apply to project settings** — add hook to `.claude/settings.json`
- **Apply to global settings** — add hook to `~/.claude/settings.json`
- **Apply cron** — add to crontab or scheduling system
- **Revise** — adjust trigger condition before applying

## Verification Checklist

- [ ] Trigger mechanism matches the desired firing condition
- [ ] Hook or cron definition is syntactically valid
- [ ] Trigger prompt is self-contained (works headlessly, requires no interactive input)
- [ ] If SKILL.md was modified, the change is limited to anticipatory-specific behavior
- [ ] User confirmed before writing to settings.json or crontab

## Source Attribution

Framework extracted from Nate's Newsletter (natesnewsletter@substack.com), 2026-05-05:
*"The Anticipation Gap: Why 4 Problems Have to Be Solved Together for Consumer AI to Work"*
https://natesnewsletter.substack.com/p/consumer-ai-anticipation-gap

Core insight: the gap between reactive and anticipatory AI is often just a missing trigger. Skills that exist but never fire because users forget to invoke them are candidates for anticipatory refactoring via hooks and cron, not a rewrite.
