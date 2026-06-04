---
name: compute-availability-tracker
description: Poll the status pages of major AI providers (Anthropic, OpenAI, Google, OpenRouter) and produce a current availability table with routing recommendations. Use when a model call is failing, before routing important work, or on a schedule to detect degradation early.
---

# Compute Availability Tracker

Fetches the public status pages of AI providers, reads current incident state, and returns a routing table that tells you which providers are healthy and which are degraded right now. When a lab is down, it recommends a fallback.

## Trigger

Use when the user says "/compute-availability-tracker", "which models are up", "check AI status", "is OpenAI down", "why is my API failing", "check provider health", "route around outages", or before dispatching work to an AI model and wanting to confirm the provider is healthy.

## Phase 1: Identify Providers to Check

Default provider list (check all unless the user specifies a subset):

| Provider | Status page URL |
|----------|----------------|
| Anthropic (Claude) | https://status.anthropic.com |
| OpenAI (GPT, Codex) | https://status.openai.com |
| Google (Gemini) | https://status.cloud.google.com |
| OpenRouter | https://status.openrouter.ai |

If the user specifies additional providers, add them. If the user says "just check X", restrict to that provider.

## Phase 2: Fetch Status Pages

For each provider, fetch the status page using WebFetch. Extract:

1. **Overall status** -- the top-level banner (e.g., "All Systems Operational", "Partial Outage", "Major Outage").
2. **Affected components** -- which specific APIs or services are impacted.
3. **Active incidents** -- title and summary of any open incidents.
4. **Last updated** -- the timestamp on the most recent status update.

If a status page is unreachable (timeout, DNS failure, HTTP error), record that provider as **UNKNOWN** and note it may be experiencing a complete outage or the status page itself is down.

## Phase 3: Build the Availability Table

```
=================================================================
AI PROVIDER AVAILABILITY
=================================================================
Checked:   {timestamp}

Provider       | Status         | Affected Services    | Incident Summary
---------------|----------------|----------------------|----------------
Anthropic      | {status}       | {services or none}   | {summary or none}
OpenAI         | {status}       | {services or none}   | {summary or none}
Google Gemini  | {status}       | {services or none}   | {summary or none}
OpenRouter     | {status}       | {services or none}   | {summary or none}

Status key:
  HEALTHY    All systems operational, no open incidents
  DEGRADED   One or more components affected, partial service
  DOWN       Major outage or API completely unavailable
  UNKNOWN    Status page unreachable -- treat as potentially down
=================================================================
```

## Phase 4: Routing Recommendations

For each provider that is not HEALTHY, produce a specific routing recommendation:

### Anthropic degraded or down

- If Claude API is impacted: route to OpenAI GPT or Google Gemini for non-sensitive work.
- If only a specific feature (e.g., streaming, files API) is affected: check if non-streaming or direct API calls are still functional before rerouting.
- Note: Claude Code sessions may continue working even if the API is partially degraded -- Claude Code has retry logic.

### OpenAI degraded or down

- If GPT-4o or Codex is impacted: route to Claude for reasoning tasks, Gemini for long-context or multimodal tasks.
- Check whether the Assistants API vs. the completions API are separately affected -- they have independent status.

### Google Gemini degraded or down

- Route to Anthropic Claude for long-context tasks.
- Route to OpenAI for tool-use and structured output tasks.

### OpenRouter degraded or down

- OpenRouter is a routing layer, not a model provider. If OpenRouter is down, call model providers directly using their native APIs.
- Check whether the specific underlying model (accessed via OpenRouter) is separately healthy.

## Phase 5: Scheduled Use (Optional)

If the user wants to run this on a schedule (e.g., every 30 minutes during a work session, or once daily):

- Use the system's task scheduler (cron, a scheduled agent, or a background watcher) to call this skill on the configured interval.
- Pipe output to a log file at a path the user configures.
- On state change (HEALTHY to DEGRADED or back), send a notification via whatever notification channel is available.

Example cron suggestion (user adjusts interval and log path as needed):
```
# Check AI provider status every 30 minutes, log to user-configured path
*/30 * * * * <invoke this skill> >> /path/of/your/choice/ai-status.log 2>&1
```

## What This Does NOT Do

- Does not make live API test calls to verify model response quality -- only reads public status pages.
- Does not guarantee that a "HEALTHY" status means your specific API key has no quota or access issues.
- Does not persist history -- each invocation is a fresh snapshot. For trend analysis, pipe output to a log file and review it manually.
- Does not automatically reroute your code -- it produces recommendations, not automatic failover.

## Source Attribution

Technique derived from Nate Kadlac newsletter (2026-04-28): "ChatGPT 5.5 scored 87 where the next best model scored 67. Here's what that gap looks like in real work." Nate's Compute Availability Tracker concept (Prompt 5 context: routing by availability) addresses the failure mode where AI work is queued to a degraded provider without awareness of outages.
