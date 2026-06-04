---
name: judgment-layer
description: Add a judgment classifier to any agent or Claude Code skill to decide when to act autonomously vs. ask for confirmation. Evaluates each candidate action against three axes -- reversibility, bounded cost, and user observability -- and routes to act-now, ask-first, or queue-for-review. Outputs a PreToolUse hook configuration and a policy file. Use when asking "when should my agent ask?", "judgment layer", "add a confirmation gate", "my agent acts when it shouldn't", "reversibility check", or designing authority boundaries for an agent.
---

# Judgment Layer — Autonomous vs. Confirmation Routing

Define precisely when an agent should act on its own and when it should surface for human review. Most agents have no explicit judgment layer: they either act on everything or ask about everything. This skill creates a tiered policy that routes each action through the right gate: **act-now**, **ask-first**, or **queue-for-review**.

## When to Use

- An agent is acting when it shouldn't (high-stakes actions taken silently)
- An agent is asking too often (low-stakes operations that break flow)
- Deploying a new agent and specifying its authority before it starts acting
- Building a reusable judgment hook that multiple skills can share

## Inputs

- Agent or skill name (or a free-text description of what it does)
- List of actions the agent takes (tool calls, API calls, file writes, messages sent)
- Optional: existing `settings.json` hook configuration to extend

## Phase 1: Action Inventory

List every action the agent takes. For each action, capture:

- **Action name**: the tool call or operation (e.g., `Edit`, `Bash(git push)`, `send_email`, `book_reservation`)
- **Trigger**: what causes this action to run
- **Target**: what system or resource is affected

If a full inventory isn't available, ask the user to list the top 5-10 most consequential actions.

## Phase 2: Classify Each Action

Score each action on three axes (1 = low concern, 3 = high concern):

### Axis 1: Reversibility

| Score | Criteria |
|-------|----------|
| 1 | Fully reversible: can be undone with a single step (delete a draft, undo a file edit) |
| 2 | Partially reversible: possible to undo but requires effort (revert a commit, restore a backup) |
| 3 | Irreversible or hard to reverse: cannot be undone without significant cost (send an email, delete a record, charge a card) |

### Axis 2: Bounded Cost

| Score | Criteria |
|-------|----------|
| 1 | Cost is zero or negligible (compute only, no financial or reputational consequence) |
| 2 | Cost is bounded but non-trivial (API call that costs money, a notification to another person) |
| 3 | Cost is unbounded or unknown (cascading DB write, public post, financial transaction) |

### Axis 3: User Observability

| Score | Criteria |
|-------|----------|
| 1 | User can see the action happening or its result in real time |
| 2 | User can review the action after the fact with low effort |
| 3 | Action is invisible to the user unless they specifically look for it |

## Phase 3: Assign Each Action a Routing Gate

Sum the three axis scores (min 3, max 9) and map to a gate:

| Sum | Gate | Behavior |
|-----|------|----------|
| 3-4 | ACT-NOW | Proceed without confirmation |
| 5-6 | ASK-FIRST | Surface a one-line summary and ask "proceed?" before acting |
| 7-9 | QUEUE-FOR-REVIEW | Do not act; add to a review queue and notify the user |

## Phase 4: Produce the Policy File

Write a judgment policy as a YAML file (`judgment-policy.yaml`):

```yaml
# judgment-policy.yaml
# Judgment layer configuration for: {agent-name}
# Generated: {date}

version: "1.0"
agent: "{agent-name}"
default_gate: ask-first  # gate for any action not explicitly listed

actions:
  - name: "{action-name}"
    reversibility: {1|2|3}
    bounded_cost: {1|2|3}
    user_observability: {1|2|3}
    score: {sum}
    gate: {act-now|ask-first|queue-for-review}
    rationale: "{one-line explanation}"
```

## Phase 5: Generate the PreToolUse Hook

Produce a `PreToolUse` hook that enforces the policy at runtime in Claude Code:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|Bash|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ./judgment-gate.py --tool '{{tool_name}}' --input '{{tool_input}}' --policy ./judgment-policy.yaml"
          }
        ]
      }
    ]
  }
}
```

Also produce the companion `judgment-gate.py` enforcement script:

```python
#!/usr/bin/env python3
"""
judgment-gate.py -- enforces judgment-policy.yaml at PreToolUse time.

Exit codes:
  0 -- act-now gate, or action not listed (falls through to default_gate)
  2 -- ask-first or queue-for-review gate (Claude Code surfaces the block message)
"""
import sys
import json
import argparse

def load_policy(path):
    try:
        import yaml
        with open(path) as f:
            return yaml.safe_load(f)
    except ImportError:
        import json as j
        with open(path.replace(".yaml", ".json")) as f:
            return j.load(f)
    except FileNotFoundError:
        return {"default_gate": "ask-first", "actions": []}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tool", required=True)
    parser.add_argument("--input", default="")
    parser.add_argument("--policy", required=True)
    args = parser.parse_args()

    policy = load_policy(args.policy)
    gate = policy.get("default_gate", "ask-first")
    rationale = ""

    for action in policy.get("actions", []):
        if action["name"].lower() in args.tool.lower():
            gate = action["gate"]
            rationale = action.get("rationale", "")
            break

    if gate == "act-now":
        sys.exit(0)
    elif gate == "ask-first":
        print(f"JUDGMENT GATE: {args.tool} requires confirmation.")
        if rationale:
            print(f"Reason: {rationale}")
        print("Reply 'yes' or 'proceed' to allow this action.")
        sys.exit(2)
    else:  # queue-for-review
        print(f"JUDGMENT GATE: {args.tool} is queued for review -- action blocked.")
        if rationale:
            print(f"Reason: {rationale}")
        sys.exit(2)

if __name__ == "__main__":
    main()
```

## Phase 6: Deliver and Gate

Present all three artifacts (judgment-policy.yaml, judgment-gate.py, the hook config diff) and stop. Do not write files or modify settings.json without user confirmation.

The user confirms:
- **Apply** — write judgment-policy.yaml and judgment-gate.py to the project root; add the hook to settings.json
- **Adjust** — revise gate assignments before applying
- **Preview only** — document the policy without wiring the hook

## Verification Checklist

- [ ] Every consequential action has an explicit entry in the policy
- [ ] No action scored 7-9 is assigned ACT-NOW without explicit user override
- [ ] Default gate is `ask-first`, not `act-now`
- [ ] Hook matcher covers all tool types the agent uses
- [ ] judgment-gate.py handles a missing policy file gracefully (defaults to ask-first, not act-now)
- [ ] User confirmed before writing any file

## Source Attribution

Framework extracted from Nate's Newsletter (natesnewsletter@substack.com), 2026-05-05:
*"The Anticipation Gap: Why 4 Problems Have to Be Solved Together for Consumer AI to Work"*
https://natesnewsletter.substack.com/p/consumer-ai-anticipation-gap

Core idea: "judgment" is the fourth prerequisite for anticipatory AI. Agents need to know when to act vs. ask. The three-axis scoring (reversibility, bounded cost, user observability) operationalizes the judgment problem into a concrete policy that can be enforced at the tool-call level via a PreToolUse hook.
