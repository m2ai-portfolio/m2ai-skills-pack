---
name: destructive-op-guard
description: Design or audit a PreToolUse hook that intercepts high-blast-radius shell operations (DROP TABLE, rm -rf, git push --force to main, kubectl delete, docker system prune, etc.) and requires explicit authorization before they execute. Use when adding a safety hook to a Claude Code project, reviewing an existing hook's coverage, or after an incident where an autonomous agent ran an irreversible operation unchecked.
---

# Destructive Op Guard

Autonomous agents can execute irreversible operations in seconds — faster than a human can intervene. A Cursor agent deleted a production database in nine seconds while every dashboard stayed green. The failure mode is not unusual; it is the default when no hook intercepts the operation.

This skill produces a Claude Code `PreToolUse` hook that blocks a configurable list of high-blast-radius patterns and requires an authorization token or explicit human confirmation before the operation runs.

## Trigger

Use when the user:
- Says "blast radius hook", "destructive op guard", "block rm -rf", "/destructive-op-guard"
- Is setting up a new Claude Code project with shell access and wants a safety net
- Is reviewing an existing hook's pattern coverage
- Has experienced an incident where an agent ran an irreversible command

## Phase 1: Scope the Guard

Ask (or determine from context):
- What shell tool names does the agent have access to? (`Bash`, `computer_use`, custom MCP tools)
- What is the authorization mechanism? Options:
  - **Environment variable token**: agent must pass `AUTH_TOKEN=<secret>` as a prefix in the command
  - **Confirmation phrase**: operator adds a specific string to the command (e.g. `# CONFIRMED`)
  - **Human-in-the-loop**: hook blocks the command and presents it to a human for approval
- Which patterns should always block, even with authorization? (Optional hard-block list)

## Phase 2: Pattern Inventory

Standard high-blast-radius patterns to intercept:

```
FILESYSTEM
  rm -rf /           rm -rf *           find . -delete
  shred               truncate -s 0      dd if=/dev/zero of=...
  mkfs                fdisk (write mode)

DATABASE
  DROP TABLE          DROP DATABASE       DROP SCHEMA
  TRUNCATE TABLE      DELETE FROM <table> (without WHERE)
  ALTER TABLE ... DROP COLUMN
  mongodrop           redis FLUSHDB / FLUSHALL

GIT
  git push --force (to main or master)
  git reset --hard
  git push origin :branch   (branch delete)
  git clean -fd

CONTAINER / INFRA
  docker system prune        docker volume prune
  kubectl delete namespace   kubectl delete deployment
  terraform destroy
  aws ec2 terminate-instances
  gcloud compute instances delete

PROCESS
  kill -9 1           pkill -9 -1         shutdown / reboot
```

Customize the list for the project's actual tool surface. Don't block operations the agent has no access to — unnecessary blocks cause friction without safety.

## Phase 3: Hook Implementation

Produce a `~/.claude/hooks/destructive-op-guard.py` (or project-local `.claude/hooks/`):

```python
#!/usr/bin/env python3
"""
PreToolUse hook: blocks high-blast-radius shell operations.

Place in ~/.claude/hooks/ or .claude/hooks/ and register in settings.json:
  "hooks": {
    "PreToolUse": [{"matcher": "Bash", "hooks": [{"type": "command", "command": "python3 .claude/hooks/destructive-op-guard.py"}]}]
  }

Exit 0  = allow the tool call to proceed.
Exit 2  = block the tool call (Claude Code shows the stderr message to the model).
"""
import json, os, re, sys

PATTERNS = [
    r"\brm\s+-[a-zA-Z]*r[a-zA-Z]*\s+[/~*]",  # rm -rf / or rm -r *
    r"\bdrop\s+(table|database|schema)\b",      # SQL DDL
    r"\btruncate\s+table\b",
    r"\bdelete\s+from\b(?!.*\bwhere\b)",        # DELETE without WHERE (simple heuristic)
    r"\bgit\s+push\b.*--force",
    r"\bgit\s+reset\s+--hard\b",
    r"\bgit\s+clean\s+-[a-zA-Z]*f",
    r"\bdocker\s+system\s+prune\b",
    r"\bdocker\s+volume\s+prune\b",
    r"\bkubectl\s+delete\s+namespace\b",
    r"\bterraform\s+destroy\b",
    r"\bflushdb\b|\bflushall\b",
    r"\bshutdown\b|\breboot\b",
]

AUTH_PHRASE = os.environ.get("DESTRUCTIVE_OP_AUTH", "# CONFIRMED-DESTRUCTIVE")

payload = json.load(sys.stdin)
tool_input = payload.get("tool_input", {})
command = tool_input.get("command", "") if isinstance(tool_input, dict) else ""

if AUTH_PHRASE in command:
    sys.exit(0)  # operator authorized this specific call

for pat in PATTERNS:
    if re.search(pat, command, re.IGNORECASE):
        msg = (
            f"BLOCKED by destructive-op-guard: pattern matched '{pat}'.\n"
            f"This operation is irreversible. To authorize: append '{AUTH_PHRASE}' "
            f"to the command and confirm you understand the blast radius."
        )
        print(msg, file=sys.stderr)
        sys.exit(2)

sys.exit(0)
```

Adjust `PATTERNS` for the project. The `AUTH_PHRASE` can be overridden via environment variable so the secret is not hardcoded.

## Phase 4: Registration

Add the hook to `.claude/settings.json` (project-local) or `~/.claude/settings.json` (global):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 .claude/hooks/destructive-op-guard.py"
          }
        ]
      }
    ]
  }
}
```

For multiple tool names (e.g. a custom `Shell` MCP tool), add a separate matcher entry per tool name.

## Phase 5: Coverage Audit

After installing, verify coverage by listing what the agent can actually do:

1. Read the agent's `--allowedTools` list or `agent.config.json`
2. For each tool, identify whether commands pass through `Bash` or a separate executor
3. Confirm the hook matcher covers all execution paths — a hook on `Bash` does not intercept an MCP `execute_command` tool

Document uncovered paths as explicit risk-accepted gaps.

## Verification

A good destructive-op-guard implementation:
- Intercepts at the `PreToolUse` event, not `PostToolUse` (post is too late)
- Uses `exit 2` to block (not `exit 1`) — exit 2 surfaces the stderr message to the model
- Does NOT silently swallow the operation — the model must see the block reason
- Covers all execution-path tool names, not just `Bash`
- Requires authorization on the specific invocation, not a global environment toggle

## Source

Extracted from Nate's Newsletter (natesnewsletter@substack.com), 2026-05-28.
Article: "Your agent dashboard is green. The run underneath it is where the work actually broke."
Technique: PreToolUse hook pattern for blocking irreversible high-blast-radius operations.
Incident context: Cursor agent deleted a production database in nine seconds without any hook interception.
