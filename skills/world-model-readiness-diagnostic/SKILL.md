---
name: world-model-readiness-diagnostic
description: Interactive diagnostic that maps an organization to a world model paradigm (vector DB, structured ontology, or signal-driven) and recommends a starting sequence for implementation. Use when assessing organizational AI readiness, choosing a knowledge architecture, or starting a consulting engagement.
---

# World Model Readiness Diagnostic

A twenty-minute interactive assessment that maps an organization or team to one of three world model paradigms and produces a sequenced implementation plan. Designed as both a strategic planning tool and a lead-gen diagnostic for consulting engagements.

## Trigger

Use when the user says "world model readiness", "readiness diagnostic", "which knowledge architecture", "vector vs ontology", "how should we structure our AI knowledge", "world model assessment", "organizational AI readiness", or when starting a consulting engagement where knowledge infrastructure decisions need to be made early.

## Phase 1: Context Gathering

Ask the user to describe the organization or team being assessed. Accept:
- Company name and industry
- Team size and structure
- Current AI/ML maturity (none, experimenting, production)
- Primary knowledge challenge ("we can't find what we know", "our data is siloed", "decisions are inconsistent")

If the user provides a URL or document, extract this context automatically.

## Phase 2: Diagnostic Questionnaire

Ask 8-10 questions across four dimensions. Score each answer against the three paradigms.

### Dimension 1: Knowledge Character

1. **How structured is your existing knowledge?**
   - Mostly unstructured (documents, emails, conversations) -> Vector DB
   - Highly structured (taxonomies, schemas, databases) -> Structured Ontology
   - Mixed, with real-time data streams -> Signal-Driven

2. **How often does your critical knowledge change?**
   - Rarely (policies, procedures, historical records) -> Structured Ontology
   - Monthly/quarterly (market analysis, project docs) -> Vector DB
   - Daily or faster (market signals, social media, alerts) -> Signal-Driven

### Dimension 2: Decision Patterns

3. **How do your people currently find answers?**
   - Search through documents and ask colleagues -> Vector DB
   - Follow decision trees or lookup tables -> Structured Ontology
   - Monitor dashboards and react to alerts -> Signal-Driven

4. **What causes the most costly mistakes?**
   - Not finding relevant precedent or expertise -> Vector DB
   - Inconsistent interpretation of rules/policies -> Structured Ontology
   - Slow reaction to changing conditions -> Signal-Driven

### Dimension 3: Organizational Shape

5. **How centralized is decision-making authority?**
   - Distributed (many people make independent decisions) -> Vector DB
   - Centralized with explicit delegation rules -> Structured Ontology
   - Distributed but needs coordination on shared signals -> Signal-Driven

6. **How much domain-specific terminology exists?**
   - Moderate (industry-standard terms) -> Vector DB
   - Heavy (proprietary taxonomies, regulatory language) -> Structured Ontology
   - Light (general business language, emphasis on recency) -> Signal-Driven

### Dimension 4: Failure Mode Tolerance

7. **Which failure mode is most dangerous for you?**
   - Missing a relevant document or precedent -> Vector DB
   - Inconsistent answers to the same question -> Structured Ontology
   - Stale information presented as current -> Signal-Driven

8. **How much editorial judgment currently sits in human hands?**
   - High (analysts interpret and synthesize before decisions) -> Higher complexity, any paradigm
   - Low (mostly lookup and retrieval) -> Lower complexity, any paradigm
   - Mixed (retrieval is easy, interpretation is the bottleneck) -> Boundary auditor needed first

## Phase 3: Paradigm Scoring

Tally paradigm signals across all answers:

```
| Paradigm | Signals | Fit Score |
|----------|---------|-----------|
| Vector DB (Semantic Similarity) | N | X% |
| Structured Ontology (Explicit Relations) | N | Y% |
| Signal-Driven (Real-Time Reactive) | N | Z% |
```

### Paradigm Profiles

