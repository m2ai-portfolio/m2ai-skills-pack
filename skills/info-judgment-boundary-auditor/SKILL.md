---
name: info-judgment-boundary-auditor
description: Audit an agent system, workflow, or AI implementation to map where information retrieval ends and judgment calls begin. Flags implicit judgment that looks like retrieval, preventing the silent degradation of decision quality. Use when reviewing agent designs, deploying AI into decision workflows, or diagnosing "it was working fine then decisions got worse" failures.
---

# Information-vs-Judgment Boundary Auditor

Audits an agent system or AI-augmented workflow to draw an explicit line between "information the system retrieves/synthesizes" and "judgment calls that require human editorial discretion." Flags where judgment is being made implicitly -- decisions that look like retrieval but actually require editorial discretion.

## Trigger

Use when the user says "boundary audit", "info judgment audit", "where are the judgment calls", "audit decision points", "implicit judgment check", "editorial boundary", "decisions are degrading", or when reviewing an agent design before deployment. Also trigger when someone reports "the AI was working fine but decisions are getting worse over time."

## Why This Matters

The core failure mode: AI implementations that replace the editorial judgment managers/analysts provided with pattern-matching that *feels* like judgment but isn't. The system retrieves information, synthesizes it, and presents a conclusion -- and nobody notices that the conclusion required a judgment call that was never explicitly delegated.

This doesn't fail loudly. It degrades "one small editorial choice at a time" while producing clean dashboards and confident outputs.

## Phase 1: Intake

Accept the system to audit. This can be:
- An agent definition (agent.yaml, CLAUDE.md, system prompt)
- A workflow description (n8n flow, scheduled pipeline, manual process)
- A codebase path containing agent or automation code
- A verbal description of a decision workflow

If given a codebase, scan for: LLM prompts, tool definitions, output formatting, filtering logic, prioritization, and any step that selects/ranks/excludes information.

## Phase 2: Map Decision Points

Walk through the system end-to-end and identify every point where a choice is made. For each decision point, classify it:

### RETRIEVAL (Information)
The system finds and returns information without interpreting its significance.
- Keyword/semantic search returning documents
- Database queries returning records
- API calls fetching data
- Aggregation (count, sum, average) without interpretation

### SYNTHESIS (Gray Zone)
The system combines information from multiple sources into a new representation.
- Summarization (what to include, what to omit)
- Comparison (which differences matter)
- Trend detection (what counts as a trend vs noise)
- Ranking (what criteria determine order)

### JUDGMENT (Editorial)
The system decides what information *means* or what action to take based on interpretation.
- "This signal is important" (importance assessment)
- "These two data points are related" (causal inference)
- "This is an outlier vs a new pattern" (anomaly classification)
- "Escalate this / suppress this" (triage)
- "The user needs to know about this" (relevance to context)
- "This recommendation applies here" (contextual application)

## Phase 3: Flag Implicit Judgment

For each SYNTHESIS and JUDGMENT point, check:

1. **Is it labeled as judgment?** Does the system/prompt acknowledge this is an editorial decision, or does it treat it as information retrieval?
2. **Is there a human gate?** Can a human review the judgment before it affects downstream decisions?
3. **Are the criteria explicit?** If the system decides "this is important," are the importance criteria documented and auditable?
4. **Is the failure mode visible?** If the system makes a bad judgment call, will anyone notice? How long until the degradation is detected?

Flag as **IMPLICIT JUDGMENT** when:
- A JUDGMENT decision is made without acknowledging it as judgment
- Criteria are embedded in prompts but not documented or auditable
- No human gate exists for decisions that affect downstream quality
- The failure mode is silent (bad decisions produce confident-looking output)

## Phase 4: Boundary Map

```
## Information-vs-Judgment Boundary Map

System: [name]
Date: [today]
Decision points found: N

### Retrieval (Safe to automate)
| Step | What it does | Risk Level |
|------|-------------|------------|
| [step] | [description] | LOW |

### Synthesis (Audit regularly)
| Step | What it does | Criteria Explicit? | Human Gate? | Risk |
|------|-------------|-------------------|-------------|------|
| [step] | [description] | YES/NO | YES/NO | MED/HIGH |

### Judgment (Must be explicitly delegated)
| Step | What it does | Currently Labeled? | Human Gate? | Failure Visibility | Risk |
|------|-------------|-------------------|-------------|-------------------|------|
| [step] | [description] | YES/NO | YES/NO | VISIBLE/SILENT | HIGH/CRITICAL |

### Implicit Judgment Flags (Action Required)
| Step | What's happening | Why it's implicit | Recommended fix |
|------|-----------------|-------------------|-----------------|
| [step] | [the judgment being made] | [why it looks like retrieval] | [make explicit / add gate / document criteria] |
```

## Phase 5: Recommendations

For each IMPLICIT JUDGMENT flag, recommend one of:

### Option A: Make It Explicit
Document the judgment criteria. Turn the implicit decision into an explicit rule set that can be audited. Example: instead of "summarize the key points," specify "include any item that affects revenue, timeline, or customer satisfaction."

### Option B: Add a Human Gate
Insert a human review point before the judgment affects downstream decisions. The human doesn't review everything -- just the judgment calls. Example: AI retrieves and synthesizes, human approves the "what matters" assessment.

### Option C: Add Outcome Tracking
If the judgment is low-stakes enough to automate, add a feedback loop that tracks whether the automated judgments are producing good outcomes over time. Set a degradation threshold that triggers human review.

### Option D: Split the Step
Decompose the step into a retrieval component (automate) and a judgment component (gate). Example: "find relevant emails and rank by importance" becomes "find relevant emails" (automate) + "which of these matter" (human gate or explicit criteria).

## Verification

A good audit has:
- Every decision point in the system classified (RETRIEVAL / SYNTHESIS / JUDGMENT)
- No step left unclassified or marked "it depends" without specifics
- Every JUDGMENT step checked for explicitness, human gates, and failure visibility
- Implicit judgment flags with specific recommended fixes, not generic "add human review"
- The failure mode for each implicit judgment described concretely ("if this goes wrong, X happens and nobody notices for Y days")

## Relationship to Other Skills

- **management-function-audit**: Audits organizational management functions (routing, sensemaking, accountability). This skill audits the *information/judgment boundary* in technical systems.
- **sensemaking-concentrator**: Identifies where sensemaking is distributed across agents. This skill identifies where judgment is being made *implicitly* (whether distributed or concentrated).
- **bitter-lesson-scorecard**: Scores architecture against simplification potential. This skill is orthogonal -- a simplified system can still make implicit judgments.

## Source

Extracted from Nate Kadlac newsletter (2026-04-19): "The key differentiator is whether you build an explicit boundary layer between information retrieval and judgment calls before anything else." Framework for auditing where editorial judgment is being replaced by pattern-matching in AI implementations.
