---
name: inference-vendor-lock-in-scorer
description: Scan agent and skill manifests for AI vendor lock-in exposure -- hardcoded model names, non-portable API surfaces, absent fallback chains, opaque key management. Outputs a per-artifact lock-in score and a prioritized remediation queue. Use before a vendor migration or portability planning sprint.
---

# Inference Vendor Lock-In Scorer

Scans a skills directory and agent manifests for vendor lock-in signals, scores each artifact across four dimensions, and produces a prioritized remediation queue.

## Trigger

Use when the user says "/inference-vendor-lock-in-scorer", "score my vendor lock-in", "audit skill portability", "lock-in exposure scan", "portability audit for skills", or "which skills are hardcoded to a vendor".

## Phase 1: Intake

Collect (or infer from context):
1. **Scan path** -- directory containing skills or agent configs. Default: current working directory.
2. **Target vendor** -- which vendor to score lock-in against. Default: all detected vendors.

Announce what will be scanned:
```
Scanning: {path}
Target vendor: {vendor or "all detected"}
```

## Phase 2: Artifact Discovery

Find skill and agent artifact files:
- SKILL.md (skill definitions)
- skill-registry.yaml (per-skill metadata)
- agent.yaml / agent.config.json / AGENT.md (agent manifests)
- Any YAML/JSON/markdown with model name strings or API key references

Use the Grep tool (not Bash) to find model name patterns:

```
pattern: "claude-|gpt-4|gemini-|mistral-|llama-|deepseek-|qwen-"
glob: "**/*.{md,yaml,yml,json}"
output_mode: content
-n: true
-C: 2
```

Also grep for API key patterns:
```
pattern: "ANTHROPIC_API_KEY|OPENAI_API_KEY|GOOGLE_API_KEY|sk-[a-zA-Z0-9]"
glob: "**/*.{md,yaml,yml,json}"
output_mode: content
-n: true
```

Run both Grep calls in parallel.

## Phase 3: Per-Artifact Scoring

For each artifact, score four dimensions (0 = worst, 25 = best per dimension; max total = 100):

**Dimension 1 -- Model Name Configurability (25 pts)**
- 25: Model referenced via env var or config key only (no hardcoded string)
- 15: Model hardcoded but easily extractable to a config key
- 5: Multiple hardcoded model references spread across the skill
- 0: Model name embedded in logic that would break if changed

**Dimension 2 -- API Surface Portability (25 pts)**
- 25: Skill uses OpenAI-compatible interface or provider-agnostic abstraction
- 15: Provider-specific SDK in use but has a documented swap-out path
- 5: Skill depends on provider-specific features (e.g., extended thinking, function calling schema variants)
- 0: Non-portable by design -- tightly coupled to one provider's unique capability

**Dimension 3 -- Fallback Chain Presence (25 pts)**
- 25: Explicit fallback to an alternative model or provider on failure
- 15: Error handling present but no alternative provider
- 5: Bare API call with no error handling
- 0: No error handling; failure mode undefined

**Dimension 4 -- Key Management (25 pts)**
- 25: API keys via env vars only; no key literals anywhere in the artifact
- 15: Key via env var with a fallback that references the key name explicitly
- 5: Key name hardcoded in a config template the user must fill in
- 0: Key literal present in the file

**Total lock-in score** = sum of four dimensions. Interpret as:
- 80-100: Low lock-in -- portable with minor effort
- 50-79: Moderate lock-in -- some work to migrate
- 20-49: High lock-in -- significant migration effort required
- 0-19: Critical lock-in -- migration would require rewriting the artifact

## Phase 4: Report

```
=================================================================
INFERENCE VENDOR LOCK-IN SCORER
=================================================================
Date: {date}
Scan path: {path}
Artifacts scanned: {n}

PER-ARTIFACT SCORES

  Artifact                      | Score | Risk Level | Top Issue
  ------------------------------|-------|-----------|----------
  {name}                        |  {n}  | Low/Med/High/Critical | {dim with lowest score}

AGGREGATE SCORE: {weighted average} / 100
  {interpretation}

CRITICAL ARTIFACTS (score < 20):
  {list with top issue for each}

REMEDIATION QUEUE (ordered by highest leverage)
  1. {artifact}: {specific fix -- e.g., "replace hardcoded model-name with MODEL_NAME env var"}
  2. ...

VENDOR DISTRIBUTION
  {vendor}: {n} artifacts hardcoded to it
=================================================================
```

## Phase 5: Offer to Fix

After the report, offer:
- **"Apply safe fixes?"** -- only replaces unambiguous hardcoded model name strings with env var references. Always shows a diff before applying.
- **"Walk me through each critical artifact?"** -- steps through Critical items one at a time.

Do NOT auto-apply changes to API surface or fallback logic -- those require judgment calls about provider compatibility.

## What This Does NOT Do

- Does not evaluate whether alternative providers produce equivalent output quality.
- Does not scan runtime environment variables -- only file content.
- Does not modify files without explicit user confirmation.

## Source

Derived from Nate Kadlac newsletter (2026-04-26): "Executive Briefing: The AI cost curve your strategy is riding just broke." Operationalizes the harness-wars thesis at the artifact level -- quantifying vendor lock-in exposure across a skill and agent portfolio so the measurement layer exists before a migration becomes urgent.
