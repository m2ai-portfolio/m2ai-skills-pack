# M2AI Skills Pack

A curated Claude Code plugin containing 22 portable skills for strategy work, prompt engineering, model routing, agent auditing, and workflow tooling.

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

### Workflow
- **gh-review** — review GitHub repos against current project, generate HTML report
- **get-api-docs** — fetch API docs via Context Hub (`/chub`) to verify model names
- **file-intel** — Gemini-powered extraction/summary for PDF/PPTX/XLSX/DOCX/CSV folders
- **banana-maker** — Gemini image generation via Nano Banana Pro prompting

## Known Rough Edges (v0.1)

A few skills contain personal references from Matthew's environment. They still work, but you may want to adjust:

- **gh-review** — hardcoded LAN IP `10.0.0.46` for the report-server URL. Swap for your own file server, or ignore (the HTML file is still generated locally).
- **banana-maker** — one mention of "Matthew browses from his Surface tablet." Harmless.
- **context-fork-guide** — example command points at `/home/apexaipc/.claude/skills/`. Replace with your skills path if you run the example verbatim.
- **get-api-docs** — depends on the `/chub` (Context Hub) skill being installed separately. Without it, this skill is a no-op.
- **file-intel** and **banana-maker** — require `GEMINI_API_KEY` in your environment.

## Version

`0.1.0` — first external release. Feedback welcome.
