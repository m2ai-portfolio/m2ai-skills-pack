---
name: workflow-fit-scorer
description: Score a candidate workflow against 5 automation-fit properties and return a build / switch-tools / resolve-ambiguity verdict. Front-door diagnostic for any M2AI automation advisory engagement.
---

# Workflow Fit Scorer

Takes a workflow description and scores it against the 5 automation-fit properties that determine whether building an agent is the right move. Returns a structured verdict with a property-by-property rationale and a recommended next step.

## Trigger

Use when the user says "/workflow-fit-scorer", "should I automate this", "is this worth building an agent for", "can I automate this workflow", or when evaluating whether a repetitive task is a good automation candidate.

## Phase 1: Intake

Ask the user to describe the workflow in their own words. If the description is under 2 sentences, prompt:

> "Walk me through one real instance of this workflow from start to finish — what triggers it, what you touch along the way, and what done looks like."

Collect:
1. **Workflow description** — what happens, start to finish
2. **Current frequency** — how often does this run?
3. **Current time cost** — roughly how long does it take per run?
4. **Who does it** — one person, multiple people, or does it vary?

## Phase 2: Score Against 5 Properties

Evaluate the workflow against each property. Score each: **YES / PARTIAL / NO**.

### Property 1 — Repeats on a Schedule or Known Trigger

The workflow runs predictably: daily, weekly, on a calendar event, on an inbound message, etc. Ad-hoc workflows initiated by novel judgment calls score NO.

### Property 2 — Recognizable Good vs Bad Output

You (or a team member) have done this by hand often enough that you can quickly tell a good output from a bad one. If output quality is entirely subjective or depends on factors that change every time, score NO.

### Property 3 — Fits in a Single Paragraph

A clear person could describe the workflow completely in one paragraph without losing important detail. If it takes a page to specify, the workflow is too ambiguous for automation now.

### Property 4 — Crosses 2 or More Tools

The workflow requires moving data or actions between at least 2 systems (email + CRM, calendar + Slack, spreadsheet + reporting tool, etc.). Single-tool tasks usually have native automation and don't need a custom agent.

### Property 5 — Follows a Known Path

The steps are the same (or have predictable branches) every time. If the workflow requires judgment calls that differ substantially run to run, score NO.

## Phase 3: Verdict

### Scoring Logic

| YES count | Verdict |
|-----------|---------|
| 4–5 | **BUILD** — strong candidate for agent automation |
| 3 | **RESOLVE AMBIGUITY** — identify which properties scored PARTIAL or NO and fix them first |
| 0–2 | **SWITCH TOOLS** — this workflow is better served by a different approach (see below) |

### Switch-Tools Routing (when verdict is SWITCH TOOLS)

| Failure pattern | Right tool |
|-----------------|-----------|
| Novel research every run | Search-augmented LLM (Perplexity, AutoResearch) |
| Long-horizon autonomous work | Claude Cowork or supervised agentic IDE session |
| Single polished one-time artifact | Interactive chat LLM with large context |
| Well-defined single-tool task | Native automation within the tool (Zapier trigger, built-in recurring feature) |

## Phase 4: Output

```
WORKFLOW FIT SCORE
==================
Workflow: {one-line summary}

Property scores:
  1. Repeats on schedule/trigger:     {YES|PARTIAL|NO}
  2. Recognizable good vs bad output: {YES|PARTIAL|NO}
  3. Fits in a paragraph:             {YES|PARTIAL|NO}
  4. Crosses 2+ tools:                {YES|PARTIAL|NO}
  5. Follows a known path:            {YES|PARTIAL|NO}

Verdict: {BUILD | RESOLVE AMBIGUITY | SWITCH TOOLS}

Rationale: {2–3 sentences on the key properties that drove the verdict}

Next step:
  BUILD            → Run /build-spec-generator to produce a deployment-ready spec.
  RESOLVE AMBIGUITY → {name the specific property to fix and how}
  SWITCH TOOLS     → {name the right tool and why}

Time/effort estimate (if BUILD): {rough weekly hours saved × team size}
```

## What This Does NOT Do

- Does not generate the build spec. Use `/build-spec-generator` after a BUILD verdict.
- Does not route to a specific AI model or provider. Use `/failure-mode-tool-router` or `/model-router` for that.
- Does not evaluate cost or ROI in depth. Use `/agent-cost-model` for budget-constrained decisions.
- Does not validate that the workflow stays in scope. Use `/spec-gap-detector` after the spec is written.

## Source

Framework adapted from Nate Kadlac newsletter (2026-04-27): "Your team spends 5 hours a week on work a sales consultant automated in an afternoon." The 5 properties are Nate's framework; the scoring logic and switch-tools routing table are M2AI extensions.
