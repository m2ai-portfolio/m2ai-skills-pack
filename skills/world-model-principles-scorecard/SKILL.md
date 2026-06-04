---
name: world-model-principles-scorecard
description: Score an agent system or knowledge base against five principles that determine whether a world model compounds value or silently rots — signal fidelity, earned structure, outcome encoding, organizational resistance, and accumulated reality. Complementary to bitter-lesson-scorecard (architecture simplicity) — this measures knowledge/decision quality.
---

# World Model Principles Scorecard

Evaluates an existing agent system or knowledge base against five principles that determine whether the system's world model compounds value over time or silently degrades. Produces a scored assessment with specific improvement recommendations.

## Trigger

Use when the user says "world model scorecard", "five principles", "is my knowledge compounding", "decision quality audit", "knowledge rot check", "world model health", "does my system learn", or when evaluating whether an agent system is getting better or worse at its job over time.

## Why This Exists

A system can have clean architecture (passes the bitter-lesson-scorecard), correct information-judgment boundaries (passes the info-judgment-boundary-auditor), and still produce decisions that degrade over time. The five principles measure whether the system's accumulated knowledge is *compounding* (each new input makes the system smarter) or *rotting* (each new input adds noise faster than signal).

## Phase 1: Intake

Accept the system to evaluate:
- An agent system with persistent memory or knowledge base
- A knowledge management system (vector DB, wiki, Obsidian vault, etc.)
- A decision pipeline that accumulates data over time
- A the agent platform-style agent with memory consolidation

If given a codebase, scan for: memory stores, knowledge bases, learning/feedback loops, data retention policies, consolidation logic, and any component that persists information across sessions.

## Phase 2: Score Against Five Principles

### Principle 1: Signal Fidelity
**Does new information enter the system at the quality it was produced, or does it degrade during ingestion?**

Check for:
- Lossy transformations during ingestion (over-aggressive summarization, metadata stripping)
- Source attribution preserved or lost
- Confidence/certainty levels captured or flattened to binary
- Context preserved (when/where/why something was recorded) or stripped

Scoring:
- **5 (Excellent)**: Source, confidence, context all preserved. Originals accessible.
- **4 (Good)**: Minor metadata loss but core signal intact. Source tracked.
- **3 (Adequate)**: Summarized but findable. Some context lost.
- **2 (Poor)**: Significant lossy transformation. Sources not tracked.
- **1 (Failing)**: Information enters as flat text with no provenance. Can't distinguish high-confidence from speculation.

### Principle 2: Earned Structure
**Is the system's structure derived from actual usage patterns, or imposed before the data justified it?**

Check for:
- Categories/tags that emerged from actual use vs pre-defined taxonomies never populated
- Empty or near-empty structural elements (folders, tables, categories with <3 entries)
- Structure that adapts as usage patterns change vs rigid schema that forces data into predefined boxes
- Evidence that structure was refactored based on what actually accumulated

Scoring:
- **5 (Excellent)**: Structure emerged from and reflects actual usage. Regularly pruned.
- **4 (Good)**: Mostly organic structure with minor aspirational elements.
- **3 (Adequate)**: Mix of used and unused structure. Some dead categories.
- **2 (Poor)**: Mostly pre-defined structure that data is forced into. Many empty categories.
- **1 (Failing)**: Elaborate taxonomy with most nodes empty. Structure built for a future that never arrived.

### Principle 3: Outcome Encoding
**When the system's outputs lead to decisions, are the outcomes of those decisions fed back into the system?**

