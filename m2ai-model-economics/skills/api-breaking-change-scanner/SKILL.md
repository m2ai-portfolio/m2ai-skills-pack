---
name: api-breaking-change-scanner
description: Scans a codebase for deprecated API parameters and patterns that break silently or return 400 errors when migrating to a new model version, reporting exact file/line locations and migration actions.
---

# API Breaking Change Scanner

Before upgrading to a new model version, scan the codebase for deprecated API parameters. These cause 400 errors (hard failures) or silent behavior changes (worse — they pass but produce wrong results). Catches what manual review misses across large codebases.

## Trigger

Use when the user says "migrating to a new model", "upgrade the API version", "deprecated parameters", "check before migration", "what will break when I upgrade", or "pre-migration scan".

## Phase 1: Identify Target Migration

Ask:
1. **From version** — current model/API version (e.g., Claude Sonnet 4.6, GPT-4o)
2. **To version** — target version (e.g., Claude Opus 4.7, GPT-4.1)
3. **Codebase root** — top-level directory to scan (default: `.`)
4. **File types** — which extensions to include (default: `.py`, `.ts`, `.js`, `.yaml`, `.json`, `.md`)

## Phase 2: Deprecation Inventory

Compile the known deprecated items for the target migration. Present to the user for confirmation and additions before scanning. Do not invent deprecations from training data — ask the user to verify against official release notes.

Example format (Claude 4.6 → 4.7):

| Parameter / Pattern | Change Type | Action Required |
|---------------------|-------------|-----------------|
| `temperature` | Removed — returns 400 | Delete from all API calls |
| `top_p` | Removed — returns 400 | Delete from all API calls |
| `top_k` | Removed — returns 400 | Delete from all API calls |
| `thinking.budget_tokens` | Semantics changed | Verify value against new valid range |
| `max_tokens_to_sample` | Legacy alias | Rename to `max_tokens` |

Ask the user: "Are there additional deprecated parameters or patterns for this migration that I should include?"

## Phase 3: Codebase Scan

For each deprecated item in the inventory, search the codebase using Grep:
- Match the parameter name in API call contexts
- Collect: file path, line number, 3 lines of surrounding context
- Distinguish hard failures (400 errors) from behavioral warnings
- Group results by deprecated item

Scan each file type specified in Phase 1. Exclude test fixtures and vendor directories unless explicitly included.

## Phase 4: Report

```
## API Breaking Change Scan: [from version] → [to version]

### Summary
- Files scanned: N
- Hard failures (will return 400): N occurrences across N files
- Warnings (behavior changes, silent): N occurrences across N files

---

### Hard Failures (will return 400 if not removed)

#### `temperature`
- `src/llm/client.py:42` — `temperature=0.7` in `call_claude()`
- `config/agents.yaml:15` — `temperature: 0.3`

#### `top_p`
- `src/agents/researcher.py:88` — `top_p=0.9`

---

### Warnings (behavior changes, will not error but may degrade)

#### `thinking.budget_tokens`
- `src/agents/planner.py:23` — verify value `8192` is within new valid range

---

### Migration Actions

For each hard failure: delete the parameter. Removing it is safe — the new API uses fixed or internally managed defaults.

For each warning: review the documented behavior change and test against a staging call before deploying.

---

### Files with No Changes Needed
[list if requested]
```

## Phase 5: Optional Auto-Fix

If the user requests it, produce targeted edits to:
- Remove deleted parameters from API call sites
- Rename deprecated parameter names to their replacements
- Leave behavioral warnings for manual review

Present the list of intended edits and confirm with the user before applying any changes.

## Notes

- Always compile the deprecation inventory from official release notes or API changelogs — do not rely on training data for specific parameter names, which change between versions.
- Silent behavior changes are more dangerous than 400s because they pass without error but produce wrong results.
- For multi-provider codebases, run a separate scan per provider (Claude, OpenAI, Gemini each have independent deprecation schedules).
- Scan `.env` files and config YAMLs as well as source code — deprecated parameters often live in config, not code.

## Source

Extracted from Nate Kadlac newsletter (2026-04-21) — Opus 4.7 API change analysis: `temperature`, `top_p`, `top_k` removed (return 400 if present); `thinking.budget_tokens` semantics changed. Pre-migration scanning prevents production outages.
