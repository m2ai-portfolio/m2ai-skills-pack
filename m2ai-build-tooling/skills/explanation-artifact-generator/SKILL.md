---
name: explanation-artifact-generator
description: Walk through a 4-question comprehension template for any project artifact (repo, feature, tool) and produce a structured explanation artifact that lives alongside the code. Questions cover what it is, why this approach, what would break, and what you learned. Use when the user says "explanation artifact", "explain this project", "comprehension template", "4-question template", "what did I learn", "document my understanding", or wants to create a proof-of-understanding for something they built.
---

# Explanation Artifact Generator

Takes any project artifact and walks the user through a 4-question comprehension template. Produces a structured markdown artifact that documents understanding, not just usage. The artifact lives alongside the code as proof that someone understood what they built and why.

This is deliberately lightweight. Unlike context-layer-generator (which produces structural manifests, behavioral contracts, and decision logs from code analysis), this skill produces a human-authored reflection. The value is in forcing the author to articulate their own understanding.

## Prerequisites

- A project, feature, tool, or module the user has built or significantly modified
- The user must be the one answering -- this is not an automated scan

## Phase 1: Identify the Subject

Ask the user:
1. What artifact are we documenting? (repo, feature, module, tool, deployment)
2. Where does it live? (path, repo URL, or description)

If the user provides a path, read the project structure to provide context for the questions. But do NOT answer the questions for them -- the point is human articulation.

## Phase 2: The Four Questions

Walk through each question one at a time. For each question, ask it, wait for the user's answer, and probe if the answer is vague or hand-wavy.

### Question 1: What is this?

Ask: "In one paragraph, what does this do and who is it for?"

Probe if needed:
- "Who specifically uses this? Not 'developers' -- which developers, doing what?"
- "What problem does this solve that wasn't solved before?"
- "If this disappeared tomorrow, what would break?"

### Question 2: Why this approach?

Ask: "What alternatives did you consider, and why did you pick this one?"

Probe if needed:
- "What was the second-best option? Why didn't you go with it?"
- "What constraint forced this choice? (time, tech, team, cost)"
- "If you started over with no constraints, would you build it the same way?"

### Question 3: What would break?

Ask: "What are the fragile points? What assumptions does this depend on?"

Probe if needed:
- "What happens under 10x load?"
- "What happens if [key dependency] goes down?"
- "What's the most likely way this fails silently (user doesn't notice but data is wrong)?"
- "What would a new developer accidentally break in their first week?"

### Question 4: What did I learn?

Ask: "Where was the AI wrong, what surprised you, and what changed your approach mid-build?"

Probe if needed:
- "Did you accept any AI-generated code you didn't fully understand? Where?"
- "What would you tell past-you before starting this project?"
- "What's the one thing that isn't in the README that someone needs to know?"

## Phase 3: Assemble the Artifact

Combine the user's answers into a structured markdown file:

```markdown
# Explanation Artifact: <subject_name>

**Author**: <user>
**Date**: <today>
**Subject**: <path or description>

## What is this?
<user's answer, cleaned up but not rewritten>

## Why this approach?
<user's answer>
**Alternatives considered**: <extracted from answer>
**Key constraint**: <extracted from answer>

## What would break?
<user's answer>
**Fragile points**: <bulleted list extracted from answer>
**Assumptions**: <bulleted list extracted from answer>

## What did I learn?
<user's answer>
**AI gaps**: <where AI was wrong or unhelpful>
**Key insight**: <the one thing not in the README>
```

## Phase 4: Store the Artifact

Ask the user where to store it:
- **Option A**: Alongside the code as `EXPLANATION.md` in the project root
- **Option B**: In the project's `docs/` directory
- **Option C**: In the Obsidian vault under `projects/<name>/`

Write the file to the chosen location.

## Verification

A good explanation artifact has:
- [ ] All four questions answered with specific details (not generalities)
- [ ] At least one alternative approach named in Q2
- [ ] At least one concrete fragile point in Q3 (not "it could break if something goes wrong")
- [ ] At least one honest admission in Q4 (AI gaps, surprises, or mid-course changes)
- [ ] No answers that could apply to any project (if you could swap in a different project name and the answer still works, it's too generic)

## Source Attribution

Extracted from Nate Kadlac's newsletter digest (2026-04-20) -- "Comprehension over Generation" framework. The 4-question template is Nate's core artifact for proving understanding in a world where production is free. Idea #1: Explanation Artifact Generator.