Check for:
- Feedback loops that capture "this recommendation worked / didn't work"
- Decision outcome tracking (not just decision logging)
- Calibration data (was the system's confidence justified by outcomes?)
- Negative feedback integration (does the system learn from failures, or only accumulate successes?)

Scoring:
- **5 (Excellent)**: Systematic outcome tracking with automatic calibration adjustments.
- **4 (Good)**: Outcome tracking exists but requires manual feedback. Used regularly.
- **3 (Adequate)**: Some outcome tracking but inconsistent. Feedback loops exist but rarely close.
- **2 (Poor)**: Decision logging without outcome tracking. System doesn't know if its outputs were useful.
- **1 (Failing)**: No feedback mechanism. System accumulates inputs but never learns whether its outputs mattered.

### Principle 4: Organizational Resistance
**Does the system handle pushback, contradictions, and inconvenient information, or does it optimize for comfortable consensus?**

Check for:
- Contradiction handling (when two sources disagree, is the disagreement preserved or silently resolved?)
- Uncomfortable signal retention (does the system keep information that contradicts the prevailing narrative?)
- Recency bias safeguards (does new information automatically override old, or are both retained for comparison?)
- Dissent preservation (in multi-agent systems, are minority opinions captured?)

Scoring:
- **5 (Excellent)**: Contradictions explicitly surfaced. Uncomfortable signals flagged, not filtered. Dissent preserved.
- **4 (Good)**: Contradictions usually preserved. Some recency bias but manually correctable.
- **3 (Adequate)**: Contradictions handled inconsistently. System tends toward consensus.
- **2 (Poor)**: New information silently overrides old. Contradictions resolved by recency. Comfortable narratives reinforced.
- **1 (Failing)**: System is an echo chamber. Contradictory information is filtered out or down-ranked. Only confirms existing beliefs.

### Principle 5: Accumulated Reality
**Does the system's model of the world get closer to reality over time, or does it drift toward a comfortable fiction?**

This is the meta-principle -- it's the compound effect of the other four. But it has its own indicators:

Check for:
- Prediction accuracy trending up or down over time (if measurable)
- Surprise frequency (is the system increasingly surprised by outcomes? That's drift.)
- External calibration (does the system's view get periodically checked against reality by someone outside the system?)
- Staleness indicators (how much of the knowledge base hasn't been accessed or validated in 90+ days?)

Scoring:
- **5 (Excellent)**: Measurable improvement in decision/prediction quality over time. Regular external calibration.
- **4 (Good)**: Stable quality with periodic external checks. Low staleness.
- **3 (Adequate)**: Quality unclear but no obvious degradation. Some stale content.
- **2 (Poor)**: Signs of drift (increasing surprises, stale content growing). No external calibration.
- **1 (Failing)**: System's world model has visibly diverged from reality. Large stale backlog. No calibration mechanism.

## Phase 3: Scorecard Output

```
## World Model Principles Scorecard

System: [name]
Date: [today]

| # | Principle | Score | Rating |
|---|-----------|-------|--------|
| 1 | Signal Fidelity | X/5 | [Excellent/Good/Adequate/Poor/Failing] |
| 2 | Earned Structure | X/5 | [Excellent/Good/Adequate/Poor/Failing] |
| 3 | Outcome Encoding | X/5 | [Excellent/Good/Adequate/Poor/Failing] |
| 4 | Organizational Resistance | X/5 | [Excellent/Good/Adequate/Poor/Failing] |
| 5 | Accumulated Reality | X/5 | [Excellent/Good/Adequate/Poor/Failing] |

**Total: XX/25**
**Trajectory: [COMPOUNDING / STABLE / DRIFTING / ROTTING]**

Thresholds:
- 21-25: COMPOUNDING — system gets smarter over time
- 16-20: STABLE — system maintains quality but doesn't improve
- 11-15: DRIFTING — quality is degrading but slowly enough to miss
- 5-10:  ROTTING — system's world model is diverging from reality

## Principle Details

### [For each principle]
**Score: X/5**
**Evidence:** [What was found]
**Gap:** [What's missing]
**Risk if unaddressed:** [Concrete failure mode with timeline]

## Improvement Priorities

### Immediate (This week)
- [Principle] — [Specific action] — [Expected impact]

### Near-term (This month)
- [Principle] — [Specific action] — [Expected impact]

### Strategic (This quarter)
- [Principle] — [Specific action] — [Expected impact]
```

## Phase 4: Cross-Reference

If other audit skills have been run on the same system, note relationships:

- **bitter-lesson-scorecard**: If Lock-In Score is high, Principles 2 (Earned Structure) and 4 (Organizational Resistance) are likely low -- rigid architecture resists both structural evolution and uncomfortable signals.
- **info-judgment-boundary-auditor**: If implicit judgment was found, Principle 3 (Outcome Encoding) is likely low -- you can't track outcomes of decisions you didn't know were being made.
- **agent-architecture-audit**: If Memory Decay/Provenance scored MISSING, Principles 1 (Signal Fidelity) and 5 (Accumulated Reality) are at risk.

## Verification

A good scorecard has:
- All five principles scored with specific evidence, not impressions
- Trajectory assessment consistent with individual scores (don't rate COMPOUNDING with two principles at 2/5)
- Improvement priorities sequenced by impact, not by ease
- Cross-references to related audits if they've been performed
- No score of 3 ("Adequate") without specific evidence -- 3 is the default cop-out score

## Relationship to Bitter Lesson Scorecard

The bitter-lesson-scorecard measures **architecture quality** (how vs what, simplification potential, model improvement leverage). This scorecard measures **knowledge quality** (does the system's understanding of the world improve or degrade over time). A system can score well on one and poorly on the other:
- Clean architecture + rotting knowledge = elegant system that's increasingly wrong
- Messy architecture + compounding knowledge = ugly system that keeps getting smarter

Both audits together give a complete picture.

## Source

Extracted from Nate Kadlac newsletter (2026-04-19): Five principles that determine whether a world model compounds or rots -- signal fidelity, earned structure, outcome encoding, organizational resistance, accumulated reality. Framework for evaluating knowledge system health over time.
