---
name: model-migration-preflight
description: Audit your prompts, system instructions, and Claude Code configuration before switching model versions. Flags deprecated API parameters, prompts that depend on implicit model inference, scaffolding code the new model handles natively, and estimates the tokenizer cost delta. Use before any model version upgrade that affects production workflows.
---

# Model Migration Pre-flight Auditor

Inventories your prompt files, system instructions, and agent configuration, then flags what will break, silently degrade, or cost more after a model version change. Prevents the failure mode where a migration passes initial tests but silently regresses in production.

## When to Invoke

Trigger on: "pre-flight for model upgrade", "what breaks when I switch to [version]", "migration audit", "check my prompts for [version] compatibility", "tokenizer cost check", or any planned model version change affecting production.

## Phase 1: Define the Migration

Collect:

1. **From version** -- current model (e.g., claude-sonnet-4-5, gpt-4o, gemini-pro-1.5)
2. **To version** -- target model (e.g., claude-sonnet-4-6, gpt-5, gemini-ultra-2)
3. **Scope** -- which files and directories to audit (default: current directory + any `CLAUDE.md` files found)
4. **Provider** -- Anthropic / OpenAI / Google / other

If the user specifies only the target version, infer the provider from the model name.

## Phase 2: Inventory Files

Scan the specified scope for:

- **System prompts** -- files matching `*system_prompt*`, `*AGENT.md*`, `*system.md*`, `*system.txt*`
- **Instruction files** -- `CLAUDE.md`, `AGENTS.md`, `*.instructions.md`
- **Prompt templates** -- files in `prompts/`, `templates/`, `skills/` directories
- **API call sites** -- source files containing model name strings or API parameter names

Report the inventory count before proceeding.

## Phase 3: API Parameter Compatibility Check

For each source file found, grep for API parameters known to be deprecated or changed in the target version.

### Anthropic (Claude) migrations

Parameters that cause `400` errors if present with newer Claude models:

| Parameter | Status in New Models | Risk |
|-----------|---------------------|------|
| `temperature` | Deprecated in Opus 4.7 | Hard break -- returns 400 |
| `top_p` | Deprecated in Opus 4.7 | Hard break -- returns 400 |
| `top_k` | Deprecated in Opus 4.7 | Hard break -- returns 400 |
| `thinking.budget_tokens` | Format changed in 4.7 | Silent behavior change |
| `max_tokens_to_sample` | Legacy param name | May be silently ignored |

### OpenAI migrations

| Parameter | Status | Risk |
|-----------|--------|------|
| `functions` | Replaced by `tools` | Deprecated, may break |
| `function_call` | Replaced by `tool_choice` | Deprecated |
| `logprobs` schema | Changed in GPT-5 | Silent format change |

### Google (Gemini) migrations

| Parameter | Status | Risk |
|-----------|--------|------|
| `candidate_count` | Removed in Gemini 2.x | Hard break |
| `stop_sequences` (old format) | Changed to `stop` | Behavior change |

Flag every match with: file path, line number, parameter name, risk level (HARD BREAK / BEHAVIOR CHANGE / DEPRECATION WARNING).

## Phase 4: Implicit Inference Audit

Scan prompt files for patterns that depend on the model inferring unstated intent -- patterns that work with older models but produce literal output with newer ones.

Flag prompts containing:

| Pattern | Risk | Why |
|---------|------|-----|
| "format this nicely" | HIGH | New models interpret literally -- no implied format |
| "clean this up" | HIGH | Scope undefined -- new models may do nothing or change everything |
| "make it better" | HIGH | Success criteria missing |
| "use your judgment" | MEDIUM | New models with literal interpretation may refuse or produce minimal output |
| "as appropriate" | MEDIUM | Ambiguity resolved differently across versions |
| Implicit output format | MEDIUM | Older models inferred JSON/markdown from context; new models may need explicit instruction |
| Missing success criteria | MEDIUM | Prompt ends without defining what "done" looks like |

For each flag, provide: file path, line, the flagged phrase, and a suggested rewrite that front-loads intent.

**Suggested rewrite template:**

> Instead of: "Clean up this text"
> Use: "Rewrite this text to [specific goal]. Output format: [format]. Do not change: [constraints]."

## Phase 5: Scaffolding Detection

Scan for code patterns written to compensate for previous model limitations that the new model handles natively. These are safe to remove but produce no errors if left -- they just add noise.

Flag patterns such as:

- Forced progress messages ("Say 'working...' every 10 steps") -- new models handle autonomously
- Explicit loop-breaking retry logic inside prompts -- new models self-monitor
- Redundant "remember to..." reminders scattered throughout long prompts -- new models maintain context natively
- Hard-coded intermediate checkpoints that were needed for older models' context degradation

## Phase 6: Tokenizer Cost Delta

Estimate the cost impact of the tokenizer change.

1. Identify the tokenizer for the source and target models (e.g., cl100k_base vs o200k_base for OpenAI; Anthropic's tokenizer versions)
2. For each prompt file found in Phase 2, count tokens using the source tokenizer
3. Apply the known expansion ratio (e.g., Opus 4.7 tokenizer maps same text to ~35% more tokens)
4. Project monthly cost impact based on estimated run frequency (ask the user if unknown)

Output:

```
TOKENIZER COST PROJECTION
=========================
Files audited: [N]
Total tokens (source tokenizer): [N]
Total tokens (target tokenizer): [N]
Expansion ratio: [X]x
Estimated monthly cost delta: +$[X] (at [N] runs/day)
Highest-cost files: [top 3 with token counts]
```

If the exact tokenizer is unavailable locally, report the known expansion ratio from the version changelog and note that local counting was skipped.

## Phase 7: Output Report

Deliver a prioritized report:

```
MODEL MIGRATION PRE-FLIGHT
==========================
From: [model]    To: [model]    Files audited: [N]

HARD BREAKS (fix before migration -- these will return errors):
[list with file:line, parameter, fix]

BEHAVIOR CHANGES (test after migration -- silent regressions likely):
[list with file:line, pattern, rewrite suggestion]

SCAFFOLDING TO REMOVE (optional cleanup):
[list with file:line, pattern, why it's safe to remove]

TOKENIZER COST IMPACT:
[summary from Phase 6]

RECOMMENDED ORDER OF OPERATIONS:
1. Fix all HARD BREAKS
2. Rewrite flagged implicit-inference prompts
3. Deploy to staging, run your eval suite
4. Remove scaffolding only after evals pass
5. Monitor token costs for first 48 hours after cutover
```

## Verification

The audit is complete if:

1. At least one source file was scanned -- if no files found, report that explicitly
2. Every HARD BREAK has a specific file path and line number
3. Every implicit-inference flag has a suggested rewrite
4. Tokenizer cost delta is reported even if approximate
5. The report's order of operations can be executed without further clarification

## Source

Nate Kadlac, "Opus 4.7 is smarter, more literal, and quietly more expensive" (2026-04-21). Key signals: new tokenizer maps same text to ~35% more tokens; temperature/top_p/top_k deprecated and return 400; more literal interpretation breaks prompts relying on implicit inference; scaffolding code written for 4.6 persistence behavior is now unnecessary overhead.
