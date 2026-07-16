---
name: model-audit
description: Scan a codebase for LLM model usage and recommend tier, task-fit, and cost optimizations. Works on any project using Anthropic, Google, OpenAI, or open-source models. Use to check whether each task is running on the right model tier, when a new model generation ships and you want to see if you can tier down, when you suspect you are overspending on tokens for simple tasks, or for a periodic model hygiene review.
argument-hint: "[--tier] [--task-fit] [--cost] [--recent] [--check-docs] [--path DIR]"
model: haiku
context: fork
---

# /model-audit

Scan a codebase for LLM model usage and recommend tier, task-fit, and cost optimizations. General-purpose -- works on any project using Anthropic, Google, OpenAI, or open-source models.

## When to use

- You want to check if your codebase is using the right model tier for each task
- A new model generation dropped and you want to see if you can tier-down
- You suspect you're overspending on tokens for simple tasks
- You want to audit which models and providers are in use across a project
- Quarterly model hygiene review

## Usage

```
/model-audit                              # Guided interview mode (recommended)
/model-audit --tier                       # Tier check only
/model-audit --task-fit                   # Task-fit check only
/model-audit --cost                       # Cost/accuracy analysis only
/model-audit --tier --task-fit --cost     # Full audit (all checks)
/model-audit --recent                     # Repeat last run with same choices
/model-audit --path ./src                 # Scan specific directory
/model-audit --check-docs                    # Update registry from current API docs
/model-audit --tier --path ~/other-project  # Combine flags
```

## Instructions

When the user invokes `/model-audit`, follow this procedure exactly.

### Step 0: Load and validate the model registry

Read the model registry data file:
```
/home/user/projects/model-audit/model_registry.json
```

Check the `_meta.last_updated` field against today's date.

**First-run detection:** Check if `~/.claude/model-audit-preferences.json` exists.

**If preferences file does NOT exist (first run on this system):**

This is the first audit. The registry may be stale or incomplete. Before trusting it for recommendations, verify it against current API documentation.

```
FIRST RUN DETECTED -- Registry verification required.

The model registry has never been validated on this system.
Running /chub to verify current model names and pricing before auditing.
This ensures recommendations are based on real, current API data.

Verifying providers...
```

Automatically invoke `/chub` (or use WebSearch if /chub is unavailable) to check the current model pages for Anthropic, Google, OpenAI, and DeepInfra. For each provider:
1. Verify that every model ID in the registry still exists
2. Check for new models not yet in the registry
3. Verify pricing if cost data is present

Update `model_registry.json` with any corrections, then set `_meta.last_updated` to today. After verification, continue to Step 1.

**If preferences file EXISTS (returning run):**

Check `_meta.last_updated`. If older than 90 days:

```
NOTE: The model registry was last updated on {date} ({N} days ago).
Model lineups may have changed since then.

[1] Continue with current registry
[2] Update registry first via /chub (adds time + tokens)

Select: ___
```

If the user picks [2], run the same /chub verification as the first-run path above. Otherwise continue.

If 90 days or fewer, proceed to Step 1.

### Step 1: Determine scan target

If `--path` was provided, use that directory. Otherwise use the current working directory.

Tell the user what you're doing:

```
Scanning your codebase for LLM integrations...
Target: {path}
```

### Step 2: Scan for LLM integration points

Search the target directory for LLM usage using **direct Grep calls** (NOT an Explore agent). The detection patterns are fully specified in `model_registry.json` -- no discovery needed.

Run these 4 Grep calls in parallel. Use `output_mode: "content"` with `-n` for line numbers and `-C 2` for surrounding context. Set `path` to the scan target directory.

**Grep 1 -- SDK imports** (code files only):
```
pattern: "from anthropic|import anthropic|@anthropic-ai/sdk|from openai|import openai|google\\.generativeai|genai\\.configure|@google/generative-ai|from litellm|import litellm|litellm\\.completion|from langchain|ChatOpenAI|ChatAnthropic|ChatGoogleGenerativeAI|import ollama|from ollama|ollama\\.chat"
glob: "*.{py,ts,js,jsx,tsx}"
```

**Grep 2 -- Model ID strings** (all source + config files):
```
pattern: "claude-opus-[0-9]|claude-sonnet-[0-9]|claude-haiku-[0-9]|claude-[0-9]|gpt-5[.0-9]|gpt-4[o0-9.-]|o[1-4]-|gemini-[0-9]|meta-llama/|nvidia/|mistralai/|deepseek-ai/|Qwen/"
glob: "*.{py,ts,js,jsx,tsx,yaml,yml,json,toml,env,cfg,ini}"
```

