---
name: tool-build-guide-generator
description: Generate a hands-on, machine-ready build guide for any tool or library — takes a tool name and produces a runnable, annotated project that closes the gap between "I've heard of it" and "I can build with it". Not a hello-world demo; a real build that develops genuine fluency. Trigger: "build guide for [tool]", "help me actually learn [library]", "I know what [tool] does but can't build with it", "heard-of to can-build-with for [tool]".
---

# Tool Build Guide Generator

Takes a tool or library name and generates a machine-ready, hands-on guide — not documentation, not a hello-world, but a real project that teaches you how the tool behaves in practice. The goal is fluency: you should be able to build a second thing with this tool without referring back to the guide.

## When to Use

Trigger when:
- You can name a tool and describe what it does, but haven't shipped anything with it
- You want to learn by building, not by reading documentation passively
- You need a project scope that's achievable in a few hours but is real enough to surface edge cases
- You want the guide to be runnable by an agent, not just human-readable

Do NOT use for:
- Generating a deployment-ready production spec — use `build-spec-generator` for that
- Auditing whether a workflow should be automated at all — use `workflow-fit-scorer` for that
- Deep research into a tool's internals or history — this generates a build, not an analysis

## Phase 1: Tool Intake

Collect from the user (or infer from context):

1. **Tool name** — exact name or repo (e.g., "Hono", "LangGraph", "Mastra", "pgvector")
2. **Intended use case** — what are you trying to do with it? (e.g., "build a lightweight API server", "add semantic search to an existing SQLite app")
3. **Your starting point** — what stack are you already comfortable with? (e.g., "I know Express well", "I've never touched Rust")
4. **Time budget** — a few hours? a weekend? This sets the project scope.

If the user provides only the tool name, prompt for #2 and #3 before generating.

## Phase 2: Research the Tool

Before writing the guide, gather current ground truth on the tool. Do NOT generate from training data alone — tools change fast and training knowledge is stale.

Steps:
1. Fetch the tool's official docs or README (use fetch/WebSearch if available)
2. Look for a "Getting Started" or "Tutorial" section in the official docs
3. Find one concrete real-world usage example (GitHub, blog post, or official example repo)
4. Note: version in use, required peer dependencies, any known gotchas or breaking changes

Record what you find. If you cannot access current docs, say so and note what you're working from.

## Phase 3: Scope the Build Project

Design a project that meets these constraints:

- **Real, not toy**: the project solves a problem someone would actually have, not just demonstrating an API
- **Contained**: completable in the stated time budget without external dependencies beyond the tool itself
- **Edge-case-exposing**: the project should hit at least 2 non-obvious behaviors of the tool (error handling, concurrency, config options, performance limits)
- **Runnable end-to-end**: someone should be able to clone/copy it and run it with minimal setup

Bad scope: "Build a TODO app with [tool]"
Good scope: "Build a rate-limited webhook receiver that validates HMAC signatures and queues messages to SQLite — covers [tool]'s middleware chaining, error propagation, and sync/async boundaries"

State the project name, what it does, and which tool behaviors it will exercise before writing any code.

## Phase 4: Generate the Build Guide

Structure the guide as follows:

### 1. Prerequisites

List exactly what the reader needs installed and configured. No "you should know X" — list the specific commands to verify: `node --version`, `which bun`, etc.

### 2. Project Setup

```bash
# exact commands to initialize the project
mkdir my-project && cd my-project
npm init -y
npm install [tool] [required-deps]
```

### 3. Core Build Steps

Numbered steps, each with:
- **What you're building**: one sentence
- **The code**: complete, copy-pasteable snippet — no "fill in the rest"
- **Why it works this way**: one sentence on the non-obvious behavior this step teaches
- **Common mistake**: the thing most people get wrong the first time with this tool here

Example format:
```
## Step 3: Add error middleware

[code block]

Why: [Tool] runs middleware in registration order; error handlers must be registered
last or they won't catch errors thrown by earlier middleware. This surprises Express
developers because [tool]'s error boundary is implicit, not explicit.

Common mistake: Registering the error handler before routes and wondering why it
never fires.
```

### 4. Running It

Exact command to start the project. Expected output. How to verify it's working.

### 5. What to Build Next

Two concrete extensions that would deepen fluency with this tool, each achievable in under an hour once you've completed the guide. Don't list features — list problems to solve with this specific tool.

## Phase 5: Machine-Readiness Check

Before delivering the guide, verify:

- [ ] Every code block is complete — no `// ... rest of code` or `// TODO`
- [ ] Dependencies are pinned to a version that matches the docs you researched
- [ ] The "why" annotation for each step uses tool-specific vocabulary, not generic advice
- [ ] The guide can be handed to an agent (Claude Code, Codex, etc.) that can execute it without clarification
- [ ] No step requires the reader to consult external docs to complete it

If any check fails, fix the guide before delivering.

## Output Format

Deliver as a single markdown document structured per Phase 4. The document should be:
- Self-contained: everything needed to complete the build is in the document
- ~800–1500 words for a "few hours" scope, ~2000–3500 words for a weekend scope
- Saved to `./[tool-name]-build-guide.md` by default, or `$GUIDE_OUTPUT_PATH` if set

## What Makes This Different from Documentation

Official docs optimize for completeness and accuracy. This guide optimizes for fluency: the reader should encounter the tool's actual edges and develop muscle memory, not just familiarity with the happy path. A reader who completes this guide should be able to build something new with the tool without looking anything up — that's the success criterion.

## Source Attribution

Technique: Hands-on Build Guide Generation (Heard-Of → Can-Build-With)
Source: Nate's Newsletter (natesnewsletter@substack.com)
URL: https://natesnewsletter.substack.com/p/why-im-moving-this-substack-from
Published: 2026-06-01
Subject: "Why I'm moving this Substack from daily coverage to deeper weekly work"
