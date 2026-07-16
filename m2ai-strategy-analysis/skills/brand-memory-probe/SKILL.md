---
name: brand-memory-probe
description: Probe how a brand appears in AI agent recall across multiple LLM providers. Simulates generic buyer intent queries (e.g. "best CRM for a 5-person team") against Claude, ChatGPT, Gemini, and Perplexity and produces a "memory share" report showing whether the brand surfaces, in what position, and with what caveats. Use when asked "does my brand appear in AI search", "brand memory probe", "AI recall audit", "how does ChatGPT describe us", or "agent share of voice".
---

# Brand Memory Probe

Simulates how a target brand appears when an AI agent answers a generic buyer intent query. Analogous to share-of-voice, but for agent recall rather than search rankings.

## When to Invoke

Trigger on: "brand memory probe", "AI recall audit", "how does [LLM] describe us", "agent share of voice", "does my brand surface in ChatGPT", "brand in agent memory", or when the user wants to know how their brand or a competitor's brand appears in AI-generated responses.

## Inputs

Ask the user (skip any already answered):

1. **Target brand** — company name, product name, or URL
2. **Buyer persona and intent** — describe the buyer and their need (e.g. "SMB operations manager looking for project management software"). If not provided, generate 2-3 generic intent queries based on the brand's apparent category.
3. **Providers to probe** — default: Claude, ChatGPT (GPT-4o), Gemini Pro, Perplexity. User can narrow.
4. **Comparison mode** — single brand (how does brand X surface?) or competitive (how does brand X compare to brands Y, Z?)

## Phase 1: Intent Query Construction

Generate 3 buyer intent queries that a real buyer would ask an AI assistant. Queries must:
- Be phrased as the buyer, not as the brand ("What's the best X for Y?" not "Tell me about [brand]")
- Cover different buying stages: awareness, evaluation, decision
- Be provider-agnostic in phrasing

Example for a B2B SaaS CRM:
1. Awareness: "What are the best CRM tools for a 5-person startup?"
2. Evaluation: "Compare HubSpot, Pipedrive, and Notion for a bootstrapped team"
3. Decision: "Which CRM has the cheapest plan that still has email automation?"

## Phase 2: Multi-Provider Probing

For each query × provider combination, record:

| Field | What to capture |
|---|---|
| Named? | Is the target brand mentioned by name? |
| Position | First named / top-3 named / mentioned later / not mentioned |
| Sentiment framing | Positive / neutral / negative / with caveats |
| Caveat type | "but expensive", "limited free tier", "better for enterprise", etc. |
| Competitor co-mentions | Which competitors are named alongside it? |
| Source attribution | Does the provider cite a source that could explain the framing? |

**How to probe:** If the user has API access, call each provider directly. If not, generate the prompts and instruct the user to paste results back. When running with API access, use temperature 0 for reproducibility.

## Phase 3: Memory Share Calculation

For each provider:
```
Named rate = (queries where brand is mentioned) / (total queries) × 100%
Lead rate = (queries where brand is named first) / (total queries) × 100%
Positive rate = (named mentions with positive/neutral framing) / (named mentions) × 100%
```

Overall memory share score (0–100):
```
Score = (Named rate × 0.5) + (Lead rate × 0.3) + (Positive rate × 0.2)
```

Classify:
- **80–100**: High recall — brand is a default answer for this category
- **50–79**: Moderate recall — brand surfaces but not dominant
- **20–49**: Low recall — brand appears sometimes, often with caveats
- **0–19**: Minimal recall — brand is absent or edge-case only

## Phase 4: Output Report

```
# Brand Memory Probe: [Brand Name]
Date: [today]
Buyer intent: [summary of buyer persona and query set]
Providers probed: [list]

## Memory Share Summary
| Provider | Named Rate | Lead Rate | Positive Rate | Score |
|----------|------------|-----------|---------------|-------|
| Claude   | X%         | X%        | X%            | XX    |
| ChatGPT  | X%         | X%        | X%            | XX    |
| Gemini   | X%         | X%        | X%            | XX    |
| Perplexity | X%       | X%        | X%            | XX    |
| **Overall** | **X%** | **X%** | **X%** | **XX** |

## Verdict: [HIGH / MODERATE / LOW / MINIMAL] Recall

## Key Findings
- [What framing pattern dominates across providers?]
- [Which provider is most / least favorable?]
- [Which competitors consistently co-appear?]
- [Any systematic caveat pattern? e.g. always flagged as "expensive"?]

## Query-Level Detail
### Query 1: "[query text]"
| Provider | Named? | Position | Framing | Caveats |
|----------|--------|----------|---------|---------|
| Claude   | Yes/No | [pos]    | [sent]  | [...]   |
...

## Recommended Actions
1. [Address the dominant caveat — what content change would shift framing?]
2. [Which provider gap is most addressable?]
3. [Competitive positioning: which co-mentions are a threat vs. an opportunity?]
```

## Limitations to State

Always note these in the report:
- LLM recall is a snapshot — it reflects training data and RLHF patterns at query time, not a real-time index
- Results vary by phrasing, temperature, and provider version — re-run quarterly for longitudinal signal
- Perplexity uses live web retrieval; its results are more volatile than the others

## Verification

A good probe:
- Uses buyer-voice queries, not brand-voice queries
- Captures the caveat pattern, not just the mention rate
- Notes which provider is most and least favorable (they differ systematically)
- Does not claim the score is stable — flags that re-runs will vary

## Source Attribution

Technique derived from Nate's Newsletter (2026-05-03): "Executive Briefing: What Stripe Sessions 2026 actually means for how you sell" — the "brand migrates to the buyer's memory" theme and the framing of "memory share" as the successor metric to share-of-voice in an agent-first commerce environment.
