# M2AI Skills Pack

A curated Claude Code plugin containing 176 portable skills for strategy work, prompt engineering, model routing, agent architecture and auditing, build pipelines, and workflow tooling.

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

### Proactive Automation
- **life-engine** -- *(reference implementation)* time-windowed proactive briefing loop that checks email, calendar, project health, and changelog sources on a recurring schedule; includes dedup logic, self-improvement cycles, and mobile-first message formatting

### Video & Media Prompting
- **seedance-prompt** — Master AI Video Prompt Engineer for Seedance 2.0; structures multi-shot timelines (0-14s) using the FRAMES framework (Frame, Reaction, Audio, Mood, Edit Plan, Shot)
- **seedance-shot-prompt** — generate Seedance 2 prompts for linear A→B forward-motion shots (transitions, chases, reveals); includes 3-stage smoke-test protocol for identity-bound shots and 8-mode failure taxonomy

## Full Skill Index

All 176 skills, alphabetical. Each auto-triggers on its description or can be invoked as `/<name>`.

- **aar** — Run an After-Action Review on an agent dispatch run, build execution, or multi-step orchestrated operation.
- **action-class-policy** — Interview the user about their agent usage patterns and risk tolerance, then generate a tiered action-class policy document.
- **action-outcome-postmortem** — Structured post-mortem for the failure mode where an agent executed the correct mechanical action but produced the wrong outcome — the action succeeded, the goal failed.
- **adversarial-dual-model-workflow** — Set up and run a two-AI coding workflow where a primary assistant handles planning and code generation while an adversarial auditor stress-tests the plan, catches edge cases, an...
- **agent-architecture-audit** — Evaluate an agent codebase against 12 infrastructure primitives (permission model, token budget, crash recovery, tool assembly, streaming events, state machine, provenance, stop...
- **agent-authority-map** — Audit and visualize what an agent is actually allowed to do — parses Claude Code settings, hooks, MCP server configs, and tool permissions to surface authority gaps where the ag...
- **agent-blast-radius** — Inventory everything an autonomous agent has actually touched over a time window — files modified, commits authored, APIs called, processes spawned, scheduled tasks created — an...
- **agent-cold-start-diagnostic** — Evaluate an existing agent setup (CLAUDE.md, SOUL.md, memory files, cron config, agent.yaml) and score it on operational completeness -- flagging missing decision frameworks, va...
- **agent-commerce-mcp-spec** — Take a business's existing storefront, catalog, or checkout flow and emit a complete MCP server spec that makes it agent-callable end-to-end — tool list, JSON schemas, auth mode...
- **agent-commerce-scaffold** — Scaffold a new agentic-commerce product with all 8 commercial-responsibility domains pre-stubbed -- Identity, Authorization, Fraud, Payment credentials, Settlement, Refunds, Lia...
- **agent-correction-capture** — Document and implement the pattern for capturing user corrections to agent output as structured events (user_correction_submitted).
- **agent-cost-model** — Model token costs and optimization opportunities for any agent workflow, producing per-task costs, monthly burn, and model-routing savings.
- **agent-doctor** — Run a comprehensive health check on all connected services, API credentials, MCP servers, tools, and external dependencies.
- **agent-environment-optimizer** — Audit an agent's execution environment for cold-start patterns, missing warm caches, stale dependencies, and session persistence gaps.
- **agent-infra-scorer** — Score any enterprise tool (Jira, Salesforce, Workday, Google Calendar, etc.) against a 5-test structural diagnostic to determine whether it qualifies as agent infrastructure (ke...
- **agent-memory-architecture-matrix** — Interactive decision matrix that walks a builder through choosing between provider-hosted memory (fast, locked) and self-owned memory (portable, more maintenance), weighted to t...
- **agent-readiness-audit** — Audit a codebase for agent-readiness across 8 pillars (style/validation, build systems, testing, docs, dev environment, code quality, observability, security governance).
- **agent-run-schema** — Reference skill containing the canonical 10-event agent analytics schema.
- **agent-sdk-layer-stack** — Build a personal multi-agent AI command center using Claude Code as the immutable foundation with independently swappable specialized layers — Agent SDK bridge, voice interface...
- **agent-standup** — Run a structured standup across a multi-agent team.
- **agent-system-touch-map** — Map every workflow to the SaaS systems it touches, the operations performed on each system, and the vendor billing meter each operation triggers.
- **agentify-docs** — >
- **agents-md-generator** — Generate or lint an AGENTS.md file from repository analysis.
- **ai-cost-exposure-audit** — Walk through a three-prompt sequential audit of your organization's AI inference cost-structure exposure -- inventory dependencies, stress-test sensitivity to subsidized-pricing...
- **amdahl-ceiling-calculator** — Map a workflow's time allocation between AI-accelerable and non-accelerable steps, calculate the theoretical maximum speedup via Amdahl's Law, and identify which tool-layer bott...
- **anticipation-gap-audit** — Scores any agent definition or skill manifest against the four consumer-AI breakthrough problems (context, reliability, permission, judgment) plus a reactive-vs-anticipatory axis.
- **api-breaking-change-scanner** — Scans a codebase for deprecated API parameters and patterns that break silently or return 400 errors when migrating to a new model version, reporting exact file/line locations a...
- **arbitrage-audit** — Map a business model to Nate's five exploitable-inefficiency categories (speed, reasoning, fragmentation, discipline, knowledge-asymmetry), tag each gap as structural vs informa...
- **artifact-contract-validator** — Validate a directory of claimed deliverables for file-type authenticity, formula presence in spreadsheets, embedded media in presentations, and PDF metadata sanity.
- **automation-platform-decision-guide** — Decision-support skill for choosing between agent automation platforms.
- **banana-maker** — Generate images using the Gemini image generation API with the Nano Banana Pro prompting methodology.
- **bitter-lesson-scorecard** — Score an agent system design against the Bitter Lesson principle — how much "how" is encoded vs "what", how much bets on model improvement vs locks in current limitations.
- **boot-tax-monitor** — Monitor and alert when Claude Code session startup overhead (plugins, skills, MCP servers, CLAUDE.md chain) exceeds a configurable token threshold.
- **brand-memory-probe** — Probe how a brand appears in AI agent recall across multiple LLM providers.
- **build-spec-generator** — Takes a workflow that scored BUILD from workflow-fit-scorer and emits a deployment-ready build spec — trigger, I/O contract, tool connectors, success criteria, escalation condit...
- **buyer-questions** — Pre-pitch preflight for enterprise AI sales.
- **calendar-hygiene** — Audit the next N days of a Google Calendar and surface hygiene issues before the user notices them -- back-to-back meetings with no buffer, missing prep blocks before important...
- **callable-audit** — Audit whether a business is callable by an AI agent end-to-end.
- **career-gap-map** — Calculate an individual's AI exposure score (percent of weekly tasks AI can already compress to near-zero) and produce a migration plan toward upstream skills like judgment, tas...
- **classify-agent** — >
- **classify-loop** — Classify an agent workflow by the loop it operates in (code-generation, operational, supervisory, or fully-autonomous) and map each loop type to appropriate controls, approval r...
- **claude-architect-audit** — >
- **claude-code-memory-architect** — Interviews the user to design and build a personalized Claude Code memory system — choosing which building blocks (decay, promotion, multi-signal retrieval, salience, compaction...
- **claude-design-to-code** — Rapidly prototype UI wireframes and high-fidelity designs with Claude Design, then export to Claude Code with a single terminal command that preserves full design fidelity.
- **claude-memory-architect** — Interview-driven skill that designs a custom Claude Code memory system tailored to how the user actually works.
- **claudemd-router** — Restructure a bloated CLAUDE.md into a lean router that delegates to compartmentalized .claude/rules/ files.
- **claudex-plan** — Enforced multi-round planning loop with a stop hook that blocks code execution until the plan survives adversarial review and receives explicit approval.
- **code-review-memory** — Accumulates repo-specific code review lessons and surfaces them before the next review of the same file or module.
- **compensating-complexity-auditor** — Audit system prompts and agent pipelines for compensating complexity — scaffolding, procedural hacks, and duct tape built around previous model limitations that should be tested...
- **completion-vs-acceptance** — Analyze the gap between an agent's self-reported completion rate and the actual acceptance rate (tasks the user or downstream validator kept without correction).
- **compound-skill-orchestrator** — Build orchestrator skills that chain multiple existing skills in sequence using context:fork, passing output between stages for a unified result.
- **comprehension-gate** — Pre-merge review that checks a PR diff not for syntax or test coverage, but for human understanding of implications -- plain-text credentials, cross-service data leaks, tokens w...
- **comprehension-interview-loop** — Conduct a Socratic pushback interview about something the user has built.
- **compute-availability-tracker** — Poll the status pages of major AI providers (Anthropic, OpenAI, Google, OpenRouter) and produce a current availability table with routing recommendations.
- **context-cost-line-item-analyzer** — Decompose an agent's token spend into context-as-input vs output-as-output, identify the specific context drivers (startup overhead, system prompt bloat, MCP tool registration,...
- **context-fork-guide** — Use when creating or modifying skills that do heavy research, search, or multi-tool work.
- **context-hygiene** — Reference for Claude Code context management.
- **context-layer-generator** — Generate three structured context artifacts for any module or service -- a structural manifest (what it does, dependencies, dependents), behavioral contracts (idempotency, retry...
- **control-map** — Walk any agent workflow through a 7-row control map (runtime, governed data, identity/principal, action authorization, payment authority, observability, kill switch) to identify...
- **counterargument-stress-test** — Takes any strategic argument, business case, or thesis and systematically generates and addresses the N strongest counterarguments, forcing rigorous thinking before publishing o...
- **cross-model-peer-review** — Implements a cross-model peer review loop where Model A grades Model B's output on a structured rubric, catching errors that neither model's self-assessment reliably detects.
- **cross-runtime-skill-converter** — |
- **dark-code-audit** — Scan a codebase to map where human comprehension has gone missing -- identifying modules with no decision logs, no behavioral contracts, no authorship trail, and high AI-generat...
- **data-fabric-fit-assessor** — Given a client's or team's existing data infrastructure (Microsoft 365, Google Workspace, Salesforce, custom RAG, etc.), recommend which AI agent products will benefit from nati...
- **decision-interview-builder** — Conduct a structured multi-turn interview through one real past decision the user made — walking situation, decision, risk, and change — and produce a sanitized, shareable judgm...
- **decomposition-scorer** — >
- **delegation-spec** — Generate a pre-flight delegation spec for any agent task -- context packages for memory-weak tools, review gates for opacity-prone tools, compounding checkpoints for stateless t...
- **demotion-audit** — Three-phase audit to determine whether a software tool or artifact should be demoted down the production-class ladder (Customer-Facing → Supported Internal → Team Beta → Persona...
- **describability-gate** — Eight-field readiness gate that blocks any automation project until inputs, outputs, decision rules, exceptions, owner, success metric, failure mode, and rollback are explicitly...
- **destructive-op-guard** — Design or audit a PreToolUse hook that intercepts high-blast-radius shell operations (DROP TABLE, rm -rf, git push --force to main, kubectl delete, docker system prune, etc.) an...
- **diagnose** — Strict 4-gate diagnostic protocol for bugs, failures, and broken pipelines.
- **dispatch-handoff-brief** — Generate structured delegation briefs for Anthropic Dispatch or any autonomous agent handoff with objective, success criteria, tools needed, verification, and escalation conditions
- **dynamic-workflow-orchestration** — Invoke Claude Code's dynamic workflow orchestration to coordinate teams of 10–50+ agents for large-scale, comprehensive tasks requiring parallel analysis and cross-validation.
- **eval-agent** — Score any agent tool or platform against 3 structural questions (persistent memory, inspectable artifacts, compounding context) for a given use case, then generate a delegation...
- **executive-briefing** — Takes a complex geopolitical, industry, or market event and produces a structured executive briefing with thesis, transmission channels, quantified exposure, counterarguments ad...
- **explanation-artifact-generator** — Walk through a 4-question comprehension template for any project artifact (repo, feature, tool) and produce a structured explanation artifact that lives alongside the code.
- **failure-asymmetry** — Compare a skill's behavior under human invocation vs simulated agent invocation, highlighting divergences in output format, context assumptions, and error paths that only surfac...
- **failure-mode-tool-router** — Given any task description, classify it into the right AI tool category and explain why common alternatives are wrong for it.
- **failure-postmortem** — Guide a structured AI system failure post-mortem using 6 named failure patterns, producing a publishable incident report.
- **fair-agent-license-rubric** — Score an agent license or SaaS contract term sheet against a 9-trait rubric distinguishing fair agent licensing (transparent, capped, portable, identity-aware) from rent-seeking...
- **file-intel** — Run the Gemini file processor on any folder — extracts content from PDF, PPTX, XLSX, DOCX, CSV, JSON, and any text format, then generates Obsidian-ready summaries.
- **gap-trace** — Run Nate's three-question industry diagnostic — what inefficiency is this built on, how fast can AI close it, what new gap does closure create — and output a migration map showi...
- **gemini-rescue** — Get a second opinion from Google Gemini on the current diff, plan, or problem.
- **geopolitical-signal-enricher** — Enriches a market or technology signal with geopolitical context -- affected regions, supply chain nodes, timeline estimates, and second-order effects on tech infrastructure.
- **get-api-docs** — (no description)
- **gh-review** — Review 1-3 GitHub repos against the current project and generate an HTML report with plain-speak summaries, relevance analysis, and integration examples.
- **goal-os-optimize** — Use /goal to run a self-directed optimization loop on your agentic OS — skills, CLAUDE.md, rules files, and projects.
- **hallucination-audit-trail** — Cross-checks an agent's self-reported processing log against filesystem evidence (file modification timestamps, existence, size) to detect hallucinated audit trails before they...
- **heartbeat-generator** — Takes a user's described operating rhythms (from structured elicitation, manual input, or existing CLAUDE.md) and generates a HEARTBEAT.md checklist plus cron schedule entries t...
- **hive-mind-shared-context** — Design a shared context store for a multi-agent team -- write policies, decay rules, pinning, and consolidation schedules -- so specialized agents can delegate to each other wit...
- **image-to-implementation** — Generate a visual reference image for a UI or design concept, then produce a structured implementation prompt that hands the image to a code-capable model.
- **impl-arch-audit** — Score an AI deployment against six implementation layers (workflow, data, authority, evaluation, audit trail, recovery).
- **inbox-load-audit** — Scans installed skills, plugins, MCP servers, hooks, and scheduled tasks to produce an inbox load score — how many independently-managed AI surfaces the user is maintaining.
- **inference-layer-ownership-auditor** — Map your AI stack to identify who controls each inference layer -- model provider, hosting, hardware -- and score substitutability at each layer.
- **inference-vendor-lock-in-scorer** — Scan agent and skill manifests for AI vendor lock-in exposure -- hardcoded model names, non-portable API surfaces, absent fallback chains, opaque key management.
- **info-judgment-boundary-auditor** — Audit an agent system, workflow, or AI implementation to map where information retrieval ends and judgment calls begin.
- **institutional-taste-encoder** — Formalize implicit quality judgments, style preferences, and "taste" into structured constraint specifications that agents can follow.
- **judgment-gate** — A judgment classifier for planned tool calls or agent actions.
- **judgment-layer** — Add a judgment classifier to any agent or Claude Code skill to decide when to act autonomously vs.
- **kill-switch-audit** — Verify that a named agent in production has a real, one-step kill path at each of 5 layers (runtime cancel, credential revocation, gateway block, payment freeze, workflow interr...
- **knowledge-work-tests** — Generate evaluation criteria, acceptance checks, and scoring rubrics for knowledge work outputs -- the missing "test suite" for non-code deliverables.
- **launch-filter** — >
- **license-audit** — Takes a team's current AI tool inventory and work types, then outputs a one-page misfit memo identifying duplicative tools, underserved work classes, and wasted license spend.
- **life-engine** — >
- **make-anticipatory** — Refactor any reactive slash-command skill or repeating manual workflow into an anticipatory one that fires automatically when the right condition is met.
- **management-function-audit** — Takes an org change description and classifies which management functions (routing, sensemaking, accountability) were removed, retained, or weakened.
- **mcp-portability-auditor** — Scan an agent stack (Claude Code plugins, Conway .cnw.zip files, Gemini extensions, ChatGPT GPTs) and flag which capabilities are locked to one platform vs portable via open MCP.
- **mcp-spec-generator** — Takes any SaaS product or internal system and outputs a complete MCP server specification — tool list, input/output schemas, auth model, state-machine endpoints, audit/event end...
- **memory-fingerprint-architect** — Design a personalized Claude Code memory system by cloning existing open-source memory frameworks, auditing them with Claude Code, and cherry-picking the patterns that fit your...
- **memory-system-assembler** — Build a personalized Claude Code memory system by auditing open-source memory repos, cherry-picking patterns that match your workflow, and assembling them into a coherent design.
- **middleware-trap-detector** — Diagnose whether an agent deployment is falling into the "middleware trap" — wrapping legacy systems without redesign, mirroring manual bottlenecks at machine speed, or pass-thr...
- **mismatch-check** — >
- **model-audit** — (no description)
- **model-migration-preflight** — Audit your prompts, system instructions, and Claude Code configuration before switching model versions.
- **model-release-deep-dive** — Produce a structured capability-delta brief for any AI model release -- what actually changed beyond benchmark scores, what breaks, what improves, and what it means for current...
- **model-router** — Classify a task and recommend the optimal model tier (Opus/Sonnet/Haiku) based on reasoning complexity, output length, and cost sensitivity.
- **multi-artifact-work-package** — Turn a messy business situation into a full deliverable set with an explicit artifact contract — Word, PowerPoint, Excel, PDFs, press releases, FAQs — and verify each file is re...
- **news-narrative-decomposer** — Takes a month of AI/tech news and extracts the structural shifts underneath the headlines -- classifying each story by altitude (physics, monetization, geography, business model...
- **next** — Generate a continuation prompt for a fresh session and list current tasks.
- **open-loop-audit** — Audit open loops and classify each as real delegation candidate vs simulated work using Nate's "land or leave" framework
- **optimize-description** — Rewrite a skill's description field for maximum agent discoverability -- clear trigger conditions, explicit input/output contracts, and disambiguation from similar skills.
- **plan-stop-hook** — Installs a "bouncer" hook in Claude Code that blocks all file edits until an explicit planning gate is passed.
- **platform-dependency-mapper** — Audit an org's or individual's AI stack and produce an exit-cost estimate across four axes — data, integrations, behavioral context, and billing.
- **policy-gen** — Generate the policy agent YAML security policies for agent sandboxing.
- **poly-skill** — Convert any Claude Code skill to work in OpenAI Codex (or vice versa) by applying a structural adapter that handles naming differences, sidecar YAML generation, trigger placemen...
- **pre-turn-budget-guardian** — Enforce a token budget ceiling on Claude Code sessions by checking projected usage BEFORE each turn and halting with a structured stop reason if the budget would be exceeded.
- **pretty-but-wrong** — Final hostile-reviewer pass on any AI-generated document, deck, or workbook before sharing.
- **promotion-packet-auditor** — Adversarial reviewer that scores a promotion packet or performance self-review for real judgment signal versus AI-generated polish.
- **prompt-rewriter** — Rewrite system prompts to strip compensating complexity and produce clean outcome-based prompts.
- **prototype-classifier** — Classify any software tool, script, or AI artifact onto a 4-rung production-class ladder (Personal Tool → Team Beta → Supported Internal → Customer-Facing) using evidence-based...
- **provider-availability-scout** — Scheduled task that probes model provider availability, pricing changes, restriction announcements, and API deprecations across configured providers (Anthropic, OpenAI, Google,...
- **reasoning-extractor** — Apply a four-question reasoning framework (situation → decision → risk → change) to any piece of work — from an individual task to a strategic bet — turning silent judgment into...
- **recognizable-quality-test-generator** — Generate an LLM-as-judge quality rubric from a workflow description and historical examples.
- **remote-channels** — Set up and configure Claude Code remote access via Telegram and Discord channels.
- **renewal-interrogation** — Generate a vendor-specific SaaS renewal playbook for contracts where agent workloads are in scope.
- **scheduled-agent-harness** — Define and document a complete scheduled-agent contract for any recurring automated task.
- **seedance-prompt** — Master AI Video Prompt Engineer for Seedance 2.0.
- **seedance-shot-prompt** — Use when generating a Seedance 2 video prompt for a linear forward-motion shot — transitions, chase shots, establishing shots, A→B narrative clips.
- **self-healing-claudex** — >
- **self-healing-pipeline** — >
- **semantic-score** — Score any AI product, vendor pitch, or announcement across 10 semantic-depth dimensions to distinguish "access-only" demos from "meaning-rich" products ready for production agen...
- **sensemaking-concentrator** — Audit a multi-agent system for distributed sensemaking anti-patterns and recommend where to concentrate interpretation into a single agent, reducing conflicting signals and impr...
- **session-work-log** — Produces a structured session-end artifact capturing what was attempted, what changed, what blocked progress, and what the next agent or session needs to know.
- **silver-platter** — Interview a business owner about their day-to-day tools, build a tailored data map, render a Pantry → Prep → Plate HTML visualization with recipes, a 30-day build plan, and an i...
- **simulated-work-detector** — Recurring audit that reviews agent fleet output and flags simulated work that generated artifacts but didn't close any loops or remove work from your plate
- **skill-audit** — Audit your Claude Code skills directory, CLAUDE.md, and recent session patterns to surface candidates for new skills -- gaps, redundancies, and formalization opportunities.
- **skill-maintenance** — Audit Claude Code skills for content quality against Anthropic best practices.
- **source-packet** — Builds a structured source inventory from a set of files or documents before any artifact is created.
- **sparring-planner** — |
- **spec-driven-dev-enforcer** — Enforce a spec-first development workflow that gates code generation behind explicit specification approval.
- **spec-gap-detector** — Stress-test any agent prompt or specification for ambiguity, missing constraints, and edge cases that would cause random behavior at scale.
- **strategic-timing-matrix** — Map your biggest pending decisions (hiring, fundraising, product launches, home purchase, job change) against macro events and market windows to recommend which decisions to acc...
- **stress-test-finder** — Interview the user about their current workload, surface the task they've been avoiding because it felt too messy or fragile to delegate, and produce a complete AI delegation pr...
- **structured-elicitation** — A conversational skill that interviews the user across five layers of operational knowledge -- operating rhythms, recurring decisions, dependencies, institutional knowledge, and...
- **thesis-cluster-detector** — Ingests a batch of enterprise AI or technology news items (from RSS, Substack previews, or pasted headlines) and clusters them by underlying investment thesis using embedding si...
- **tldr** — Save a summary of this conversation to the vault.
- **token-burn-auditor** — Audit the live Claude Code environment for token waste -- measures per-session overhead, flags system prompt bloat, checks plugin/skill loading totals, and gives before/after de...
- **tool-audit** — Audit a tool already in your stack against a semantic-depth rubric and emit a clear decision — Extend, Wrap, Replace, or Wait — with a one-page memo.
- **tool-build-guide-generator** — Generate a hands-on, machine-ready build guide for any tool or library — takes a tool name and produces a runnable, annotated project that closes the gap between "I've heard of...
- **tool-fluency-builder** — Turn any AI tool or framework from "heard of it" to "can build with it" by generating a machine-ready, hands-on build guide.
- **tool-migration-brief** — Converts enterprise tool audit results (which tools fail agent-infrastructure tests) into a leadership-ready migration brief — covering what to replace, build, or wrap, with ris...
- **transaction-history-builder** — Aggregate completed projects, commits, PRs, shipped features, and explanation artifacts into a running transaction history -- a living portfolio that shows trajectory, not just...
- **trust-score** — Score any AI-generated document, spreadsheet, or deck on a 0–100 trust scale across five verifiable dimensions.
- **validated-data-migration** — Migrate a shoebox of inconsistent files (CSV, Excel, JSON, PDFs, VCF) into a clean SQLite database with rejection logic, enum normalization, duplicate merges, source provenance,...
- **vendor-pressure-test** — Run a vendor pitch, RFP response, or internal proposal through the 7-row agent control-layer lens to identify which rows are answered, dodged, or hidden behind buzzwords, and wh...
- **video-to-skill** — Create Claude Code skills from screen recordings of manual processes.
- **viral-shorts-pipeline** — Generate and publish viral TikTok/YouTube Shorts from a single theme prompt.
- **weekly-signal-diff** — Tracks N companies across M categories, re-ranks using user context (projects, interests, priorities), and produces a personalized "structural diff" of what changed and why it m...
- **what-am-i-forgetting** — >
- **workbook-doctor** — Audits an existing or AI-generated Excel workbook for hidden risks before it is used in decisions.
- **workflow-decomposer** — Turn a function, role, or process description into a list of discrete, scoreable workflows — the pre-step before any AI investment-motion decision.
- **workflow-fit-scorer** — Score a candidate workflow against 5 automation-fit properties and return a build / switch-tools / resolve-ambiguity verdict.
- **workflow-investment-scorer** — Score each workflow on six dimensions (frequency, mistake cost, judgment, model-improvement trajectory, market maturity, company specificity) and emit a capital-allocation recom...
- **workflow-tier-classifier** — Paste a product description or pitch and get back a five-tier verdict (Decoration → Full Stack) with the missing implementation layers called out.
- **world-model-principles-scorecard** — Score an agent system or knowledge base against five principles that determine whether a world model compounds value or silently rots — signal fidelity, earned structure, outcom...
- **world-model-readiness-diagnostic** — Interactive diagnostic that maps an organization to a world model paradigm (vector DB, structured ontology, or signal-driven) and recommends a starting sequence for implementation.

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

- **gh-review** — hardcoded LAN IP `<host>` for the report-server URL. Swap for your own file server, or ignore (the HTML file is still generated locally).
- **banana-maker** — one mention of a "Surface tablet." Harmless.
- **context-fork-guide** — example command points at `/home/user/.claude/skills/`. Replace with your skills path if you run the example verbatim.
- **get-api-docs** — depends on the `/chub` (Context Hub) skill being installed separately. Without it, this skill is a no-op.
- **aar** — assumes an orchestrated agent system with a SQLite task DB and A2A endpoints. Without those, Phase 1 forensics gets thin.
- **what-am-i-forgetting** — most useful if you maintain a memory-index file, per-project TODO/NEXT files, and daily notes. Without them, it falls back to folder inventory + cron listings.
- **gemini-rescue** — requires a Gemini MCP server exposing `gemini_ask` and `gemini_run` tools. Configure with your Google API key.
- **self-healing-claudex** — requires the Codex CLI (`codex`) installed and authenticated. Falls back to the all-Claude `/self-healing-pipeline` if Codex is unavailable.
- **tldr** -- assumes an Obsidian vault at `~/vault/`. Adjust the path in the skill if your vault lives elsewhere.
- **life-engine** -- reference implementation, not plug-and-play. Shows how one user wired Gmail, Google Calendar, an idea-catcher DB, and changelog tracking into a 30-minute proactive loop. Read the Adaptation Guide at the bottom of the skill to build your own.
- **silver-platter** — uses Jinja2 for HTML rendering (`pip install jinja2`). Examples use fictional business personas.

## Version

`0.4.0` -- adds `life-engine` (reference implementation for proactive briefing loops). Feedback welcome.