**Grep 3 -- Config keys** (config files only):
```
pattern: "(model|model_name|model_id|llm_model|ai_model|chat_model|embedding_model)\\s*[:=]"
glob: "*.{yaml,yml,json,toml,env,cfg,ini,py,ts}"
```

**Grep 4 -- API key env vars** (all files):
```
pattern: "ANTHROPIC_API_KEY|OPENAI_API_KEY|GOOGLE_API_KEY|GEMINI_API_KEY|DEEPINFRA_API_KEY|TOGETHER_API_KEY|OPENROUTER_API_KEY|OLLAMA_HOST"
glob: "*.{py,ts,js,jsx,tsx,yaml,yml,json,toml,env,cfg,ini,sh,bash}"
```

All 4 greps automatically skip `.git/` directories. Results from `node_modules`, `venv`, `.venv`, `__pycache__`, `dist`, `build`, `.next`, `target`, `.tox`, and `site-packages` paths should be filtered out when processing results (discard any match whose path contains these directory names).

After all 4 greps return, merge and deduplicate by file:line. For each integration point, record:
- File path and line number
- Model ID (exact string found, extracted from the matching line)
- Provider (detected from model ID prefix or SDK import)
- Tier (looked up from registry)
- Surrounding context (use the `-C 2` context lines from the grep output)

If any grep returns a large number of results (>50 matches), note this and focus analysis on unique model IDs rather than listing every occurrence.

**Do NOT use the Agent/Explore tool for this step.** The patterns are deterministic and fully specified -- direct Grep is faster and uses ~80% fewer tokens.

### Step 2b: Validate detected model names

Before presenting findings, validate every detected model string against the registry.

For each integration point, classify the model as:
- **VALID** -- exact match in `providers.{provider}.tiers.{tier}.models[]` AND not present in `legacy_models`
- **LEGACY** -- exact match in `providers.{provider}.tiers.{tier}.models[]` BUT also present in `legacy_models`. The model still works in the API but has been superseded by a newer model. These should always surface in checks.
- **STALE** -- resembles a known model family but doesn't match any current ID (e.g., `claude-opus-4-5` looks like Anthropic but isn't a real model ID)
- **UNKNOWN** -- no match and no resemblance to any registry entry

**For LEGACY models, flag them clearly:**

```
!! LEGACY MODEL: {file}:{line}
   Found:       {model_string}
   Provider:    {detected_provider}
   Status:      Still works in API but superseded
   Reason:      {legacy_models[model].reason}
   Replacement: {legacy_models[model].replacement}

   Recommended action: Update to {replacement} for current-gen performance and continued support.
```

LEGACY models are the second-highest priority finding. They won't cause immediate API errors, but they represent technical debt -- the provider has moved on and may deprecate them at any time. In all checks (Tier, Task Fit, Cost), LEGACY models must receive at minimum a `[LEGACY]` verdict, never `[OK]`.

**For STALE models, flag them immediately:**

```
!! STALE MODEL DETECTED: {file}:{line}
   Found:    {model_string}
   Provider: {detected_provider} (based on naming pattern)
   Status:   NOT a valid model ID -- likely outdated or mistyped

   Closest valid models in registry:
     - {closest_match_1} ({tier})
     - {closest_match_2} ({tier})

   Action required: Update this model string before it causes API errors.
```

STALE models are the highest-priority finding in any audit. They represent code that is either already broken (API rejects the model ID) or silently falling back to a default model. Do NOT skip checks for stale models -- instead, run all selected checks against the closest valid model and note the stale name as an additional action item.

**For UNKNOWN models** (e.g., TTS-specific models, embedding models, or models from providers not in the registry): note them as informational and skip checks. These are expected edge cases.

After validation, include stale and legacy model counts in the findings header if any were found.

### Step 3: Present findings

Display what was found. If stale or legacy models were detected in Step 2b, show warnings before the main table:

