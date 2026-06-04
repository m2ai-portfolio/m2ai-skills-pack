---
name: scheduled-agent-harness
description: Define and document a complete scheduled-agent contract for any recurring automated task. Produces a standardized harness spec covering trigger config, memory folder, input contract, output destination, and failure alerts — ready to wire into Claude Code or any agent runner.
---

# Scheduled Agent Harness

Produces a complete, runnable harness specification for a scheduled agent. Prevents the most common failure mode in scheduled automation: building something that runs once, then silently breaks with no alert, no memory, and no recovery path.

## Trigger

Use when the user says "/scheduled-agent-harness", "set up a scheduled agent", "define the harness for this recurring task", "I need this to run every night", or when formalizing any agent that should run on a schedule rather than on demand.

## Phase 1: Intake

Collect from the user:

1. **Agent purpose** — what does this agent do in one sentence?
2. **Trigger type** — scheduled (cron) or event-driven (webhook, file arrival, API event)?
3. **Trigger schedule** — if cron: frequency (daily, weekly, hourly) and preferred time
4. **Inputs** — what data does the agent need at run time? Where does it come from?
5. **Outputs** — what does it produce? Where does it go?
6. **Memory requirements** — does this agent need to remember state between runs?
7. **Failure handling** — who or what should be notified when it fails?

Ask only for what's missing — infer reasonable defaults where possible.

## Phase 2: Derive the Harness Contract

Generate the 5-component harness contract:

### Component 1: Trigger Configuration

```yaml
trigger:
  type: cron | webhook | file-watch | event
  schedule: "0 7 * * *"          # if cron — standard cron expression
  timezone: UTC                    # always explicit
  endpoint: null                   # if webhook — the URL to register
  source: null                     # if file-watch — the path or bucket prefix
```

Include a human-readable gloss: "Runs at 07:00 UTC every day."

### Component 2: Input Contract

```yaml
inputs:
  - name: {input_name}
    type: string | json | file | env_var
    source: {where it comes from — file path, API endpoint, env var name, previous run output}
    required: true | false
    default: {value or null}
```

If the source is a file path, use `./` relative paths or environment variable references — never hardcode absolute paths.

### Component 3: Memory Folder

```yaml
memory:
  enabled: true | false
  path: ${AGENT_MEMORY_DIR:-./memory}/{agent-slug}/
  files:
    - name: last_run.json
      purpose: "Timestamps and run-level stats from the previous execution"
    - name: state.json
      purpose: "Persistent state the agent carries between runs"
    - name: seen_ids.txt
      purpose: "Dedup list — IDs already processed"
```

If memory is not needed, set `enabled: false` and omit the files list.

### Component 4: Output Destination

```yaml
outputs:
  - name: {output_name}
    type: file | api_call | notification | database
    destination: {path, endpoint, channel, or table — using env vars for dynamic values}
    format: markdown | json | plain_text | html
    on_empty: skip | write_placeholder | notify
```

### Component 5: Failure Handling

```yaml
failure:
  max_retries: 3
  retry_delay_seconds: 60
  alert_on_failure: true
  alert_channel: {env var or config key — e.g., $ALERT_WEBHOOK_URL}
  alert_message_template: |
    Agent: {agent-name}
    Run time: {timestamp}
    Error: {error_message}
    Last successful run: {last_run_timestamp from memory/last_run.json}
  on_persistent_failure: notify_and_halt
```

## Phase 3: Generate the Harness Spec Document

Produce a single markdown file the user can save as `harness.md` alongside their agent:

```markdown
# {Agent Name} — Harness Spec
Generated: {date}

## Purpose
{one-sentence description}

## Trigger
{Component 1 yaml block}
Human-readable: {gloss}

## Inputs
{Component 2 yaml block}

## Memory
{Component 3 yaml block}

## Outputs
{Component 4 yaml block}

## Failure Handling
{Component 5 yaml block}

## Smoke Test Checklist
- [ ] Run once manually with real inputs — confirm output reaches destination
- [ ] Run with missing input — confirm graceful failure and alert fires
- [ ] Run twice — confirm memory dedup prevents duplicate output
- [ ] Kill mid-run — confirm partial output is not silently published
- [ ] Check memory/last_run.json after a successful run — confirm timestamp updated

## Known Limitations
{List any inputs, failure modes, or edge cases the harness does not cover}
```

## Phase 4: Runtime Wiring Guidance

Based on the user's agent runner, provide the specific wiring step:

**Claude Code (cron job):**
```bash
# Add to crontab
cron_expression /path/to/runner.sh
# Or use the CronCreate tool if available in your session
```

**pm2 (process manager):**
```javascript
// In ecosystem.config.cjs
{
  name: '{agent-slug}',
  script: '{runner script}',
  cron_restart: '{cron expression}',
  watch: false,
  autorestart: false
}
```

**n8n / Make / Zapier:**
"Set the Schedule Trigger node with the cron expression above. Pass inputs as JSON payload to the agent's first step."

## Phase 5: Output

Deliver the harness spec as a fenced markdown block. Offer:
- "Save this as `harness.md` in the current directory?"
- "Generate the runner script skeleton too?"
- "Walk through the smoke test checklist together?"

## What This Does NOT Do

- Does not implement the agent logic. This specifies the harness around the agent, not what the agent does inside.
- Does not register the cron job or configure pm2. Those are execution steps — this produces the spec.
- Does not monitor runs or report on health after deployment. Use a separate monitoring tool for live run telemetry.

## Source

Pattern distilled from Nate Kadlac newsletter (2026-04-27): "Your team spends 5 hours a week on work a sales consultant automated in an afternoon." The Workspace Agents scheduled-run surface uses the same 5-component contract (trigger, inputs, memory, outputs, failure handling). This skill standardizes that pattern for Claude Code and open agent runtimes, making scheduled agents consistent and debuggable rather than ad-hoc.
