---
name: agent-cost-model
description: Model token costs and optimization opportunities for any agent workflow, producing per-task costs, monthly burn, and model-routing savings.
---

# Agent Cost Modeling Skill

Takes an agent workflow description and produces a full cost model: per-task cost, daily/monthly burn, model-routing optimization, and break-even analysis.

## Trigger

Use when the user says "cost model", "how much will this cost", "token economics", "estimate the cost", "optimize model costs", or describes an agent pipeline and asks about pricing.

## Phase 1: Workflow Capture

Gather the workflow details. Ask for (accept estimates):

1. **Pipeline steps** -- what does the agent do, in order?
2. **Model per step** -- which model handles each step? (e.g., Haiku for routing, Sonnet for coding, Opus for review)
3. **Token estimates per step**:
   - Input tokens (prompt + context)
   - Output tokens (response)
   - Cache-eligible tokens (system prompt, static context)
4. **Volume** -- tasks per day / per week / per month
5. **Concurrency** -- parallel workers?

If the user can't estimate tokens, help them:
- Short prompt (~500 input tokens)
- Medium prompt with context (~2,000-5,000 input tokens)
- Full codebase context (~50,000-100,000 input tokens)
- Short response (~200 output tokens)
- Code generation response (~1,000-3,000 output tokens)
- Long analysis (~5,000+ output tokens)

## Phase 2: Pricing Reference

Use current Anthropic pricing (per million tokens):

| Model | Input | Output | Cache Write | Cache Read |
|-------|-------|--------|-------------|------------|
| Haiku 3.5 | $0.80 | $4.00 | $1.00 | $0.08 |
| Sonnet 4 | $3.00 | $15.00 | $3.75 | $0.30 |
| Opus 4 | $15.00 | $75.00 | $18.75 | $1.50 |

For other providers (OpenAI, Google, OpenRouter), ask the user or check current published rates. **Do not guess pricing from training data -- ask or verify.**

## Phase 3: Cost Calculation

For each pipeline step, calculate:

```
step_cost = (input_tokens * input_price) + (output_tokens * output_price)
           + (cache_write_tokens * cache_write_price) + (cache_read_tokens * cache_read_price)
```

Then aggregate:

| Step | Model | Input Tokens | Output Tokens | Cost/Task |
|------|-------|-------------|---------------|-----------|
| [step name] | [model] | [N] | [N] | $X.XXXX |
| ... | ... | ... | ... | ... |
| **Total** | | | | **$X.XXXX** |

**Daily burn**: cost/task * tasks/day
**Monthly burn**: daily * 30
**Annual burn**: monthly * 12

## Phase 4: Optimization Analysis

Identify savings opportunities:

### Model Routing
- Which steps use expensive models but could use cheaper ones?
- Rule of thumb: routing/classification -> Haiku, generation/coding -> Sonnet, complex reasoning/review -> Opus
- Calculate savings if optimized

### Caching
- Which steps share static context (system prompts, CLAUDE.md, schemas)?
- Cache hit rate estimate: if volume > 10/day on same prompt prefix, caching saves 90%+ on those tokens
- Calculate savings with caching enabled

### Prompt Optimization
- Are any prompts unnecessarily verbose?
- Could few-shot examples be replaced with instructions?
- Could context be trimmed without quality loss?

### Volume Thresholds
- At what volume does a Batch API (50% discount, 24h turnaround) make sense?
- Break-even: if latency isn't critical, batch at any volume

Present as:

| Optimization | Monthly Savings | Effort |
|--------------|----------------|--------|
| [description] | $X.XX (Y%) | [low/medium/high] |

## Phase 5: Summary Report

```markdown
# Agent Cost Model: [Pipeline Name]

## Per-Task Cost: $X.XXXX
## Monthly Burn (at N tasks/day): $X.XX
## Annual Burn: $X,XXX

## Cost Breakdown
[table from Phase 3]

## Optimization Opportunities
[table from Phase 4]

## Optimized Monthly Burn: $X.XX (savings: Y%)

## Break-Even Analysis
- vs. human labor at $X/hr: breaks even at N tasks/month
- vs. alternative approach: [comparison if relevant]
```

## Notes

- All estimates are approximations. Actual costs depend on exact prompt content, model behavior, and caching hit rates.
- Pricing changes frequently. Always verify against current published rates before making business decisions.
- For ClaudeClaw multi-agent costs, remember each agent (main, research, comms, content, ops) has its own token budget per task.

## Source

Extracted from Nate Kadlac newsletter (2026-03-26) -- "The K-Shaped AI Labor Market" -- cost/token economics as a core AI-native skill.