```
!! STALE MODELS FOUND: {count} model string(s) do not match any current API model ID.
!! LEGACY MODELS FOUND: {count} model(s) still work but have been superseded.

Scan complete. Found {N} LLM integration points ({legacy_count} legacy, {stale_count} stale, {unknown_count} unknown):

  #  File                        Model                          Provider    Tier       Status
  1  src/agent.py:42             claude-sonnet-4-6              Anthropic   Balanced   VALID
  2  src/scorer.py:18            gpt-4.1                        OpenAI      Balanced   !! LEGACY
  3  config/models.yaml:7        gemini-2.0-flash               Google      Fast       !! LEGACY
  4  src/router.py:91            nvidia/Nemotron-3-Super...     DeepInfra   Balanced   VALID
  5  src/ads.py:33               claude-opus-4-5                Anthropic   ???        !! STALE
```

If zero integration points found:

```
No LLM integrations detected in {path}.

This could mean:
- The project doesn't use LLM APIs directly
- Model references are in a location not scanned (check --path)
- The SDK or model pattern isn't in the registry yet

Nothing to audit. Exiting.
```

### Step 4: Interview (guided mode) or proceed (flag mode)

**If `--check-docs` was provided**: skip directly to registry verification (same process as the first-run path in Step 0). Use `/chub` or WebSearch to check current model pages for Anthropic, Google, OpenAI, and DeepInfra. Verify every model ID in the registry still exists, check for new models not yet in the registry, and verify pricing if cost data is present. Update `model_registry.json` with any corrections, set `_meta.last_updated` to today. After verification, if other check flags were also provided (--tier, --task-fit, --cost), continue to Step 5 with the updated registry. If `--check-docs` was the only flag, display the verification results and exit -- no codebase scan needed.

**If other flags were provided** (--tier, --task-fit, --cost): skip the interview, run those checks.

**If --recent was provided**: load choices from `~/.claude/model-audit-preferences.json` and run with those settings. If no preferences file exists, fall through to the interview.

**Otherwise, present the interview:**

```
What would you like to check?

  [1] Tier Check      -- Are you using the right weight class within each provider?
  [2] Task Fit        -- Is the right model assigned to each job?
  [3] Cost/Accuracy   -- Is the token spend justified for each usage?
  [4] Full Audit      -- Run all checks
  [5] Run with recent choices ({last_checks}, {days_ago} days ago)
  [6] Check Docs      -- Update registry from current API documentation

Select (1-6): ___
```

Option [5] only appears if preferences file exists.

**If the user selects [6]:** Run the registry verification process (same as the first-run path in Step 0). Use `/chub` or WebSearch to check current model pages for all providers. For each provider:
1. Verify that every model ID in the registry still exists
2. Check for new models not yet in the registry
3. Verify pricing if cost data is present
4. Move any newly deprecated models into `legacy_models`

Update `model_registry.json` with corrections and set `_meta.last_updated` to today. Display a summary of what changed:

```
Registry verification complete.

  Provider     Models Verified  Added  Removed  Price Updates
  Anthropic    {n}              {n}    {n}      {n}
  Google       {n}              {n}    {n}      {n}
  OpenAI       {n}              {n}    {n}      {n}
  DeepInfra    {n}              {n}    {n}      {n}

Registry updated: _meta.last_updated = {today}
```

After displaying results, ask whether the user wants to continue with an audit check or exit:

```
Registry is now current. Continue with an audit?
  [1] Yes -- select checks to run
  [2] No  -- done for now

Select: ___
```

If [1], loop back to the interview (minus option [6] since docs are now fresh). If [2], exit.

Save the user's choices to `~/.claude/model-audit-preferences.json`:
```json
{
  "last_run": "2026-04-04T10:30:00",
  "last_path": "/path/scanned",
  "last_checks": ["tier", "task_fit", "cost"],
  "staleness_last_checked": "2026-04-04"
}
```

### Step 5: Run selected checks

For each integration point found in Step 2, run the selected checks.

**Deduplication:** When multiple files reference the same model for the same logical purpose (e.g., a config.py default and the code that reads it), deduplicate into a single check entry. When deduplicating, always show the count reconciliation at the top of the check output:

```
{N} raw integration points deduplicated to {M} unique usages for analysis.
(Deduped: config defaults echoed in code, test assertions, reference-only mappings)
```

The raw count (Step 3 table) and deduped count (Step 5 analysis) must both be visible so the user can reconcile them.

---

#### CHECK: Tier (--tier)

For each integration point, determine if the model tier is appropriate for the task complexity.

**How to assess task complexity from context:**
- Read the surrounding code (the function the model call lives in, the prompt being sent, variable names, comments)
- Look for prompt patterns that indicate task type (see `task_profiles` in registry)
- Consider the output format expected (JSON extraction = simpler, free-form reasoning = complex)

