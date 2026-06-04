---
name: judgment-gate
description: A judgment classifier for planned tool calls or agent actions. Scores reversibility, cost boundary, blast radius, and user observability, then routes to ACT / ASK / QUEUE / ABORT with reasoning.
---

# Judgment Gate

A reusable judgment classifier that sits between an agent and its planned action. Given a description of what the agent is about to do, applies a four-question rubric and routes the action to the correct approval path. Generalizes the ad-hoc judgment patterns found in individual hooks and CLAUDE.md rules into a single callable skill.

## Trigger

Use when the user says "judgment gate", "should I act or ask?", "is this safe to auto-run?", "classify this action", "reversibility check", or when an agent needs to decide whether to proceed autonomously before executing a consequential tool call.

Can also be wired as a PreToolUse hook: "before any Edit, Write, or POST call, run judgment-gate on the planned action."

## Phase 1: Intake

Accept the planned action. This can be:
- A natural-language description ("I'm about to delete the staging database")
- A tool call signature ("Edit /etc/nginx/nginx.conf lines 40-55")
- An API call ("POST /api/payments with amount=5000")
- A shell command ("git push --force origin main")

If no planned action is provided, ask for one sentence describing what the agent is about to do and why.

## Phase 2: Four-Question Rubric

Evaluate the action against all four questions. For each, assign PASS or FAIL with a one-line reason.

### Q1: Reversibility

**Can this action be fully undone in under 5 minutes by the user, without data loss or external side effects?**

PASS examples: editing a local file (git can revert), creating a draft (not sent), running a read-only query.
FAIL examples: sending an email, deleting a production record without backup, pushing to a shared branch, charging a payment card.

### Q2: Cost Boundary

**Is the cost of this action bounded and within a pre-authorized limit?**

Cost includes: money, API tokens, compute time, rate-limit consumption, third-party service charges.
PASS: action costs nothing or is under a clearly pre-authorized threshold.
FAIL: cost is unbounded, unknown, or exceeds the threshold. If no threshold exists, treat as FAIL.

### Q3: Blast Radius

**Does this action affect only the current user's local state, or does it touch shared systems, other users, or external services?**

PASS: affects only local files, local database, or the current user's private data.
FAIL: touches a shared database, sends a network request with side effects, modifies infrastructure visible to others, or affects any other user.

### Q4: Observability

**Is the user currently positioned to notice this action and correct it within 60 seconds if it goes wrong?**

PASS: user is in an active interactive session and can see what the agent is doing.
FAIL: agent is running autonomously (scheduled, background, unattended), or the user is on a different device and not watching.

## Phase 3: Route the Action

Apply routing logic based on PASS/FAIL counts:

| Q1 | Q2 | Q3 | Q4 | Route |
|----|----|----|----|----|
| PASS | PASS | PASS | PASS | **ACT** — proceed autonomously |
| PASS | PASS | PASS | FAIL | **ACT** with audit log — proceed, but log the action for post-hoc review |
| PASS | PASS | FAIL | any | **ASK** — get explicit approval before proceeding |
| PASS | FAIL | any | any | **ASK** — cost unclear or exceeds threshold |
| FAIL | any | any | any | **QUEUE** — stage the action for synchronous human review; do not execute |
| FAIL | FAIL | FAIL | any | **ABORT** — action is irreversible, unbounded cost, and affects shared state; refuse |

Override: if any question is FAIL AND the user is not currently observing (Q4 FAIL), escalate one level (ACT → ASK, ASK → QUEUE, QUEUE → ABORT).

## Phase 4: Output

```
## Judgment Gate — [Action Summary]

| Question       | Result | Reason                                           |
|----------------|--------|--------------------------------------------------|
| Reversibility  | PASS/FAIL | [one line]                                    |
| Cost Boundary  | PASS/FAIL | [one line]                                    |
| Blast Radius   | PASS/FAIL | [one line]                                    |
| Observability  | PASS/FAIL | [one line]                                    |

**Route: ACT / ASK / QUEUE / ABORT**

[One-sentence rationale for the route]

[If ASK or QUEUE: exact question or approval request to surface to the user]
[If ABORT: what would need to change for this action to be routable as ACT or ASK]
```

## Phase 5: Hook Pattern

To wire judgment-gate as a PreToolUse hook, add to settings.json:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Edit|Write|Bash",
      "hooks": [{
        "type": "command",
        "command": "echo '[judgment-gate] Run /judgment-gate on this planned action before proceeding'"
      }]
    }]
  }
}
```

The hook is advisory-only — the user decides whether to block or allow after seeing the gate output.

## Verification

A good gate output:
- Does not default to ABORT on every action (that defeats the purpose — ACT should be the common path for safe, local, reversible work)
- Makes Blast Radius and Reversibility primary discriminators (these are the highest-signal questions)
- Produces an ASK or QUEUE when Q1 (Reversibility) is FAIL — never ACTs on irreversible actions without explicit approval
- The rationale sentence names the specific FAIL question(s), not generic uncertainty

## Source

Extracted from Nate Kadlac newsletter (2026-05-05) — "The Anticipation Gap: Why 4 Problems Have to Be Solved Together for Consumer AI to Work" — judgment problem (when should an agent act vs ask?) generalized into a standalone classifier skill.
