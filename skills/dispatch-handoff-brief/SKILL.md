---
name: dispatch-handoff-brief
description: Generate structured delegation briefs for Anthropic Dispatch or any autonomous agent handoff with objective, success criteria, tools needed, verification, and escalation conditions
---

# Dispatch Handoff Brief Generator

Generate a structured delegation brief for handing work off to an autonomous agent (Anthropic Dispatch, the agent platform mission tasks, or any agent that works independently).

## When to trigger

- User says "write a handoff brief", "delegate this to dispatch", "dispatch brief", "create a delegation brief"
- User is about to create a mission task or scheduled agent run and needs a well-structured prompt
- User says "hand this off" or "have [agent] handle this"

## Phases

### Phase 1 — Understand the Task

Ask (if not already clear):
1. What needs to get done? (the objective)
2. How will you know it worked? (success criteria)
3. What tools/apps/accounts does the agent need access to?
4. What should the agent do if something goes wrong?

Keep it to one short exchange. Don't over-interview.

### Phase 2 — Generate Brief

Produce a structured brief in this format:

```markdown
# Handoff Brief: [Task Name]

## Objective
[One sentence. What is the end state when this is done?]

## Success Criteria
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]
- [ ] [Measurable outcome 3]

## Context
[2-3 sentences of background the agent needs. What does it need to know that isn't obvious from the objective?]

## Tools & Access Required
- [Tool/app 1] — [what it's used for in this task]
- [Tool/app 2] — [what it's used for in this task]

## Steps (Suggested)
1. [Step 1]
2. [Step 2]
3. [Step 3]
(Agent may deviate if it finds a better path — these are guidelines, not a script.)

## Verification
How the agent should confirm the work is done:
- [Check 1]
- [Check 2]

## Escalation Conditions
Stop and notify the human if:
- [Condition 1 — e.g., "access denied to any required tool"]
- [Condition 2 — e.g., "task will take longer than 30 minutes"]
- [Condition 3 — e.g., "any destructive or irreversible action needed"]

## Constraints
- [Time limit, if any]
- [Budget/cost limit, if any]
- [Things the agent must NOT do]
```

### Phase 3 — Adapt to Target

If the user specifies a target agent:
- **Dispatch** — keep the brief as plain text, ready to paste into the Dispatch text interface
- **the agent platform mission task** — format as a single prompt string suitable for `the dispatch CLI.js create`
- **Scheduled task** — add cron timing and note any state that persists between runs
- **Generic** — use the full markdown format above

## Verification

- Brief has all 7 sections filled (Objective, Success Criteria, Context, Tools, Steps, Verification, Escalation)
- Success criteria are measurable, not vague ("email sent" not "email handled well")
- Escalation conditions include at least one safety boundary
- No section says "N/A" — if truly not applicable, remove the section

## Rules

- Briefs should be self-contained. The agent receiving this should need zero follow-up questions.
- Default to over-specifying escalation conditions. Autonomous agents should fail loudly, not silently.
- Never include credentials in the brief. Reference environment variables or tool names, not actual keys/passwords.
- Keep it under 500 words. If the brief is longer, the task probably needs decomposition.

## Source

Nate's Newsletter, 2026-03-28 — "The open loop audit prompt that separates real delegation from simulated work"
Pattern: Structured handoff briefs for real delegation to autonomous agents.