**Tier recommendation logic:**

| Detected Task Complexity | Current Tier | Recommendation |
|--------------------------|-------------|----------------|
| Simple (classification, extraction, routing) | Frontier | DOWNGRADE -- Fast tier handles this |
| Simple | Balanced | DOWNGRADE -- Fast tier handles this |
| Simple | Fast | CORRECT |
| Moderate (code gen, summarization, copy) | Frontier | DOWNGRADE -- Balanced tier handles this |
| Moderate | Balanced | CORRECT |
| Moderate | Fast | UPGRADE -- Quality may suffer |
| Complex (reasoning, planning, architecture) | Frontier | CORRECT |
| Complex | Balanced | REVIEW -- May benefit from Frontier |
| Complex | Fast | UPGRADE -- Task likely needs Balanced or Frontier |

**Output format per integration point:**

```
## Tier Check: src/agent.py:42

Model: claude-sonnet-4-20250514 (Anthropic, Balanced)
Detected task: Classification/routing
  Evidence: prompt contains "classify", output parsed as JSON, short prompt (<200 tokens)

Recommendation: DOWNGRADE to Haiku
  Reason: Task is simple classification with structured output.
  Haiku handles this reliably at ~3.75x lower cost.
  Same provider (Anthropic), drop-in tier change.
```

Use these indicators for CORRECT, DOWNGRADE, UPGRADE, REVIEW, LEGACY:
- `[OK]` -- Tier matches task complexity AND model is current (not legacy)
- `[DOWN]` -- Overpowered model for the task, recommend cheaper tier
- `[UP]` -- Underpowered model, quality likely suffering
- `[REVIEW]` -- Borderline, user should evaluate based on their quality bar
- `[LEGACY]` -- Model is in the `legacy_models` registry. Even if the tier matches the task, the model should be updated to its replacement. Always append the replacement model name: `[LEGACY -> {replacement}]`

**LEGACY always takes precedence over [OK].** A model cannot be `[OK]` if it appears in `legacy_models`. If the tier is correct but the model is legacy, the verdict is `[LEGACY]` with a note that the tier is fine but the model ID needs updating. If the tier is also wrong, combine: `[LEGACY + DOWN]`.

---

#### CHECK: Task Fit (--task-fit)

For each integration point, determine if the model is well-suited to the task domain, comparing across providers.

**How to assess:**
- Identify the task category from the `task_profiles` in the registry
- Look up the `provider_strengths` scores for that task
- Compare the current provider's strength to the best-in-class for that task

**Recommendation logic:**
- Current provider is best-in-class or within 1 point: `[GOOD FIT]`
- Another provider is 2+ points stronger: `[BETTER OPTION]` -- name the alternative
- Current provider scores below 7 for the task: `[WEAK FIT]` -- the model may not excel here

**Output format:**

```
## Task Fit: src/scorer.py:18

Model: gpt-4.1 (OpenAI, Balanced)
Detected task: Code Review & QA
  Evidence: function name "review_code", prompt contains "find bugs", "security check"

Current provider strength: OpenAI = 8/10 for Code Review
Best-in-class: Anthropic = 9/10

Recommendation: [GOOD FIT]
  OpenAI is strong here (8/10). Anthropic edges it slightly (9/10)
  but the delta is marginal. No change needed unless you're already
  using Anthropic elsewhere and want consolidation.
```

IMPORTANT: Task-fit is cross-provider analysis. This is where you compare Anthropic vs Google vs OpenAI vs open-source for a given task. This is different from Tier Check which stays within a single provider's lineup.

---

#### CHECK: Cost/Accuracy (--cost)

For each integration point, estimate the cost impact and whether a cheaper alternative would maintain acceptable quality.

**How to assess:**
- Look up the model's per-million-token rates from `cost_rates_per_million_tokens` in the registry
- Estimate typical token usage from the prompt size and expected output length visible in the code
- Compare cost between current tier and the next tier down

**Output format:**

```
## Cost Analysis: src/agent.py:42

Model: claude-sonnet-4-20250514 (Anthropic, Balanced)
Rates: $3.00/M input, $15.00/M output

Estimated per-call cost: ~$0.0045 (based on ~500 input, ~200 output tokens)

Tier-down option: claude-haiku-4-20250414
  Rates: $0.80/M input, $4.00/M output
  Estimated per-call cost: ~$0.0012
  Savings: ~73% per call

Quality impact assessment:
  Task detected: Classification/routing
  Expected quality delta: Minimal -- Haiku handles classification reliably
  Risk: Low -- structured output tasks are tier-resilient

Token budget recommendation: SWITCH to Haiku
  If this runs 1,000x/month: saves ~$3.30/month
  If this runs 10,000x/month: saves ~$33.00/month
```

