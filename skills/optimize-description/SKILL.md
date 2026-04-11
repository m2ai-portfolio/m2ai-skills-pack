---
name: optimize-description
description: Rewrite a skill's description field for maximum agent discoverability -- clear trigger conditions, explicit input/output contracts, and disambiguation from similar skills.
---

# Skill Description Optimizer

Takes an existing skill file and rewrites its description for maximum agent discoverability. Agents read description fields to decide when to invoke a skill -- a weak description means the skill never fires when it should, or fires when it shouldn't.

## Trigger

Use when the user says "optimize this skill's description", "fix my skill triggers", "why isn't this skill firing", "optimize description", "improve skill discoverability", or when reviewing a skill that has vague or missing trigger language.

## Phase 1: Intake

Accept the target skill. This can be:
- A skill name (look it up in `~/.claude/skills/<name>/SKILL.md`)
- A file path to a SKILL.md
- Pasted skill content

Read the full SKILL.md. Extract:
- Current `description` field from YAML frontmatter
- Current trigger section (if any)
- All phases and what the skill actually does
- Any input requirements and output format

## Phase 2: Analyze Current Description

Score the current description on 5 criteria (1-5 each):

### 1. Trigger Clarity
- Does the description contain explicit trigger phrases an agent would match on?
- Are the trigger conditions specific enough to avoid false positives?

### 2. Disambiguation
- Could this description be confused with another skill in the library?
- Scan `~/.claude/skills/*/SKILL.md` for skills with similar descriptions
- Flag any pair with >60% semantic overlap

### 3. Input/Output Contract
- Does the description specify what the skill needs to run?
- Does it indicate what the skill produces?

### 4. Scope Boundaries
- Is it clear what this skill does NOT do?
- Are there explicit exclusions for adjacent use cases?

### 5. Agent Readability
- Is the description a single coherent sentence (ideal) or fragmented?
- Does it avoid jargon that only the skill author would understand?

Present scores:
```
Trigger Clarity:    [X/5]
Disambiguation:     [X/5]
Input/Output:       [X/5]
Scope Boundaries:   [X/5]
Agent Readability:  [X/5]
TOTAL:              [XX/25]
```

## Phase 3: Rewrite

Generate an optimized description following these rules:

1. **Lead with the action verb** -- "Rewrite", "Analyze", "Generate", "Convert", not "This skill..."
2. **Include 2-3 trigger phrases** inline -- words/phrases an agent or user would naturally say
3. **State the input** -- what the skill consumes
4. **State the output** -- what the skill produces
5. **Disambiguate** -- if similar skills exist, add a clause like "unlike X which does Y, this skill does Z"
6. **One to two sentences max** -- agents parse descriptions quickly; verbose = ignored

### Template
```
[Action verb] [input type] [to produce what] -- [trigger phrases]. [Disambiguation if needed].
```

### Examples of Good Descriptions
- "Stress-test any agent prompt or specification for ambiguity, missing constraints, and edge cases that would cause random behavior at scale."
- "Generate images using the Gemini image generation API. Use when the user asks to generate, create, or make an image, picture, photo, illustration, or visual."

## Phase 4: Verify

1. Re-score the new description on the same 5 criteria
2. Show before/after comparison
3. Check for regression: does the new description accidentally exclude valid use cases the old one covered?

## Phase 5: Apply (with confirmation)

Ask the user: "Apply this description to the skill file?"

If yes, update only the `description:` field in the YAML frontmatter of the SKILL.md. Do not modify any other content.

## Source Attribution

Technique: Skill Description Field Optimization
Source: Nate's Newsletter (natesnewsletter@substack.com), 2026-03-30
Post: "Your Best AI Work Vanishes Every Session. 4 Prompts That Make It Permanent"
