---
name: tool-fluency-builder
description: Turn any AI tool or framework from "heard of it" to "can build with it" by generating a machine-ready, hands-on build guide. Goes beyond hello-world to produce a real, runnable project with annotated steps, pitfalls, and judgment calls. Closes the gap between familiarity and practical fluency.
---

# Tool Fluency Builder

Knowing a tool exists is not the same as being able to build with it. Most quick-start docs get you through "hello world" and leave you stranded on the first real problem. This skill generates a practitioner-level build guide -- a real project, not a demo, with the kind of annotation that only comes from someone who has already been stuck.

## Trigger

Use when the user says "build guide for [tool]", "I want to actually learn [tool]", "hands-on [tool] guide", "tool fluency [tool]", "heard of but never built with [tool]", "real project with [tool]", or "go beyond the hello world for [tool]".

## Phase 1: Tool Research

Before writing a single line, understand the tool deeply. Run targeted research:

1. **Official docs**: what does the tool actually do? What problem does it solve? What are its core abstractions?
2. **Current version and maturity**: version number, release cadence, known breaking changes
3. **Community usage patterns**: how are practitioners actually using it (not how the docs say to use it)?
4. **Common failure modes**: what breaks first? What do beginners always get wrong?
5. **Adjacent tools**: what does this replace or complement?

Search queries:
- `"[tool name] best practices [year]"`
- `"[tool name] common mistakes pitfalls"`
- `"[tool name] real world example"`
- `"[tool name] vs [alternative]"`
- `site:github.com "[tool name]" issues OR discussions`

Collect 5-10 signal points per category. Distinguish official documentation from community experience.

## Phase 2: Build Scenario Selection

A real build is more useful than a comprehensive one. Identify the right project to build:

**Selection criteria** (present 2-3 options and let the user choose, or pick based on context):

1. **Fits in one session** -- completable in 1-2 hours of focused work
2. **Uses 70-80% of the tool's core surface** -- not a toy, but not a production system
3. **Has a clear success state** -- you know when it works
4. **Hits a real pain point** -- solves a problem you'd actually have

**Anti-patterns to avoid:**
- Tutorial-style demos (counter, todo app, hello world)
- Scenarios that require complex external dependencies before the tool can run
- Anything that abstracts away the tool's interesting behavior

Document the chosen scenario in one sentence: "We will build [X] using [tool], which demonstrates [core capability]."

## Phase 3: Environment Setup (Runnable, Not Assumed)

Write the setup as commands, not prose. Assume a clean environment.

For each dependency:
- Exact install command
- Version pin if behavior is version-sensitive
- Verification step (how to confirm it's working)

```
# Example structure:
# 1. Install
# 2. Verify
# 3. Create project directory
# 4. Configure (auth, env vars, etc.)
# 5. Smoke test (the simplest possible invocation that proves setup works)
```

If setup has a common failure mode, document it inline: "If you see [error], it means [cause]. Fix: [exact command]."

## Phase 4: Scaffolded Build Steps

Write the build as ordered, annotated steps. Each step has:

1. **What you're building** -- one sentence
2. **The code/command** -- complete, runnable
3. **What to observe** -- what does success look like? What output do you expect?
4. **The judgment call** -- why this approach over alternatives? What would you change for production?

Format:
```markdown
### Step N: [Step Name]

**Goal**: [one sentence]

**Code**:
[complete, runnable code block]

**Expected output**:
[what to look for]

**Why this way**:
[the judgment call -- what makes this the right choice, and what you'd do differently in production]

**If it breaks**:
[specific failure modes at this step and how to fix them]
```

Target: 5-10 steps. If the build naturally needs more, split into "core path" (5-7 steps to working version) and "extensions" (optional depth).

## Phase 5: Failure Mode Index

List the 5 most common ways practitioners get stuck. For each:

| Failure Mode | Symptom | Root Cause | Fix |
|-------------|---------|------------|-----|
| [name] | [what you see] | [why it happens] | [exact steps] |

Source these from Phase 1 community research -- not invented. If community signal is sparse, note that the index will fill in over time.

## Phase 6: Fluency Checkpoint

A set of questions the reader can answer to verify they have actual fluency, not just completion:

1. [Question that requires understanding a core abstraction]
2. [Question about a non-obvious behavior]
3. [Question about when NOT to use this tool]
4. [Question about the tradeoff the tool makes]
5. [Question about what breaks first at scale]

If the reader can answer all five without looking at the guide, they have fluency. If not, they have completion.

## Output

Produce a single Markdown document with all phases included. Default output to `./[tool-name]-build-guide.md`. If `OUTPUT_PATH` is set in environment, write there instead.

Structure:
```markdown
# [Tool Name] — Hands-On Build Guide

## Build Scenario
[Phase 2 result]

## Prerequisites
[Phase 3 result]

## The Build
[Phase 4 steps]

## Failure Mode Index
[Phase 5 table]

## Fluency Checkpoint
[Phase 6 questions]

## What Next
[2-3 natural next steps once the build is complete: harder variant, production hardening, adjacent tool to learn]
```

## Verification

- [ ] Build scenario is specific ("we will build X") not vague ("explore the tool")
- [ ] Every setup step has a verification command
- [ ] Every build step has an "expected output" and a "if it breaks" section
- [ ] Failure mode index was sourced from community signals, not invented
- [ ] Fluency checkpoint questions test understanding, not recall
- [ ] Output file was written to `./[tool-name]-build-guide.md` or `OUTPUT_PATH`

## Notes

- This skill produces documentation, not code. The build steps contain code, but the artifact is the guide -- meant to be followed by a human or an agent in a fresh environment.
- "Real build" means the scenario would appear in a portfolio or production codebase. If you can describe the build in a tweet, it is probably too small.
- For tools with breaking versions, pin the version in the setup section and note the version in the guide title.

## Source Attribution

Nate's Newsletter -- 2026-06-01
Post: "Why I'm moving this Substack from daily coverage to deeper weekly work"
Idea: Weekly "Build" Guide Generator (heard-of to can-build-with pipeline)
https://natesnewsletter.substack.com/p/why-im-moving-this-substack-from

Core insight: execution cost is now cheap; the scarce skill is judgment and real fluency. "Heard of it" and "can build with it" are different leagues. The gap is closed by going through a real build -- not a demo. This skill makes that process systematic and repeatable.