If cost rates aren't available for a model, say so clearly:

```
Cost data unavailable for {model}.
Add rates to model_registry.json or set MODEL_AUDIT_COST_RATES_JSON env var.
```

---

### Step 6: Summary

After all checks complete, present a summary table:

```
=================================================================
MODEL AUDIT SUMMARY
=================================================================
Scanned: /home/user/my-project
Date: 2026-04-04
Checks: Tier, Task Fit, Cost

  #  File                  Model              Tier    Task-Fit  Cost
  1  src/agent.py:42       claude-sonnet-4    [DOWN]  [GOOD]    SWITCH
  2  src/scorer.py:18      gpt-4.1            [OK]    [GOOD]    KEEP
  3  config/models.yaml:7  gemini-2.0-flash   [OK]    [GOOD]    KEEP
  4  src/router.py:91      Nemotron-3         [OK]    [BETTER]  KEEP

Actions recommended: 2
  - src/agent.py:42: Downgrade claude-sonnet-4 to claude-haiku-4 (classification task)
  - src/router.py:91: Consider Anthropic or OpenAI for code review (currently open-source)

Estimated monthly savings if all recommendations applied: ~$3.30/mo (at 1,000 calls/endpoint)
=================================================================
```

### Step 7: Vault save option

After displaying results, check for second-brain/vault installations.

Search for these markers in the user's home directory:
- `.obsidian/` directory (Obsidian)
- `logseq/` directory with config (Logseq)
- `dendron.yml` file (Dendron)
- `.vscode/foam.json` file (Foam)
- `.silverbullet/` directory (Silverbullet)

Check the paths listed in `second_brain_markers` in the registry, plus the current working directory's parent paths.

If a vault is detected:

```
Detected: {system} vault at {path}

Save audit results to vault?
  [1] Terminal only (already displayed above)
  [2] Also save to vault ({path}/{output_subdir}/model-audit-{date}.md)
  [3] Save to vault only

Select (1-3): ___
```

If the user chooses [2] or [3], write the results as a clean markdown file with frontmatter:

```markdown
---
title: "Model Audit: {project_name}"
date: {YYYY-MM-DD}
tags:
  - model-audit
  - llm-ops
---

# Model Audit: {project_name}

Scanned: {path}
Date: {date}
Checks: {checks_run}

{full results from Steps 5 and 6}
```

Create the output subdirectory if it doesn't exist. Use the subdirectory name from the `second_brain_markers` config for the detected system.

If no vault is detected, skip this step silently -- don't mention it.

### Important rules

- **NEVER change model names or code.** This skill is read-only analysis. It recommends -- the user decides and makes changes.
- **NEVER hallucinate model names.** Only reference models that exist in model_registry.json.
- **NEVER silently skip stale models.** If a detected model string resembles a known provider's naming pattern but doesn't match any registry entry, it is STALE -- flag it loudly with `!! STALE MODEL DETECTED` per Step 2b. Stale models are the #1 priority finding because they represent broken or silently-degraded API calls. Only truly UNKNOWN models (different provider, specialized purpose like TTS/embedding) should be noted as informational.
- **NEVER mark a legacy model as [OK].** If a model appears in the `legacy_models` section of the registry, it must receive `[LEGACY]` as its verdict in every check, even if the tier matches the task. A legacy model that passes tier check gets `[LEGACY -> {replacement}]`, not `[OK]`. This applies across all checks: Tier, Task Fit, and Cost.
- **NEVER compare tiers cross-provider in the Tier Check.** Tier Check is within-provider only (Opus vs Sonnet vs Haiku). Cross-provider comparison belongs in Task Fit.
- **Be honest about uncertainty.** If you can't determine the task type from context, say so and flag it as `[REVIEW]` instead of guessing.
- **Keep output scannable.** Users read this on terminals of varying widths. Use the table formats shown above. Avoid paragraphs in the summary.
- **Respect the registry.** All model data, tier classifications, task strengths, and pricing come from model_registry.json. Do not substitute your own knowledge of model capabilities -- the registry is the source of truth so that it can be updated independently.
