---
name: inference-layer-ownership-auditor
description: Map your AI stack to identify who controls each inference layer -- model provider, hosting, hardware -- and score substitutability at each layer. Flags layers where you have no alternative if the current vendor's economics break. Use before a strategic AI vendor decision or during portability planning.
---

# Inference Layer Ownership Auditor

Produces a layered map of who controls the AI inference stack an organization depends on, with substitutability scores at each layer. Surfaces structural lock-in before it becomes a budget crisis.

## Trigger

Use when the user says "/inference-layer-ownership-auditor", "map my AI stack", "who controls my inference", "audit AI vendor lock-in", "AI dependency map", or "inference ownership audit".

## Phase 1: Intake

Collect (or infer from context):
1. **Input sources**: codebase path, vendor list, API config files, or a free-text description of current AI use
2. **Scope**: full organization, a single product, or a named agent/workflow

If given a codebase path, auto-discover providers by grepping for API client instantiations and model name strings. If given a free-text description, proceed from that.

## Phase 2: Layer Extraction

Extract and classify dependencies into three layers:

**Layer 1 -- Model Provider** (who trains and serves the model)
- Examples: Anthropic, OpenAI, Google DeepMind, Meta (Llama via HuggingFace), Mistral
- Identify: which model families are in use, whether they are accessible only via that provider's API or also available via third-party hosts

**Layer 2 -- Hosting Provider** (who runs the inference infrastructure)
- Examples: Azure OpenAI, AWS Bedrock, Google Vertex, Fireworks, Together AI, OpenRouter, self-hosted
- Identify: whether the hosting provider is the same as the model provider (tighter lock-in) or a separate entity (more portability)

**Layer 3 -- Hardware Provider** (who owns the silicon the model runs on)
- Examples: NVIDIA (H100/H200), Google (TPU), AMD, Apple (ANE/M-series), own hardware (on-device)
- Identify: whether this layer is visible to the organization at all, or fully opaque (most cloud APIs hide it)

For each layer, record:
- **Current vendor**: who you depend on
- **Is it documented?**: is this dependency explicit in config/code, or implicit?
- **Alternatives**: at least one viable alternative at this layer
- **Switch effort**: Low (days) / Medium (weeks) / High (months+) / None (no alternative exists)

## Phase 3: Substitutability Scoring

For each layer, score substitutability 0-100:

| Score | Meaning |
|-------|---------|
| 80-100 | Multiple alternatives; switch effort Low; standard interfaces (OpenAI-compatible API) |
| 50-79 | Alternatives exist but switch effort is Medium; some proprietary features in use |
| 20-49 | One alternative; switch effort High; proprietary features deeply embedded |
| 0-19 | No viable alternative identified, OR switch effort is effectively infinite |

**Aggregate lock-in score** = weighted average: Layer 1 x 50% + Layer 2 x 30% + Layer 3 x 20%

Layer 1 is weighted highest because model capability is the hardest to replace. Layer 3 is lowest because hardware is usually abstracted away by cloud providers.

## Phase 4: Risk Flag Report

```
=================================================================
INFERENCE LAYER OWNERSHIP AUDIT
=================================================================
Date: {date}
Scope: {product / organization / workflow}

LAYER MAP

  Layer 1 -- Model Provider
    Current:      {vendor} ({model family})
    Alternatives: {list}
    Switch Effort:{level}
    Sub Score:    {0-100}

  Layer 2 -- Hosting Provider
    Current:      {vendor}
    Alternatives: {list}
    Switch Effort:{level}
    Sub Score:    {0-100}

  Layer 3 -- Hardware Provider
    Current:      {vendor or "opaque / cloud-managed"}
    Alternatives: {list or "N/A -- hidden behind cloud abstraction"}
    Switch Effort:{level}
    Sub Score:    {0-100}

AGGREGATE LOCK-IN SCORE: {0-100}
  {interpretation: Low / Moderate / High / Critical lock-in}

CRITICAL FLAGS
  {any layer with Sub Score < 20 -- list with reason}

RECOMMENDED ACTIONS
1. {highest-leverage portability improvement}
2. {next action}
=================================================================
```

## Phase 5: Optional Portability Improvements

If the user wants to act on the report, offer these starting points:
- **Model name hardcoding** -- switch to a configurable env var or provider-abstraction library
- **Provider-specific features** -- flag which features have equivalents on alternative providers
- **OpenAI-compatible API adoption** -- if the current provider exposes an OpenAI-compatible endpoint, switching hosting providers becomes lower effort

Do NOT auto-edit code without explicit user confirmation.

## What This Does NOT Do

- Does not produce live cost analysis -- pair with `/ai-cost-exposure-audit` for cost sensitivity.
- Does not evaluate model quality differences across alternatives -- that requires benchmarking, not auditing.
- Does not scan runtime configs fetched from external services.

## Source

Derived from Nate Kadlac newsletter (2026-04-26): "Executive Briefing: The AI cost curve your strategy is riding just broke." The structural thesis that the question that matters is no longer "which model is best" but "who owns the inference layer your organization depends on, and what happens when the subsidies stop."
