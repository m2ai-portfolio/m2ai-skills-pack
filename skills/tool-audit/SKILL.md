---
name: tool-audit
description: Audit a tool already in your stack against a semantic-depth rubric and emit a clear decision — Extend, Wrap, Replace, or Wait — with a one-page memo. Use when evaluating whether a current tool is worth keeping, improving, or replacing; when a tool is causing agent failures; or the user says "/tool-audit", "should I replace this tool", "is this tool agent-ready", "extend or replace", "wrap this API".
---

# Tool Stack Audit — Extend / Wrap / Replace / Wait

Audit any tool, API, or SDK already in your stack against a semantic-depth rubric. Produces a one-page decision memo with a single clear recommendation.

## Trigger

Use when the user wants to evaluate a specific tool in their stack. Triggers on "/tool-audit", "should I keep using X", "is X agent-ready", "should I wrap X", "extend or replace X", "what's the ROI of replacing X".

## Phase 1: Tool Intake

Ask the user for:
1. **Tool name and version**: What is being audited?
2. **Current use case**: What does your system use this tool for?
3. **Failure symptoms** (optional): Is there a specific pain point that triggered this audit?
4. **Alternatives considered** (optional): Are there known replacements already on the radar?

## Phase 2: Semantic Depth Scoring

Score the tool across 10 dimensions (1-5 each). Focus on how the tool behaves when called by an autonomous agent, not a human user.

| # | Dimension | 1 | 3 | 5 |
|---|-----------|---|---|---|
| 1 | **Action Vocabulary** | Undocumented / natural language only | Named but unstable | Typed, versioned, enumerable |
| 2 | **Permission Encoding** | UI/ambient session | Scoped tokens, not introspectable | Structured tokens agents can read |
| 3 | **Validation Paths** | Success inferred from output text | Some structured errors | Deterministic success/failure contract per action |
| 4 | **State Observability** | Screen-scrape required | API-readable but opaque schema | Typed, predictable, versioned state |
| 5 | **Error Semantics** | Human-readable strings | Error codes only | Code + field + remediation |
| 6 | **Commitment Primitives** | Instant-commit, no rollback | Dry-run on some actions | Full stage-validate-commit pattern |
| 7 | **Intent Capture** | WHAT only | Some context fields | WHY encoded: purpose, policy, effects |
| 8 | **Notification Model** | Human channels only | Opaque webhooks | Structured, subscribable event stream |
| 9 | **Schema Richness** | None / undocumented | OpenAPI exists but incomplete | Typed, versioned, stable, with changelog |
| 10 | **Agent Feedback Loops** | No outcome reporting | Basic status | Structured outcome: confirmation + side effects |

For each dimension: score + one sentence of evidence from the tool's actual behavior (not marketing docs).

## Phase 3: Decision Logic

Calculate total score (sum of 10 dimensions, max 50) and apply the decision tree:

```
Score >= 40 (80%+):  EXTEND
  The tool has strong semantic depth. Gaps are addressable through configuration or
  minor wrapper code. Keep it; invest in the weak dimensions.

Score 25-39 (50-78%): WRAP
  The tool has useful capabilities but key semantic gaps will cause agent failures.
  Build a thin semantic layer over the tool: structured errors, typed schemas,
  staged commits. Do not replace yet — wrapping is cheaper.

Score 15-24 (30-48%): REPLACE
  The tool's semantic gaps are structural. A wrapper cannot fix missing permission
  encoding or absent validation contracts. Identify a semantically richer alternative.

Score < 15 (below 30%): WAIT
  Either the tool space is immature (no alternatives score higher) or this use case
  does not require deep agent semantics yet. Re-audit in [N months] when the market
  has moved.
```

Override conditions:
- If Permission Encoding = 1 AND the tool handles financial, identity, or access-control actions: escalate to REPLACE regardless of total score. Agents cannot safely manage unscopeable permissions.
- If Validation Paths = 1 AND the tool performs write actions on production data: escalate to WRAP (at minimum) immediately — agents need a validation contract before they can act safely.

## Phase 4: Memo Output

```
# Tool Audit Memo: [Tool Name] v[version]
Date: [date]
Use Case: [from intake]

## Recommendation: [EXTEND | WRAP | REPLACE | WAIT]

## Score: XX/50

## Dimension Breakdown
| Dimension | Score | Evidence |
|-----------|-------|----------|
| Action Vocabulary | X/5 | ... |
| Permission Encoding | X/5 | ... |
| Validation Paths | X/5 | ... |
| State Observability | X/5 | ... |
| Error Semantics | X/5 | ... |
| Commitment Primitives | X/5 | ... |
| Intent Capture | X/5 | ... |
| Notification Model | X/5 | ... |
| Schema Richness | X/5 | ... |
| Agent Feedback Loops | X/5 | ... |

## Rationale
[2-3 sentences: why this recommendation, what drives the score, what changes it]

## Action Items

### If EXTEND:
- [ ] [Specific configuration or code to address weakest dimension]
- [ ] [Second improvement]

### If WRAP:
- [ ] Define the wrapper interface (what the agent calls)
- [ ] Implement structured error translation
- [ ] Add staged-commit pattern for write actions
- [ ] [Tool-specific gap to patch]

### If REPLACE:
- [ ] Candidate replacement: [name if known, or "identify via /semantic-score"]
- [ ] Migration scope: [what changes in the calling code]
- [ ] Timeline: [suggested migration window]

### If WAIT:
- [ ] Revisit date: [N months]
- [ ] Trigger condition: [what market change would prompt re-audit]

## Risks of Inaction
[What breaks in the agent pipeline if this recommendation is ignored]
```

## Phase 5: Verification

- [ ] Score is based on tool behavior, not vendor marketing
- [ ] Override conditions checked explicitly (permission + write actions)
- [ ] Action items are concrete, not generic advice
- [ ] If REPLACE, at least one candidate alternative is named or a next step to find one is specified

## Source

Technique derived from Nate Jones newsletter (2026-05-06): "The next AI platform winner won't have the best model." Decision framework reconstructed from the Extend/Wrap/Replace/Wait framing for semantic-depth assessment of tools in an agent stack.
