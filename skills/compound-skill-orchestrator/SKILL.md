---
name: compound-skill-orchestrator
description: Build orchestrator skills that chain multiple existing skills in sequence using context:fork, passing output between stages for a unified result. Use when the user says "chain skills", "combine skills", "orchestrator skill", "compound skill", "run skills in sequence", "skill pipeline", or wants to create a single command that runs multiple skills end-to-end.
---

# Compound Skill Orchestrator

Create orchestrator skills that chain multiple existing skills in sequence, each running in an isolated context window via `context: fork`. Each stage reads the output of the previous stage, and the final result is a unified deliverable.

## When to Use

- You have 3+ existing skills that logically feed into each other
- You want one command that produces a multi-stage output (research -> draft -> polish)
- You need each stage to have full context focus without polluting the main session
- You want human-in-the-loop flexibility (not a fully deterministic Python pipeline)

## When NOT to Use

- For a single skill that just needs isolation (use `context: fork` directly)
- For fully automated pipelines with no human oversight (use a Python script or agent)
- When stages don't depend on each other's output (run them independently)

## Phase 1: Identify the Chain

Ask the user:
1. What is the end-to-end workflow? (e.g., "research a topic, write copy, generate social posts")
2. Which existing skills cover each stage? List them.
3. What is the final deliverable? (PDF, markdown file, structured output)

If skills don't exist yet for some stages, note which ones need to be created first.

## Phase 2: Design the Data Flow

Map out the chain:

```
[Stage 1: /skill-a] --> writes output-a.md
[Stage 2: /skill-b] --> reads output-a.md, writes output-b.md
[Stage 3: /skill-c] --> reads output-a.md + output-b.md, writes final.md
```

Rules:
- Each stage must write its output to a known file path
- Each subsequent stage must explicitly read previous outputs
- The orchestrator must specify what comes back to the main context (usually just the final file)

## Phase 3: Write the Orchestrator SKILL.md

Template:

```yaml
---
name: your-orchestrator-name
description: [Clear description of what the full pipeline does and when to trigger it]
context: fork
agent: general-purpose
allowed_tools: [Read, Write, Glob, Grep, Bash, Skill, WebSearch, WebFetch]
---
```

```markdown
# [Orchestrator Name]

Run the following skills in sequence, passing the user's input as context to each stage.

## Step 1: [Stage Name]
Run '/skill-a [user input]'
Wait for completion. The output will be at [path].

## Step 2: [Stage Name]
Run '/skill-b'
This stage reads the output from Step 1 at [path].
Wait for completion. The output will be at [path].

## Step 3: [Stage Name]
Run '/skill-c'
This stage reads outputs from Steps 1 and 2.
Wait for completion.

## Final Output
After all steps complete, return only:
- The final deliverable file path
- A 3-5 line summary of what each stage produced
```

## Phase 4: Verify the Chain

1. Run the orchestrator with a test input
2. Confirm each stage executes in order
3. Confirm each stage reads previous outputs correctly
4. Confirm the final output contains contributions from all stages
5. Check token usage -- the forked context should not leak into the main session

## Key Principles

- **Each skill stays independent.** The orchestrator calls them; it doesn't merge their code.
- **Output files are the interface.** Skills communicate via written files, not shared memory.
- **The orchestrator is thin.** It's mostly a sequence of `/skill-name` invocations with routing logic.
- **`context: fork` is mandatory** on the orchestrator to keep the main session clean.
- **Specify `allowed_tools`** to control what the forked context can access.

## Example: Launch Offer Pipeline

```yaml
---
name: launch-offer
description: Take a business idea through market research, sales copy, email sequence, social posts, and a launch brief. One command, five stages.
context: fork
agent: general-purpose
allowed_tools: [Read, Write, Glob, Bash, Skill, WebSearch, WebFetch]
---
```

```markdown
# Launch Offer Pipeline

## Step 1: Market Scan
Run '/market-scan [user's idea]'
Output: /tmp/launch/market-scan.md

## Step 2: Sales Page Copy
Run '/sales-page'
Reads: /tmp/launch/market-scan.md
Output: /tmp/launch/sales-page.md

## Step 3: Email Sequence
Run '/email-sequence'
Reads: /tmp/launch/market-scan.md, /tmp/launch/sales-page.md
Output: /tmp/launch/email-sequence.md

## Step 4: Social Announcements
Run '/social-announce'
Reads: /tmp/launch/sales-page.md
Output: /tmp/launch/social-posts.md

## Step 5: Launch Brief
Run '/launch-brief'
Reads: All previous outputs
Output: /tmp/launch/launch-brief.pdf

## Final Output
Return the launch brief PDF path and a summary of each stage.
```

## Source

Extracted from: [Claude Code Skills Can Call Other Skills Now. This Changes Everything.](https://www.youtube.com/watch?v=KsYCtXeAGBg) by Mark Kashef (Prompt Advisors / AI Automation Society), April 9, 2026.
