# M2AI Skills Pack

A curated Claude Code plugin containing 33 portable skills for strategy work, prompt engineering, model routing, agent auditing, build pipelines, and workflow tooling.

## Install

In Claude Code:

```
/plugin marketplace add m2ai-portfolio/m2ai-skills-pack
/plugin install m2ai-skills-pack@m2ai-skills-pack
```

Then restart Claude Code. Skills will appear in your skill list and auto-trigger based on their descriptions, or you can invoke them explicitly (e.g. `/model-router`, `/prompt-rewriter`).

## What's Included

### Strategy & Analysis
- **executive-briefing** — turn a complex event into a structured executive briefing
- **counterargument-stress-test** — generate and address the N strongest counterarguments to any thesis
- **geopolitical-signal-enricher** — add geopolitical context to market/tech signals
- **bitter-lesson-scorecard** — score agent designs against Sutton's Bitter Lesson
- **failure-postmortem** — structured AI system failure post-mortems
- **failure-asymmetry** — compare human vs agent invocation behavior of a skill
- **aar** — after-action review for agent dispatch runs: forensics, failure-mode classification, benchmarks, structured report
- **dark-code-audit** — scan a repo for modules where human comprehension has gone missing; tiered darkness score with drill-down TODOs

### Prompt & Model Engineering
- **model-router** — classify a task and pick Opus/Sonnet/Haiku with cost delta
- **prompt-rewriter** — rewrite system prompts stripping compensating complexity
- **compensating-complexity-auditor** — find scaffolding built around old model limits
- **optimize-description** — rewrite skill descriptions for discoverability
- **spec-gap-detector** — stress-test agent specs for ambiguity and missing constraints

### Agent & Skill Tooling
- **agent-cost-model** — model per-task costs, monthly burn, routing savings
- **token-burn-auditor** — measure session startup overhead and system prompt bloat
- **boot-tax-monitor** — alert when session startup tokens exceed a threshold
- **skill-audit** — surface candidates for new skills from conversation patterns
- **skill-maintenance** — audit skills for quality against Anthropic best practices
- **context-hygiene** — reference for `/by-the-way`, `/fork`, `context:fork`
- **context-fork-guide** — add `context:fork` to heavy-research skills

### Build Pipelines
- **self-healing-pipeline** — three-agent Planner/Builder/Judge loop with spec-claim extraction, adversarial-input synthesis, and auto-retry up to 3 times before escalating; file-based state survives session interrupts
- **self-healing-claudex** — Planner/Builder + Codex adversarial review loop; each round wears a different reviewer persona (engineer/security/ops); converges when Codex agrees or max rounds reached
- **diagnose** — strict 4-gate diagnostic protocol: state the error, gather evidence, rank 3 hypotheses, get approval before any code edit

### Planning & Session Management
- **sparring-planner** — adversarial planning mode that challenges assumptions, asks deep multi-option questions, and explores competing approaches before converging on a plan
- **next** — generate a continuation prompt and handoff document for a fresh session; lists completed work, current state, and remaining tasks
- **tldr** — save a conversation summary to an Obsidian vault with auto-filed daily notes, wiki log entries, and topic cross-references

### Workflow
- **gh-review** — review GitHub repos against current project, generate HTML report
- **get-api-docs** — fetch API docs via Context Hub (`/chub`) to verify model names
- **file-intel** — Gemini-powered extraction/summary for PDF/PPTX/XLSX/DOCX/CSV folders
- **banana-maker** — Gemini image generation via Nano Banana Pro prompting
- **what-am-i-forgetting** — consolidated agenda recall across memory index, roadmaps, open-item queues, daily notes, crons, and project folders
- **gemini-rescue** — get a second opinion from Google Gemini via one-shot review or agentic dispatch; use when Claude is stuck or for 1M-context audits
- **silver-platter** — interview a business owner, build a tailored data map, render Pantry/Prep/Plate visualization, generate a 30-day build plan and Claude Code recommendations

### Video & Media Prompting
- **seedance-prompt** — Master AI Video Prompt Engineer for Seedance 2.0; structures multi-shot timelines (0-14s) using the FRAMES framework (Frame, Reaction, Audio, Mood, Edit Plan, Shot)
- **seedance-shot-prompt** — generate Seedance 2 prompts for linear A→B forward-motion shots (transitions, chases, reveals); includes 3-stage smoke-test protocol for identity-bound shots and 8-mode failure taxonomy

## Configuration

Some skills expect environment variables for user-specific paths. If unset,
each skill falls back gracefully and flags the missing source in its output.

| Variable | Used by | Purpose |
|---|---|---|
| `$PROJECTS_DIR` | `what-am-i-forgetting` | Root of your code projects (e.g. `~/projects`) |
| `$VAULT_DIR` | `what-am-i-forgetting`, `aar` | Notes vault for daily notes and saved reports |
| `$MEMORY_INDEX` | `what-am-i-forgetting` | Path to your memory-index file |
| `$MEMORY_DIR` | `what-am-i-forgetting` | Directory containing memory files |
| `$ORCHESTRATOR_DB` | `aar` | SQLite DB holding agent mission/task state |
| `$OPEN_ITEMS_JSON` | `aar` | Queue file for action-item append |
| `GEMINI_API_KEY` | `file-intel`, `banana-maker` | Gemini API access |

## Known Rough Edges

A few skills contain environment-specific references. They still work, but you may want to adjust:

- **gh-review** — hardcoded LAN IP `10.0.0.46` for the report-server URL. Swap for your own file server, or ignore (the HTML file is still generated locally).
- **banana-maker** — one mention of a "Surface tablet." Harmless.
- **context-fork-guide** — example command points at `/home/apexaipc/.claude/skills/`. Replace with your skills path if you run the example verbatim.
- **get-api-docs** — depends on the `/chub` (Context Hub) skill being installed separately. Without it, this skill is a no-op.
- **aar** — assumes an orchestrated agent system with a SQLite task DB and A2A endpoints. Without those, Phase 1 forensics gets thin.
- **what-am-i-forgetting** — most useful if you maintain a memory-index file, per-project TODO/NEXT files, and daily notes. Without them, it falls back to folder inventory + cron listings.
- **gemini-rescue** — requires a Gemini MCP server exposing `gemini_ask` and `gemini_run` tools. Configure with your Google API key.
- **self-healing-claudex** — requires the Codex CLI (`codex`) installed and authenticated. Falls back to the all-Claude `/self-healing-pipeline` if Codex is unavailable.
- **tldr** — assumes an Obsidian vault at `~/vault/`. Adjust the path in the skill if your vault lives elsewhere.
- **silver-platter** — uses Jinja2 for HTML rendering (`pip install jinja2`). Examples use fictional business personas.

## Version

`0.3.0` — adds `self-healing-pipeline`, `self-healing-claudex`, `diagnose`, `sparring-planner`, `next`, `gemini-rescue`, `tldr`, `silver-platter`. Feedback welcome.
