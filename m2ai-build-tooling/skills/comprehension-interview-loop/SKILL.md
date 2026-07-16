---
name: comprehension-interview-loop
description: Conduct a Socratic pushback interview about something the user has built. Detects hand-waving, vague claims, and gaps in understanding, then assembles the result into a clean explanation artifact. Use when the user says "interview me", "comprehension interview", "Socratic review", "pushback interview", "do I actually understand this", "quiz me on my project", "challenge my understanding", or wants rigorous verification of their own comprehension before shipping or presenting work.
---

# Comprehension Interview Loop

An interactive Socratic interview that probes the user's understanding of something they built. Unlike explanation-artifact-generator (which walks through a fixed 4-question template), this skill adapts its questions based on the user's answers, detects hand-waving, and pushes harder where understanding is weakest.

The output is the same format (a structured explanation artifact), but the path to get there is adversarial-collaborative: the agent actively challenges vague or shallow answers until the user can articulate specific, concrete understanding.

## Prerequisites

- The user has built, modified, or is responsible for a project, feature, or system
- The user must be willing to have their understanding challenged (set this expectation upfront)
- This is NOT a code review. It reviews the human's mental model, not the code itself.

## Phase 1: Set the Stage

Tell the user:
> I'm going to interview you about [subject]. I'll ask questions and push back when your answers are vague. The goal isn't to catch you out -- it's to surface the gaps in your mental model so you can fill them before they matter. You can say "I don't know" -- that's the most useful answer you can give me.

Ask: "What are we reviewing? Give me the project/feature/system name and a one-sentence description."

## Phase 2: Opening Round (Breadth)

Ask 3-4 broad questions to map the territory:

1. "Walk me through what this does, start to finish, in under 60 seconds."
2. "Who uses this, and what's the most common thing they do with it?"
3. "What's the one thing about this system that would surprise someone reading the code for the first time?"
4. "If I deleted this tomorrow, what breaks first?"

Listen for:
- **Confident, specific answers**: Move on, these areas are understood
- **Hesitation or vagueness**: Mark for deeper probing in Phase 3
- **"It just works" / "The AI handled that" / "I haven't looked at that part"**: These are the gold -- flag and drill in Phase 3

## Phase 3: Drilling (Depth)

For each area flagged in Phase 2, conduct a focused drill:

### Pattern: Follow the Vague Claim

When the user says something vague like "it handles errors properly":
1. "What specific errors can this throw?"
2. "Pick the most common one. What happens to the user when it fires?"
3. "And if that error handler itself fails?"

Keep going until you get a concrete, specific answer or the user says "I don't know."

### Pattern: Challenge the Happy Path

When the user describes how things work normally:
1. "What's the most likely way this fails?"
2. "How would you know it failed? (Logs? Alerts? User complaint?)"
3. "How long between failure and detection?"

### Pattern: Probe the AI Layer

When the user mentions AI-generated code:
1. "Which parts did the AI write that you didn't review line by line?"
2. "If I asked you to rewrite [specific function] from scratch without AI, could you?"
3. "What assumptions is the AI-generated code making that you haven't validated?"

### Pattern: Test the Why

When the user describes an architectural choice:
1. "Why this and not [obvious alternative]?"
2. "What would have to change for you to switch to [alternative]?"
3. "Was this your decision or the AI's suggestion? If the AI's, did you evaluate it independently?"

## Phase 4: Synthesis

After 8-15 questions (adjust based on complexity and user engagement), stop drilling and synthesize:

### Comprehension Map

Rate each area on a 3-point scale:
- **SOLID**: User gave specific, concrete answers with evidence
- **SHAKY**: User gave partial answers, needed prompting, some vagueness remained
- **GAP**: User acknowledged not knowing, or couldn't get past vague answers after probing

```markdown
## Comprehension Map

| Area | Rating | Evidence |
|------|--------|----------|
| Core functionality | SOLID | Described exact flow with edge cases |
| Error handling | SHAKY | Knew happy path errors, unclear on cascading failures |
| Data model | SOLID | Named every table, knew constraints |
| Auth flow | GAP | "The AI wrote that part, I haven't traced it" |
| Deployment | SHAKY | Knows the command, unsure about rollback procedure |
```

### Explanation Artifact

Assemble a clean artifact from the interview:

```markdown
# Comprehension Interview: <subject>

**Interviewee**: <user>
**Date**: <today>
**Subject**: <path or description>

## What is this?
<synthesized from opening round>

## Key Understanding (SOLID areas)
<bullet points of what the user clearly understands>

## Gaps Identified
<bullet points of what the user couldn't explain>
<for each gap: what specific knowledge is missing and where to find it>

## Action Items
- [ ] <specific thing to investigate for each GAP>
- [ ] <specific thing to verify for each SHAKY>

## Comprehension Score
<X of Y areas rated SOLID> -- <percentage>% verified understanding
```

## Phase 5: Store and Follow Up

Store the artifact (same options as explanation-artifact-generator):
- Alongside code as `COMPREHENSION-INTERVIEW.md`
- In `docs/`
- In the Obsidian vault

Suggest: "Run this interview again after you've addressed the action items. Your score should improve."

## Verification

A good interview has:
- [ ] At least 8 questions asked (breadth + depth)
- [ ] At least 2 drills into vague or uncertain areas
- [ ] At least 1 "I don't know" surfaced (if zero, the interview wasn't probing hard enough)
- [ ] Action items are specific and actionable (not "learn more about X" but "trace the auth flow from login endpoint to token validation and document the steps")
- [ ] The tone was challenging but not hostile -- the user should feel clarified, not attacked

## Anti-Patterns

- **Don't answer your own questions.** If the user doesn't know, mark it as a gap. Don't explain how it works -- that defeats the purpose.
- **Don't accept "it works" as an answer.** Everything works until it doesn't. Push for specifics.
- **Don't quiz on trivia.** The goal is architectural and behavioral understanding, not "what's on line 47."
- **Don't run longer than 20 minutes.** Diminishing returns after that. Cut to synthesis.

## Source Attribution

Extracted from Nate Kadlac's newsletter digest (2026-04-20) -- "Comprehension over Generation" framework. The Socratic pushback interview detects hand-waving and gaps in understanding, producing a reusable explanation artifact. Idea #2: Comprehension Interview Loop Agent.
