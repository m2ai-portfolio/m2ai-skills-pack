---
name: plan-stop-hook
description: Installs a "bouncer" hook in Claude Code that blocks all file edits until an explicit planning gate is passed. Prevents the common failure of jumping from idea to implementation before the plan has survived adversarial challenge. Use when a task is non-trivial, prior attempts drifted, or the cost of a wrong plan is high. Trigger phrases: "stop me from coding too soon", "add a planning gate", "plan stop hook", "bouncer before I code", "don't let me implement until the plan holds".
---

# Plan Stop Hook

The most common AI coding failure is skipping from "I have an idea" to "I'm editing files" without the plan surviving any pressure. A stop hook is a literal bouncer: it blocks `Edit`, `Write`, and shell mutations until you explicitly pass a planning gate.

## When to Invoke

- User says "stop me from coding before the plan is ready", "planning gate", "plan stop hook", "bouncer"
- Task is non-trivial and prior implementation attempts drifted or failed
- Cost of a wrong plan is high (migrations, auth, API contracts, multi-service changes)
- User has a habit of starting to code before scoping is done

## Phase 1: Gate Configuration

Ask the user:

1. **How many adversarial challenge rounds before the gate opens?** (default: 2 — one to find blockers, one to confirm fixes)
2. **Which tools should the gate block?** (default: `Edit`, `Write`, `Bash` with mutation patterns)
3. **What does "gate passed" look like?** (default: user types an explicit confirmation phrase — e.g., `PLAN APPROVED`)
4. **Should the gate log why it blocked?** (yes/no — useful for retrospectives)

## Phase 2: Install the Stop Hook

Write a `PreToolUse` hook that intercepts the blocked tools and checks gate state.

### Hook Logic (pseudocode)

```python
GATE_FILE = ".claude/plan-gate.txt"  # relative to project root

def pre_tool_use(tool_name, tool_input):
    if tool_name not in BLOCKED_TOOLS:
        return  # allow

    if not os.path.exists(GATE_FILE):
        block("Plan gate is closed. Complete the planning loop first.")

    with open(GATE_FILE) as f:
        status = f.read().strip()

    if status != "APPROVED":
        block(f"Plan gate status: {status}. Gate must be APPROVED before editing files.")
```

### Gate State File

The gate state lives in `.claude/plan-gate.txt`. States:

| State | Meaning |
|-------|---------|
| `OPEN` (file absent) | Gate is locked — no edits allowed |
| `IN_REVIEW` | Planning loop is running |
| `APPROVED` | Gate is open — edits allowed |
| `ROLLED_BACK` | Gate reset after a failed implementation |

The user (or a planning command) writes to this file to advance the state.

### Hook Registration

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 .claude/hooks/plan-stop-hook.py"
          }
        ]
      }
    ]
  }
}
```

## Phase 3: Run the Planning Loop

With the gate installed, run the planning loop:

1. Draft the plan (feature, scope, approach, assumptions, out-of-scope)
2. Run at least `N` adversarial challenge rounds — each round attacks the plan for BLOCKERs
3. Revise the plan after each round until the adversary has no remaining BLOCKERs
4. Produce a final plan summary with resolved blockers and residual risks

This can be done in the same session or with a second model as the adversary (the `adversarial-planning-loop` skill covers the loop mechanics in full).

## Phase 4: Approve the Gate

When the plan survives adversarial review:

1. User (or automation) writes `APPROVED` to `.claude/plan-gate.txt`
2. The hook stops blocking
3. Edits may now proceed

```bash
echo "APPROVED" > .claude/plan-gate.txt
```

Log the approval with a timestamp and plan summary hash for retrospective traceability.

## Phase 5: Rollback Option

If implementation reveals the plan was still wrong:

1. Revert to the pre-implementation git state
2. Write `ROLLED_BACK` to the gate file
3. Return to Phase 3 with lessons learned

```bash
git stash  # or git reset --hard <pre-impl-hash>
echo "ROLLED_BACK" > .claude/plan-gate.txt
```

## Verification

- [ ] Hook file exists at `.claude/hooks/plan-stop-hook.py`
- [ ] Hook is registered in `.claude/settings.json` under `PreToolUse`
- [ ] A test Edit call is blocked when gate is absent or `IN_REVIEW`
- [ ] A test Edit call succeeds when gate is `APPROVED`
- [ ] Gate file is in `.gitignore` (it's ephemeral per-session state, not project config)

## Notes

The gate file is intentionally ephemeral — it starts absent (locked) on every fresh clone. The hook should handle a missing file as "locked" so new contributors can't accidentally bypass the gate.

The hook is non-blocking to the user in the sense that it explains the gate state clearly. It is blocking to the tool: the edit does not execute.

## Source

Mark Kashef — "You Can Make Claude + Codex Plan Together. Here's How." (2026-04-28)
https://www.youtube.com/watch?v=RChO5deJ_fE

Core technique: the "stop hook" pattern (Kashef's "bouncer metaphor") — a hook that physically prevents the coding session from advancing to file edits until the planning loop has completed. Originally implemented as part of the `claudex:plan` command in the claudex repo. The gate state machine and rollback path are extracted here as a standalone, model-agnostic pattern.