**Vector DB / Semantic Similarity**
- Strengths: Fast to deploy, handles unstructured content, good at "find me something like X"
- Weaknesses: Poor at causal reasoning, can't enforce consistency, degrades silently when embeddings drift
- Best for: Knowledge retrieval, expertise location, document search, Q&A systems
- Watch out for: Assuming semantic similarity equals relevance. Two documents about the same topic can have opposite conclusions.

**Structured Ontology / Explicit Relations**
- Strengths: Consistent answers, auditable reasoning paths, handles complex domain rules
- Weaknesses: Rigid (breaks on novel situations), expensive to build and maintain, requires domain experts to model
- Best for: Compliance, regulatory domains, medical/legal, any domain where consistency matters more than coverage
- Watch out for: Over-engineering the ontology before validating the use case. Ontologies that model everything end up modeling nothing.

**Signal-Driven / Real-Time Reactive**
- Strengths: Responsive to changing conditions, good at pattern detection, handles temporal data natively
- Weaknesses: Noisy (recency bias), prone to overreaction, requires significant filtering infrastructure
- Best for: Market monitoring, security operations, social media, any domain where "what's happening now" beats "what happened before"
- Watch out for: Recency bias masquerading as insight. The most recent signal is not always the most important one.

## Phase 4: Starting Sequence

Based on the dominant paradigm, recommend a phased implementation:

### If Vector DB dominant:
```
Week 1-2: Document inventory + chunking strategy
Week 3-4: Embedding pipeline + retrieval baseline
Month 2:  Evaluation harness (precision/recall on known queries)
Month 3:  Editorial layer (human-in-loop for high-stakes retrievals)
```

### If Structured Ontology dominant:
```
Week 1-2: Domain expert interviews + entity/relation inventory
Week 3-4: Core ontology (start with 20% of entities that cover 80% of queries)
Month 2:  Consistency test suite (same question, same answer every time)
Month 3:  Edge case handling (novel situations the ontology doesn't cover)
```

### If Signal-Driven dominant:
```
Week 1-2: Signal source inventory + noise baseline measurement
Week 3-4: Filtering pipeline + alert threshold calibration
Month 2:  False positive audit (how many alerts are actionable?)
Month 3:  Editorial layer (who decides which signals matter?)
```

### If mixed (no dominant paradigm by >15%):
Recommend a hybrid starting with the paradigm that addresses the user's stated "most costly mistake" (Question 7), then layering in the second paradigm in Month 3+.

## Phase 5: Output

```
# World Model Readiness Diagnostic

## Organization: [name]
## Date: [today]

## Paradigm Fit
| Paradigm | Fit Score | Primary Strengths | Key Risk |
|----------|-----------|-------------------|----------|
| Vector DB | X% | [from profile] | [from profile] |
| Structured Ontology | Y% | [from profile] | [from profile] |
| Signal-Driven | Z% | [from profile] | [from profile] |

**Recommended paradigm: [dominant]**
**Confidence: [HIGH if dominant >50%, MODERATE if 35-50%, LOW if <35%]**

## Starting Sequence
[From Phase 4]

## Critical Pre-Requisite
[If Question 8 scored "High editorial judgment" or "Mixed"]:
Before building any knowledge infrastructure, audit the information-vs-judgment
boundary. Which decisions currently require human editorial discretion? These
must remain human-gated in the initial implementation. See: /info-judgment-boundary-auditor

## Watch-Outs
- [Top risk from the dominant paradigm profile]
- [Risk from the secondary paradigm that might be needed later]
```

## Verification

A good diagnostic has:
- All 8 questions answered (or reasonable defaults stated for skipped questions)
- Paradigm scores that reflect the actual answers, not the assessor's preference
- A starting sequence specific to the organization, not a generic template
- The editorial judgment pre-requisite flagged if Question 8 scored high
- No recommendation to "do all three at once" (that's a recipe for doing none well)

## Source

Extracted from Nate Kadlac newsletter (2026-04-19): "World model implementations replacing middle management will look authoritative for ~6 months but silently degrade decision quality because they replace the editorial judgment managers provided with pattern-matching that feels like judgment but isn't." Framework: twenty-minute readiness assessment mapping organizations to paradigms.
