---
name: build-spec-generator
description: Takes a workflow that scored BUILD from workflow-fit-scorer and emits a deployment-ready build spec — trigger, I/O contract, tool connectors, success criteria, escalation conditions, and quality-check rubric. Output is platform-agnostic with per-platform variant notes.
---

# Build Spec Generator

Converts a workflow description (ideally one that scored BUILD from `/workflow-fit-scorer`) into a structured build spec at the specificity level that Claude Code, n8n, Make, or Workspace Agents needs to scaffold something that actually runs — not a demo.

## Trigger

Use when the user says "/build-spec-generator", "generate a build spec for this workflow", "I need a spec I can hand to an agent builder", or after `/workflow-fit-scorer` returns a BUILD verdict.

## Phase 1: Intake

If the user arrives directly (not from workflow-fit-scorer), collect:
1. **Workflow description** — what it does, start to finish
2. **Trigger** — what starts a run? (schedule, inbound message, event, manual)
3. **Primary platform target** — Claude Code / n8n / Make / Workspace Agents / other

If the user arrives from workflow-fit-scorer with a BUILD verdict, these should already be known. Confirm with: "I'll generate the build spec based on what you've described. Anything to add before I start?"

## Phase 2: Spec Drafting

Generate each section of the spec in order. Do not skip sections or mark them "TBD" — if information is genuinely unknown, say so and ask before proceeding.

### Section 1 — Trigger & Schedule

Specify exactly what fires a run:
- Event-driven (inbound email matching pattern X, new row in sheet Y, webhook from Z)
- Scheduled (cron expression + timezone)
- Manual (slash command, button, API call)

Include: trigger source, filter criteria (if event-driven), and the expected frequency.

### Section 2 — Input Contract

For each input the workflow consumes:
- **Name** — what is it called?
- **Source** — where does it come from? (Gmail thread, Notion page, Slack message, form submission)
- **Format** — text, JSON, CSV, file attachment?
- **Required / optional** — what happens if it's missing?

### Section 3 — Output Contract

For each output the workflow produces:
- **Name** — what is it called?
- **Destination** — where does it go? (Slack channel, Notion DB, email reply, CRM field)
- **Format** — message, document, structured record, file?
- **Owner** — who reviews or acts on it?

### Section 4 — Tool Connectors

List every external tool the workflow touches. For each:
- Tool name
- Operation type (read, write, read+write)
- Auth requirement (OAuth, API key, service account)
- Available MCP or native connector?

### Section 5 — Step Sequence

Ordered list of steps. Each step:
- Input → transformation/action → output
- Decision points: what happens on each branch?
- Error cases: what breaks here, and what should happen when it does?

Keep it at the level of "fetch most recent Gong transcript → extract deal stage, next steps, blockers → post formatted summary to Slack #deals-{owner}". Not pseudocode, not prose.

### Section 6 — Success Criteria

The quality-check rubric an LLM judge (or human reviewer) will use to score each run's output. Must be specific enough to answer YES/NO per criterion:

- "Output contains all 3 required fields (summary, blockers, next step)"
- "No fabricated data — every claim traces to the source document"
- "Slack message is under 200 words"
- "Run completed within 90 seconds"

Minimum 3 criteria. Aim for 5.

### Section 7 — Escalation Conditions

When should the agent stop and wait for a human? Examples:
- Source data is missing or ambiguous
- Confidence below threshold
- Output would modify something irreversible (send email, update live record)
- Error rate exceeds N consecutive failures

For each escalation condition, specify the escalation target (Slack DM, email, log-only) and the default hold behavior (pause and wait, retry after delay, fail with alert).

### Section 8 — Platform Variants (optional but recommended)

If the target platform is still undecided, add a 2-line note per relevant platform:
- **Claude Code** — requires: MCP servers for X, Y; recommend scheduled-agent-harness
- **n8n** — native connectors available for X; custom HTTP node needed for Y
- **Workspace Agents** — fits ChatGPT Plus/Enterprise; limited to approved connector list
- **Make** — router modules handle the branching; webhook trigger available natively

## Phase 3: Output

Produce the full spec as a structured markdown document the user can copy into a task brief or hand to an agent builder. Use the section headers above verbatim.

End with:

```
READY TO BUILD CHECKLIST
========================
[ ] All inputs have confirmed sources
[ ] All tool connectors have auth paths identified
[ ] Success criteria are specific enough for a judge to score YES/NO
[ ] Escalation conditions cover the top 3 failure modes
[ ] Platform target is confirmed

Next step: Hand this spec to Claude Code (/l5-sprint or Agent Teams), n8n builder, or Workspace Agents scaffolding.
```

## What This Does NOT Do

- Does not score the workflow's automation fit — that is `/workflow-fit-scorer`.
- Does not select the model or AI provider — use `/model-router` or `/failure-mode-tool-router`.
- Does not implement the workflow — it produces the spec that an agent builder or human developer uses.
- Does not validate the spec against prior patterns or known failure modes — use `/spec-gap-detector` for that.

## Source

Artifact shape from Nate Kadlac newsletter (2026-04-27): the "Build Spec Generator" is Nate's Prompt 2 (paywalled) reconstructed from the teaser's stated outputs — trigger, I/O contract, tool connectors, success criteria, escalation conditions, quality-check rubric.
