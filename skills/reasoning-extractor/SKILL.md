---
name: reasoning-extractor
description: Apply a four-question reasoning framework (situation → decision → risk → change) to any piece of work — from an individual task to a strategic bet — turning silent judgment into a documented reasoning trail. Use when the user says "extract my reasoning", "reasoning trail", "document my thinking", "why I made this call", "annotate this decision", "add context to this artifact", or wants to make implicit judgment explicit for a record, review, handoff, or promotion packet.
---

# Reasoning Extractor

A composable primitive for surfacing the thinking layer underneath any artifact, task, or call. When AI can produce the artifact, the artifact alone proves nothing. This skill attaches the four questions that prove the human understood the work.

## Trigger

Use when the user says "extract reasoning", "reasoning trail", "why I made this call", "document my thinking", "annotation", "add judgment context", "prove I understood this", or wants to attach a reasoning record to any piece of work before sharing.

Also use as a building block when another skill or workflow needs to generate a reasoning record as a side-output (e.g., after a code review decision, an architectural choice, or a content strategy pivot).

## Input

Accept any of:

- A description of a task the user completed
- A document, spec, or code change the user authored
- A decision the user made (less structured than a full interview — use this skill for quick extractions; use `decision-interview-builder` for a full multi-turn interview)
- A free-form "here's what I did and why" paragraph

If the input is under ~50 words, ask one clarifying question before running the framework: "What were the real options — what did you *not* do here, and why?"

## The Four Questions

Apply in sequence. For each question, produce a 1–3 sentence answer synthesized from what the user provided. If the user's input doesn't supply enough material to answer a question, output `[Insufficient information — user should fill in]` rather than inventing content.

### 1. Situation
What was the context? What was at stake? Who or what was affected by the outcome?

### 2. Decision
What was chosen, and from what alternatives? What was the tipping factor?

### 3. Risk
What known downside was accepted? What could have gone wrong?

### 4. Change
What did the outcome or this call change — in the work, the system, or the decision-maker's model?

## Output Format

```
## Reasoning Record — [brief title from input]

**Situation:** [1–3 sentences]

**Decision:** [1–3 sentences — names the chosen path and the real alternatives]

**Risk accepted:** [1–3 sentences — the known downside that was taken on]

**What changed:** [1–3 sentences — outcome, lesson, or updated model]

---
*Extracted by reasoning-extractor from: [brief source description, e.g., "user's description of auth architecture call, 2026-06-01"]*
```

## Batch Mode

If the user provides multiple decisions or work items at once, run the four questions over each one and produce a numbered list of Reasoning Records. Batch limit: 5 items per invocation. Above 5, ask the user to prioritize.

## Verification

- [ ] Every field is filled — no field is silently left blank; gaps are marked `[Insufficient information]`
- [ ] The Decision section names at least one alternative that was NOT chosen
- [ ] The Risk section names a specific downside, not a generic "it might not work"
- [ ] No content is invented — only synthesized from what the user provided
- [ ] The source line accurately describes where the input came from

## Relationship to Other Skills

This is the atomic primitive. Skills that build on it:

- A decision interviewer uses this framework as its extraction backbone
- A promotion packet auditor scores records produced by this framework against signal quality

## Source

Derived from Nate's Newsletter 2026-05-31, "Executive Briefing: Your career evidence is thinner than you think + 3 prompts that rebuild it." The four-question framework (situation → decision → risk → change) is described as the reusable primitive underneath Nate's full interview-and-artifact system.
