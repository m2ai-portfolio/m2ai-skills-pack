---
name: provider-availability-scout
description: Scheduled task that probes model provider availability, pricing changes, restriction announcements, and API deprecations across configured providers (Anthropic, OpenAI, Google, OpenRouter, etc.). Diffs against last run and optionally updates a routing defaults file so your model routing layer stays current without manual tracking.
---

# Provider Availability Scout

A scheduled scouting task for operators who route work across multiple model providers. Provider conditions change faster than most teams track manually: pricing adjusts, rate limits tighten, subscription bundles shift, APIs deprecate, and regional restrictions appear. This skill probes the landscape on a cadence and produces a structured diff -- so your routing defaults reflect current reality, not stale assumptions.

## Trigger

Use when the user says "provider availability scout", "provider scout", "check model availability", "what changed with providers this week", "scout providers", or when invoked as a scheduled task.

Also suitable as a weekly scheduled task (recommended: Monday morning before dispatching work).

## Phase 1: Load State

Read the previous run's state from `${SCOUT_STATE_PATH:-./.provider-scout}/state.json`.

If no state file exists, this is a first run -- initialize with empty provider records and note "first run, no diff available."

The state file schema:
```json
{
  "last_run": "<ISO-8601>",
  "providers": {
    "<provider-name>": {
      "last_known_models": ["<model-id>"],
      "last_known_pricing": "<free-text snapshot>",
      "last_known_restrictions": "<free-text snapshot>",
      "last_known_status": "available | degraded | restricted | unknown",
      "notes": "<free-text>",
      "checked_at": "<ISO-8601>"
    }
  }
}
```

## Phase 2: Configure Provider List

Load provider list from `${SCOUT_CONFIG_PATH:-./.provider-scout}/providers.json` if it exists. Default list if not configured:

```json
["anthropic", "openai", "google", "openrouter", "mistral"]
```

On first run, present the default list and ask the user to confirm or modify before proceeding.

## Phase 3: Probe Each Provider

For each provider, search for recent developments (since `last_run`, defaulting to 7 days):

**Search queries per provider (adapt to actual provider name):**
1. `"<provider> API pricing change <month/year>"`
2. `"<provider> model availability deprecation <month/year>"`
3. `"<provider> API restrictions usage policy <month/year>"`
4. `"<provider> status incident outage <month/year>"`
5. `"<provider> new model release <month/year>"`

For each provider, collect:

| Field | What to extract |
|-------|----------------|
| `current_models` | List of available model IDs mentioned in recent announcements |
| `pricing_changes` | Any pricing adjustments, new tiers, or free-tier limit changes |
| `restrictions` | Usage policy changes, subscription requirements, rate limit adjustments |
| `status_events` | Outages, degraded performance, regional restrictions |
| `deprecations` | Models being sunset or API versions reaching end-of-life |
| `new_releases` | New models or significant capability updates |

If no results found for a provider, record `"status": "no_changes_detected"` and move on.

## Phase 4: Compute the Diff

Compare current observations against the state file:

```
PROVIDER DIFF: <provider>
  + NEW MODEL: <model-id> (added since last run)
  - DEPRECATED: <model-id> (scheduled for removal)
  ~ PRICING CHANGE: <summary>
  ! RESTRICTION: <summary>
  ~ STATUS: <summary>
  [no change]
```

Classify each diff item by severity:

| Severity | Trigger |
|----------|---------|
| `critical` | Model currently in use is deprecated or restricted |
| `high` | Pricing change that affects cost by >20%, or new restriction on a default model |
| `medium` | New model available that could improve routing; pricing change <20% |
| `low` | Minor capability update; status incident resolved |

## Phase 5: Routing Config Update (Optional)

If a routing defaults file exists at `${ROUTING_CONFIG_PATH:-./.provider-scout}/routing-defaults.json`, and any `critical` or `high` diffs were found:

1. Propose specific updates to routing defaults (do NOT auto-apply)
2. Show before/after for each proposed change
3. Wait for user confirmation before writing

If no routing config exists, skip this phase and note that one can be created manually.

## Phase 6: Output and Persist

### Output Format

```markdown
# Provider Scout Run: <date-range>

## Summary
- Providers checked: N
- Critical changes: N
- High changes: N
- Medium changes: N
- No changes: N

## Critical / High Changes (action required)
### <Provider>
<diff items>

## Medium Changes (monitor)
### <Provider>
<diff items>

## No Changes
<comma-separated provider list>

## Routing Config Recommendations
<proposed changes, or "none">
```

### Persist State

Write updated state to `${SCOUT_STATE_PATH:-./.provider-scout}/state.json` with `last_run` set to the current timestamp and all provider records updated.

Save run output to `${SCOUT_STATE_PATH:-./.provider-scout}/history/<date>.md`.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SCOUT_STATE_PATH` | `./.provider-scout` | Directory for state and history files |
| `SCOUT_CONFIG_PATH` | `./.provider-scout` | Directory for provider list and routing config |
| `ROUTING_CONFIG_PATH` | `./.provider-scout` | Path to the routing defaults file (optional) |
| `SCOUT_LOOKBACK_DAYS` | `7` | Days to look back when searching for changes |

## Verification

- [ ] All configured providers were probed (no silent skips)
- [ ] Diff ran against previous state (or "first run" was noted)
- [ ] Severity classification applied to all changes
- [ ] Critical/high changes are highlighted prominently in output
- [ ] Routing config changes were proposed, not auto-applied
- [ ] State file written with updated `last_run` timestamp

## Notes

- Search quality degrades for providers with limited public-facing documentation. If a provider has a status page or changelog, prefer fetching that directly over general web search.
- This skill probes public announcements and status pages only. It does not authenticate to provider APIs to check quota or billing state. For quota monitoring, use provider-specific tooling.
- The routing defaults file is intentionally separate from any routing runtime. This skill proposes updates; a human or a deployer applies them.
- Run weekly at minimum. Model provider conditions can shift within days of a major announcement.

## Source Attribution

Nate's Newsletter -- 2026-05-07
Post: "OpenClaw, Anthropic, and Gemma 4 just redefined what 'agent framework' means. You need to pick a side."
Idea #18: Weekly Model-Availability Scout (scheduled task)
https://natesnewsletter.substack.com/p/openclaw-agent-runtime-model-swapping

Core insight: model provider conditions change faster than teams track manually. A scheduled scout that diffs provider state week-over-week keeps routing defaults aligned with reality, especially critical for multi-provider agent runtimes where a deprecated default model causes silent degradation.
