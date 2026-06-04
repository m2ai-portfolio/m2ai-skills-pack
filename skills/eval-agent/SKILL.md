---
name: eval-agent
description: Score any agent tool or platform against 3 structural questions (persistent memory, inspectable artifacts, compounding context) for a given use case, then generate a delegation spec that patches the weaknesses found. Use when evaluating agent tools, comparing platforms, or deciding whether to trust a tool with a specific workflow.
---

# Agent Evaluation Framework

Scores any agent tool or platform against three structural questions that predict whether delegation will succeed or silently fail. Produces a numeric scorecard and a concrete delegation spec that compensates for gaps.

## Trigger

Use when the user says "eval agent", "evaluate this tool", "score this agent", "should I use X for Y", "compare agents", "3 questions", "can I trust X with this", "agent scorecard", or asks whether a specific tool is ready for a specific workflow.

## Phase 1: Identify the Target

Determine what to evaluate:

1. **Tool/platform name** -- e.g., Lindy, Cowork, n8n, Claude Code, custom agent
2. **Use case** -- the specific workflow being delegated (e.g., "weekly client report generation", "email triage and response")
3. **Delegation mode** -- fire-and-forget, supervised, or hybrid

If the user gives just a tool name, ask for the use case. If they give just a use case, ask which tool they're considering.

## Phase 2: Score Against 3 Structural Questions

For each question, score 0-1 (decimals allowed) based on the tool's actual capabilities for the stated use case:

### Q1: Persistent Memory (0-1)

Does the tool remember what it learned from previous runs?

| Score | Criteria |
|-------|----------|
| 0 | Stateless -- each run starts from scratch |
| 0.25 | Session memory only -- forgets across sessions |
| 0.5 | Has memory but unstructured (append-only logs, no retrieval strategy) |
| 0.75 | Structured memory with retrieval (key-value, relational, or vector) |
| 1.0 | Multi-tier memory architecture (preferences + facts + semantic + event logs) with decay/consolidation |

Check for:
- Does it remember user preferences across sessions?
- Can it recall specific facts from 10+ sessions ago?
- Does it distinguish between different memory types (preferences vs facts vs history)?
- Is memory queryable or just appended?

### Q2: Inspectable Artifacts (0-1)

Can a human see, verify, and correct the agent's work products and reasoning?

| Score | Criteria |
|-------|----------|
| 0 | Black box -- output only, no intermediate visibility |
| 0.25 | Logs available but unstructured (raw text dumps) |
| 0.5 | Structured logs with tool calls visible |
| 0.75 | Human-readable artifacts at each stage (drafts, plans, decisions exposed) |
| 1.0 | Full inspectability -- editable artifacts, reasoning traces, decision audit trail |

Check for:
- Can you see intermediate steps, not just final output?
- Are work products stored in a format humans can read without specialized tooling?
- Can you correct a mistake at step 3 without re-running steps 1-2?
- Is there an audit trail of why decisions were made?

### Q3: Compounding Context (0-1)

Does run N+1 benefit from run N, or does the tool start fresh each time?

| Score | Criteria |
|-------|----------|
| 0 | No compounding -- each run is independent |
| 0.25 | Basic history -- previous outputs available but not synthesized |
| 0.5 | Learns patterns -- adapts behavior based on accumulated data |
| 0.75 | Active compounding -- builds reusable knowledge artifacts (templates, rules, models) |
| 1.0 | Self-improving -- measures own performance, identifies gaps, upgrades its own context |

Check for:
- Does the 10th run produce meaningfully better output than the 1st?
- Are there feedback loops that improve quality over time?
- Does accumulated context help or hurt? (memory rot detection)
- Can the system identify and fix its own blind spots?

## Phase 3: Generate Scorecard

Output format:

```
Agent Evaluation: [Tool Name] for [Use Case]
=============================================

Q1 Persistent Memory:    [X.XX] / 1.00  [bar visual]
Q2 Inspectable Artifacts: [X.XX] / 1.00  [bar visual]
Q3 Compounding Context:  [X.XX] / 1.00  [bar visual]
                         ------
Composite Score:         [X.XX] / 3.00

Delegation Risk: [LOW / MEDIUM / HIGH / CRITICAL]
```

Risk thresholds:
- 2.25+ = LOW -- safe to delegate with light oversight
- 1.50-2.24 = MEDIUM -- delegate with review gates
- 0.75-1.49 = HIGH -- delegate only atomic tasks, verify each output
- Below 0.75 = CRITICAL -- do not delegate; use as a tool, not an agent

## Phase 4: Generate Compensation Spec

For each question scoring below 0.75, generate a concrete compensation:

### Memory Compensation (if Q1 < 0.75)
- Context package: what to inject at the start of each run
- Memory proxy: external store (Obsidian, SQLite, Perceptor) to hold state between runs
- Refresh cadence: how often to update the injected context

### Inspectability Compensation (if Q2 < 0.75)
- Review gates: where to insert human checkpoints
- Artifact extraction: how to surface intermediate work products
- Correction protocol: how to fix mistakes without full re-runs

### Compounding Compensation (if Q3 < 0.75)
- Feedback loop: how to capture what worked and feed it back
- Quality tracking: metrics to measure whether output improves over time
- Rot detection: signals that accumulated context is degrading performance

## Phase 5: Output Delegation Spec

Final deliverable -- a ready-to-use delegation spec:

```
Delegation Spec: [Use Case] via [Tool Name]
============================================

Pre-flight:
- [ ] Inject context package: [specific items]
- [ ] Verify tool access: [specific permissions/APIs]
- [ ] Set review gates at: [specific stages]

Execution:
- Delegation mode: [fire-and-forget / supervised / hybrid]
- Max autonomous steps before checkpoint: [N]
- Artifact format: [how outputs should be structured]

Post-flight:
- [ ] Verify against: [specific acceptance criteria]
- [ ] Extract learnings to: [memory store]
- [ ] Update context package for next run: [what changed]
```

## Verification

The evaluation is valid if:
1. All 3 questions were scored with specific evidence, not assumptions
2. Each score below 0.75 has a concrete compensation
3. The delegation spec is actionable without further interpretation
4. Risk level matches the composite score thresholds

## Source Attribution

Framework derived from Nate's Newsletter (2026-04-04): "I Tested Cowork, Lindy, Sauna, and Opal Against 3 Questions" -- persistent memory, inspectable artifacts, and compounding context as the three durable evaluation principles for outcome agents.
