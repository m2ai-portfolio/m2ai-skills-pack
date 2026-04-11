---
name: geopolitical-signal-enricher
description: Enriches a market or technology signal with geopolitical context -- affected regions, supply chain nodes, timeline estimates, and second-order effects on tech infrastructure.
---

# Geopolitical Signal Enricher

Takes a market signal, technology trend, or industry development and enriches it with geopolitical context that pure tech-focused analysis would miss. Designed to complement research-agents output and IdeaForge signals.

## Trigger

Use when the user says "enrich this signal", "geopolitical context for", "what's the geopolitical angle", "supply chain risk for", or provides a market/tech signal and asks about its geopolitical or physical-world dependencies.

Also use when reviewing IdeaForge signals or research-agent output that references physical infrastructure, supply chains, trade policy, or geopolitical events.

## Phase 1: Intake

Accept the signal. This can be:
- A market signal from IdeaForge or research-agents ("helium shortage", "TSMC capacity constraints")
- A technology trend ("AI infrastructure buildout", "on-device inference shift")
- A geopolitical event ("sanctions on X", "trade route disruption")
- A business decision that has physical-world dependencies

Restate the signal in one sentence.

## Phase 2: Geopolitical Mapping

For the given signal, map:

### Geographic Concentration Risk
- Which countries/regions control critical nodes?
- What percentage of supply/capacity is concentrated?
- Are there single points of failure?

### Supply Chain Transmission
- What physical materials, components, or infrastructure does this depend on?
- Which have no substitutes? (Flag these as CRITICAL)
- What is the typical lead time for supply chain disruption to reach end-users?

### Policy & Regulatory Exposure
- Which governments could change the picture with a single policy decision?
- Are there active or proposed regulations that affect this signal?
- Export controls, sanctions, tariffs, or subsidies in play?

### Geopolitical Scenarios (3)
Generate three plausible scenarios for how geopolitics could affect this signal:
1. **Base case** -- most likely trajectory given current trends
2. **Upside case** -- geopolitical developments that would accelerate/improve the situation
3. **Downside case** -- geopolitical developments that would worsen/disrupt the situation

For each scenario, estimate probability (LOW < 20% / MODERATE 20-50% / HIGH > 50%) and timeline.

## Phase 3: Second-Order Effects

Map how the geopolitical context flows through to tech/AI infrastructure:
- GPU/chip delivery timelines
- Cloud compute pricing
- Data center construction
- Energy costs and availability
- Talent mobility (visa, immigration policy)

Only include effects with a plausible causal chain. No speculation without a mechanism.

## Phase 4: Enriched Signal Output

```
## Enriched Signal: [Signal Name]

**Original signal:** [one-line]
**Geopolitical relevance:** LOW / MODERATE / HIGH / CRITICAL

### Geographic Concentration
[Key findings -- which nodes are concentrated where]

### Supply Chain Dependencies
| Dependency | Substitutable? | Concentration | Lead Time |
|-----------|---------------|---------------|-----------|
| [material] | No (CRITICAL) | 60% Qatar | 6-12 months |

### Policy Exposure
[Active regulations, sanctions, subsidies affecting this signal]

### Scenarios
| Scenario | Probability | Timeline | Impact on Signal |
|----------|------------|----------|-----------------|
| Base | HIGH | 6-12mo | [description] |
| Upside | LOW | 12-18mo | [description] |
| Downside | MODERATE | 3-6mo | [description] |

### Second-Order Effects on Tech Infrastructure
1. [Effect with causal chain]
2. [...]

### Recommended Actions
- [What to monitor]
- [What to hedge against]
- [What to accelerate before the window closes]
```

## Phase 5: Output

Present the enriched signal, then offer:
- "Want me to save this enrichment to IdeaForge?"
- "Want an executive briefing on this?" (hand off to executive-briefing skill)
- "Want me to check other signals in the pipeline for similar exposure?"

## Verification

A good enrichment:
- Identifies at least one non-obvious dependency (something the original signal didn't surface)
- Has quantified concentration data, not just "some countries control supply"
- Scenarios are genuinely different, not just "good/medium/bad" versions of the same thing
- Second-order effects have explicit causal chains, not hand-waving

## Source

Extracted from Nate Kadlac newsletter (2026-03-29) -- "Executive Briefing: 33% of the world's helium supply just went offline" -- geopolitical risk analysis as a dimension missing from pure tech signal analysis.
