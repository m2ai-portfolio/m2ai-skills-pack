# M2AI Skills Pack

> **178 portable Claude Code skills** for building, governing, and operating AI agents — architecture, safety, model strategy, cost control, code pipelines, and business analysis. One install, organized into 13 working divisions.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) [![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-blueviolet)](#install) [![Skills](https://img.shields.io/badge/skills-178-brightgreen.svg)](#the-catalog)

## Install

In Claude Code:

```
/plugin marketplace add m2ai-portfolio/m2ai-skills-pack
/plugin install m2ai-skills-pack@m2ai-skills-pack
```

Restart Claude Code. Skills auto-trigger on their descriptions, or invoke explicitly (e.g. `/model-router`, `/diagnose`, `/aar`).

## What's inside

| Division | Skills | Focus |
|---|---:|---|
| 🏗️ [Agent Architecture & Design](#agent-architecture--design) | 18 | Design, scaffold, and structure single- and multi-agent systems. |
| 🛡️ [Safety, Governance & Control](#safety-governance--control) | 17 | Guardrails, permissions, kill switches, and judgment gates before an agent acts. |
| 🩺 [Operations, Reliability & Observability](#operations-reliability--observability) | 16 | Health checks, diagnostics, post-mortems, and run observability. |
| 🔀 [Model & Inference Strategy](#model--inference-strategy) | 12 | Routing, migration, cross-model review, and provider monitoring. |
| 💰 [Cost & Token Economics](#cost--token-economics) | 6 | Token spend, boot tax, and inference-cost exposure. |
| 🔓 [Portability & Vendor Independence](#portability--vendor-independence) | 10 | Lock-in scoring, licensing, and exit-cost analysis. |
| 🧠 [Context & Memory](#context--memory) | 8 | Context hygiene, memory architecture, and world-model design. |
| 🏭 [Build Pipelines & Code Comprehension](#build-pipelines--code-comprehension) | 15 | Spec-first build loops, code comprehension, and migration safety. |
| 🧰 [Skills, Tools & MCP](#skills-tools--mcp) | 21 | Build, audit, convert, and maintain skills, tools, and MCP servers. |
| 📊 [Strategy & Business Analysis](#strategy--business-analysis) | 27 | Briefings, stress-tests, market signals, and workflow-investment scoring. |
| ✅ [Deliverable Quality & Verification](#deliverable-quality--verification) | 10 | Hostile-reviewer passes and trust scoring before anything ships. |
| 🗂️ [Productivity & Workflow](#productivity--workflow) | 14 | Sessions, handoffs, recall, calendar, and remote access. |
| 🎬 [Content & Media](#content--media) | 4 | Image and video prompt engineering and shorts pipelines. |
| | **178** | |

## The catalog

### 🏗️ Agent Architecture & Design

*Design, scaffold, and structure single- and multi-agent systems.*

| Skill | What it does | When to use |
|---|---|---|
| [agent-architecture-audit](skills/agent-architecture-audit/) | Evaluate an agent codebase against 12 infrastructure primitives (permission model, token budget, crash recovery, tool… | Auditing agent architecture, reviewing agent readiness, or planning what infrastructure to build next |
| [agent-sdk-layer-stack](skills/agent-sdk-layer-stack/) | Build a personal multi-agent AI command center using Claude Code as the immutable foundation with independently swapp… | Designing a personal AI stack, replacing an agent framework, building a multi-agent system, or asking "how do I build my own ag… |
| [agents-md-generator](skills/agents-md-generator/) | Generate or lint an AGENTS.md file from repository analysis. | The user says "generate agents.md", "create agents.md", "lint agents.md", "agents file", "agent instructions", or wants to crea… |
| [anticipation-gap-audit](skills/anticipation-gap-audit/) | Scores any agent definition or skill manifest against the four consumer-AI breakthrough problems (context, reliabilit… | Designing or restructuring an agent system. |
| [bitter-lesson-scorecard](skills/bitter-lesson-scorecard/) | Score an agent system design against the Bitter Lesson principle — how much "how" is encoded vs "what", how much bets… | Designing new agent systems, reviewing agent architecture, or deciding what to simplify |
| [build-spec-generator](skills/build-spec-generator/) | Takes a workflow that scored BUILD from workflow-fit-scorer and emits a deployment-ready build spec — trigger, I/O co… | Designing or restructuring an agent system. |
| [classify-agent](skills/classify-agent/) | Classify a problem into one of four agent architectures: coding harness, dark factory, auto research, or orchestratio… | Starting a new agent project, evaluating a build approach, or when someone says "what kind of agent should I build?", "classify… |
| [claudemd-router](skills/claudemd-router/) | Restructure a bloated CLAUDE.md into a lean router that delegates to compartmentalized .claude/rules/ files. | CLAUDE.md exceeds ~80 lines, when adding a new domain of instructions, or when the user says "clean up my CLAUDE.md", "my CLAUD… |
| [compound-skill-orchestrator](skills/compound-skill-orchestrator/) | Build orchestrator skills that chain multiple existing skills in sequence using context:fork, passing output between… | The user says "chain skills", "combine skills", "orchestrator skill", "compound skill", "run skills in sequence", "skill pipeli… |
| [decomposition-scorer](skills/decomposition-scorer/) | Score whether a set of coding tasks are properly decomposed on boundaries of isolation. | Launching parallel agent workers, when planning task breakdown for yce-harness or similar, or when someone says "will these tas… |
| [delegation-spec](skills/delegation-spec/) | Generate a pre-flight delegation spec for any agent task -- context packages for memory-weak tools, review gates for… | Handing off a task to an agent, preparing a workflow for autonomous execution, or writing deployment specs for client agent sys… |
| [dispatch-handoff-brief](skills/dispatch-handoff-brief/) | Generate structured delegation briefs for Anthropic Dispatch or any autonomous agent handoff with objective, success… | Designing or restructuring an agent system. |
| [dynamic-workflow-orchestration](skills/dynamic-workflow-orchestration/) | Invoke Claude Code's dynamic workflow orchestration to coordinate teams of 10–50+ agents for large-scale, comprehensi… | Trigger phrases: "build a workflow", "dynamic workflow", "/workflows", "spin up agents for", "comprehensive audit across", "wor… |
| [heartbeat-generator](skills/heartbeat-generator/) | Takes a user's described operating rhythms (from structured elicitation, manual input, or existing CLAUDE.md) and gen… | The user says "generate heartbeat", "build my schedule", "create cron from rhythms", "heartbeat.md", "schedule my agent", or wh… |
| [hive-mind-shared-context](skills/hive-mind-shared-context/) | Design a shared context store for a multi-agent team -- write policies, decay rules, pinning, and consolidation sched… | Building a multi-agent system where agents need to share memory, designing memory decay and consolidation for an agent team, or… |
| [make-anticipatory](skills/make-anticipatory/) | Refactor any reactive slash-command skill or repeating manual workflow into an anticipatory one that fires automatica… | Saying "make this anticipatory", "convert this to a hook", "make it fire automatically", "this skill never fires because I forg… |
| [prompt-goodies](skills/prompt-goodies/) | An escalating 8-rung ladder of copy-paste delegation-prompt patterns, extracted from prompts a frontier model wrote for itself when orchestrating subagents. Serves rungs at your level, or upgrades a delegation prompt you paste in. | Writing or improving any prompt that hands work to an agent; an agent ignored instructions, touched the wrong files, or claimed success without proof; "prompt goodies", "make my subagent prompt better" |
| [scheduled-agent-harness](skills/scheduled-agent-harness/) | Define and document a complete scheduled-agent contract for any recurring automated task. | Designing or restructuring an agent system. |
| [sensemaking-concentrator](skills/sensemaking-concentrator/) | Audit a multi-agent system for distributed sensemaking anti-patterns and recommend where to concentrate interpretatio… | Designing or restructuring an agent system. |

### 🛡️ Safety, Governance & Control

*Guardrails, permissions, kill switches, and judgment gates before an agent acts.*

| Skill | What it does | When to use |
|---|---|---|
| [action-class-policy](skills/action-class-policy/) | Interview the user about their agent usage patterns and risk tolerance, then generate a tiered action-class policy do… | Someone says "/action-class-policy", "define action classes", "agent permissions policy", "what actions can my agent take unsup… |
| [agent-authority-map](skills/agent-authority-map/) | Audit and visualize what an agent is actually allowed to do — parses Claude Code settings, hooks, MCP server configs… | The user says "agent authority map", "what can my agent do", "permission audit", "authority gaps", or wants to inventory autono… |
| [agent-blast-radius](skills/agent-blast-radius/) | Inventory everything an autonomous agent has actually touched over a time window — files modified, commits authored… | The user says "blast radius", "what has my agent done", "agent footprint", "audit agent actions", or wants visibility into the… |
| [classify-loop](skills/classify-loop/) | Classify an agent workflow by the loop it operates in (code-generation, operational, supervisory, or fully-autonomous… | Designing a new agent workflow, auditing an existing agent deployment, or when someone asks "what loop is my agent in?", "how a… |
| [claudex-plan](skills/claudex-plan/) | Enforced multi-round planning loop with a stop hook that blocks code execution until the plan survives adversarial re… | A task is high-stakes enough that a wrong plan is expensive to undo — the stop hook is the "bouncer" that prevents jumping stra… |
| [control-map](skills/control-map/) | Walk any agent workflow through a 7-row control map (runtime, governed data, identity/principal, action authorization… | Designing a new agent workflow, auditing an existing one, or answering "what controls does this agent have?" before shipping |
| [describability-gate](skills/describability-gate/) | Eight-field readiness gate that blocks any automation project until inputs, outputs, decision rules, exceptions, owne… | Kicking off any automation build, as a pre-dispatch check, or when reviewing automation specs |
| [destructive-op-guard](skills/destructive-op-guard/) | Design or audit a PreToolUse hook that intercepts high-blast-radius shell operations (DROP TABLE, rm -rf, git push --… | Adding a safety hook to a Claude Code project, reviewing an existing hook's coverage, or after an incident where an autonomous… |
| [info-judgment-boundary-auditor](skills/info-judgment-boundary-auditor/) | Audit an agent system, workflow, or AI implementation to map where information retrieval ends and judgment calls begin. | Reviewing agent designs, deploying AI into decision workflows, or diagnosing "it was working fine then decisions got worse" fai… |
| [judgment-gate](skills/judgment-gate/) | A judgment classifier for planned tool calls or agent actions. | Scores reversibility, cost boundary, blast radius, and user observability, then routes to ACT / ASK / QUEUE / ABORT with reasoning |
| [judgment-layer](skills/judgment-layer/) | Add a judgment classifier to any agent or Claude Code skill to decide when to act autonomously vs. ask for confirmation. | Asking "when should my agent ask?", "judgment layer", "add a confirmation gate", "my agent acts when it shouldn't", "reversibil… |
| [kill-switch-audit](skills/kill-switch-audit/) | Verify that a named agent in production has a real, one-step kill path at each of 5 layers (runtime cancel, credentia… | Use before shipping a new autonomous agent, during a security review, or any time you need to answer "can we actually stop this… |
| [management-function-audit](skills/management-function-audit/) | Takes an org change description and classifies which management functions (routing, sensemaking, accountability) were… | Predicts failure modes and recommends mitigations based on historical precedents |
| [plan-stop-hook](skills/plan-stop-hook/) | Installs a "bouncer" hook in Claude Code that blocks all file edits until an explicit planning gate is passed. | A task is non-trivial, prior attempts drifted, or the cost of a wrong plan is high |
| [policy-gen](skills/policy-gen/) | Generate the policy agent YAML security policies for agent sandboxing. | The user says "the policy agent policy", "agent sandbox", "generate security policy", "sandbox config", "the policy agent yaml"… |
| [spec-driven-dev-enforcer](skills/spec-driven-dev-enforcer/) | Enforce a spec-first development workflow that gates code generation behind explicit specification approval. | The user says "spec first", "spec driven", "write the spec before coding", "requirements first", "design doc first", "no code u… |
| [vendor-pressure-test](skills/vendor-pressure-test/) | Run a vendor pitch, RFP response, or internal proposal through the 7-row agent control-layer lens to identify which r… | Evaluating a vendor for an agent deployment, responding to an RFP, or stress-testing your own internal proposal before presenti… |

### 🩺 Operations, Reliability & Observability

*Health checks, diagnostics, post-mortems, and run observability.*

| Skill | What it does | When to use |
|---|---|---|
| [aar](skills/aar/) | Run an After-Action Review on an agent dispatch run, build execution, or multi-step orchestrated operation. | The user says "aar", "after action review", "let's review what happened", "review this run", or after any dispatch that produce… |
| [action-outcome-postmortem](skills/action-outcome-postmortem/) | Structured post-mortem for the failure mode where an agent executed the correct mechanical action but produced the wr… | An agent did exactly what it was told but the result was wrong, or the user says "/action-outcome-postmortem", "right action wr… |
| [agent-cold-start-diagnostic](skills/agent-cold-start-diagnostic/) | Evaluate an existing agent setup (CLAUDE.md, SOUL.md, memory files, cron config, agent.yaml) and score it on operatio… | The user says "cold start diagnostic", "check agent config", "agent health score", "is my agent configured properly", "audit ag… |
| [agent-correction-capture](skills/agent-correction-capture/) | Document and implement the pattern for capturing user corrections to agent output as structured events (user_correcti… | Building any agent-facing UI, CLI, or chat interface where you want corrections to flow into an evaluation or feedback pipeline… |
| [agent-doctor](skills/agent-doctor/) | Run a comprehensive health check on all connected services, API credentials, MCP servers, tools, and external depende… | Validates that everything the agent needs is reachable and authenticated before the user hits a failure |
| [agent-environment-optimizer](skills/agent-environment-optimizer/) | Audit an agent's execution environment for cold-start patterns, missing warm caches, stale dependencies, and session… | The user says "optimize agent environment", "cold start audit", "agent environment check", "why is my agent slow to start", "wa… |
| [agent-run-schema](skills/agent-run-schema/) | Reference skill containing the canonical 10-event agent analytics schema. | Defines event shapes (agent_run_started, task_completed, user_correction_submitted, approval_granted, approval_denied, tool_cal… |
| [agent-standup](skills/agent-standup/) | Run a structured standup across a multi-agent team. | Asking for a "standup", "team status check", "/standup", "war room update", "what are all my agents doing?", or "agent status r… |
| [completion-vs-acceptance](skills/completion-vs-acceptance/) | Analyze the gap between an agent's self-reported completion rate and the actual acceptance rate (tasks the user or do… | The user says "completion rate", "acceptance rate", "how trusted is my agent", "agent done vs actually accepted", "completion-v… |
| [diagnose](skills/diagnose/) | Strict 4-gate diagnostic protocol for bugs, failures, and broken pipelines. | The user reports a bug, something is broken, a test is failing, a service is down, or says "diagnose X", "what's wrong with X"… |
| [failure-asymmetry](skills/failure-asymmetry/) | Compare a skill's behavior under human invocation vs simulated agent invocation, highlighting divergences in output f… | Diagnosing, reviewing, or monitoring agent runs. |
| [failure-postmortem](skills/failure-postmortem/) | Guide a structured AI system failure post-mortem using 6 named failure patterns, producing a publishable incident rep… | Diagnosing, reviewing, or monitoring agent runs. |
| [hallucination-audit-trail](skills/hallucination-audit-trail/) | Cross-checks an agent's self-reported processing log against filesystem evidence (file modification timestamps, exist… | Diagnosing, reviewing, or monitoring agent runs. |
| [open-loop-audit](skills/open-loop-audit/) | Audit open loops and classify each as real delegation candidate vs simulated work using Nate's "land or leave" framework | Diagnosing, reviewing, or monitoring agent runs. |
| [session-work-log](skills/session-work-log/) | Produces a structured session-end artifact capturing what was attempted, what changed, what blocked progress, and wha… | Machine-readable by design -- survives model swaps and cross-agent handoffs |
| [simulated-work-detector](skills/simulated-work-detector/) | Recurring audit that reviews agent fleet output and flags simulated work that generated artifacts but didn't close an… | Diagnosing, reviewing, or monitoring agent runs. |

### 🔀 Model & Inference Strategy

*Routing, migration, cross-model review, and provider monitoring.*

| Skill | What it does | When to use |
|---|---|---|
| [adversarial-dual-model-workflow](skills/adversarial-dual-model-workflow/) | Set up and run a two-AI coding workflow where a primary assistant handles planning and code generation while an adver… | The user wants complementary AI tool pairing, a structured code review gate, an adversarial planning loop, or a background audi… |
| [api-breaking-change-scanner](skills/api-breaking-change-scanner/) | Scans a codebase for deprecated API parameters and patterns that break silently or return 400 errors when migrating t… | Choosing, migrating, or reviewing models. |
| [compensating-complexity-auditor](skills/compensating-complexity-auditor/) | Audit system prompts and agent pipelines for compensating complexity — scaffolding, procedural hacks, and duct tape b… | Upgrading models, reviewing system prompts, or preparing for model migration |
| [compute-availability-tracker](skills/compute-availability-tracker/) | Poll the status pages of major AI providers (Anthropic, OpenAI, Google, OpenRouter) and produce a current availabilit… | A model call is failing, before routing important work, or on a schedule to detect degradation early |
| [cross-model-peer-review](skills/cross-model-peer-review/) | Implements a cross-model peer review loop where Model A grades Model B's output on a structured rubric, catching erro… | Choosing, migrating, or reviewing models. |
| [gemini-rescue](skills/gemini-rescue/) | Get a second opinion from Google Gemini on the current diff, plan, or problem. | Claude is stuck, when an implementation needs adversarial review by a different vendor, or when a 1M-context audit is needed th… |
| [model-audit](skills/model-audit/) | Benchmark and compare model assignments across a multi-stage pipeline; produce a model-by-stage audit report with cos… | Choosing, migrating, or reviewing models. |
| [model-migration-preflight](skills/model-migration-preflight/) | Audit your prompts, system instructions, and Claude Code configuration before switching model versions. | Any model version upgrade that affects production workflows |
| [model-release-deep-dive](skills/model-release-deep-dive/) | Produce a structured capability-delta brief for any AI model release -- what actually changed beyond benchmark scores… | A new model release or when benchmarks alone don't explain real-world behavior changes |
| [model-router](skills/model-router/) | Classify a task and recommend the optimal model tier (Opus/Sonnet/Haiku) based on reasoning complexity, output length… | Choosing, migrating, or reviewing models. |
| [prompt-rewriter](skills/prompt-rewriter/) | Rewrite system prompts to strip compensating complexity and produce clean outcome-based prompts. | Modernizing prompts after a model upgrade, simplifying over-engineered system prompts, or converting procedural instructions to… |
| [provider-availability-scout](skills/provider-availability-scout/) | Scheduled task that probes model provider availability, pricing changes, restriction announcements, and API deprecati… | Diffs against last run and optionally updates a routing defaults file so your model routing layer stays current without manual… |

### 💰 Cost & Token Economics

*Token spend, boot tax, and inference-cost exposure.*

| Skill | What it does | When to use |
|---|---|---|
| [agent-cost-model](skills/agent-cost-model/) | Model token costs and optimization opportunities for any agent workflow, producing per-task costs, monthly burn, and… | When token spend or session cost needs auditing. |
| [ai-cost-exposure-audit](skills/ai-cost-exposure-audit/) | Walk through a three-prompt sequential audit of your organization's AI inference cost-structure exposure -- inventory… | You want to map your exposure to the AI inference cost curve before it breaks your budget |
| [boot-tax-monitor](skills/boot-tax-monitor/) | Monitor and alert when Claude Code session startup overhead (plugins, skills, MCP servers, CLAUDE.md chain) exceeds a… | Prevents the silent context bloat that eats your working memory before you type a single prompt |
| [context-cost-line-item-analyzer](skills/context-cost-line-item-analyzer/) | Decompose an agent's token spend into context-as-input vs output-as-output, identify the specific context drivers (st… | The user says "context cost breakdown", "why is context eating my budget", "context line items", "decompose my token spend", "w… |
| [pre-turn-budget-guardian](skills/pre-turn-budget-guardian/) | Enforce a token budget ceiling on Claude Code sessions by checking projected usage BEFORE each turn and halting with… | Prevents runaway loops and silent token burn |
| [token-burn-auditor](skills/token-burn-auditor/) | Audit the live Claude Code environment for token waste -- measures per-session overhead, flags system prompt bloat, c… | Real-time linter for AI workflows |

### 🔓 Portability & Vendor Independence

*Lock-in scoring, licensing, and exit-cost analysis.*

| Skill | What it does | When to use |
|---|---|---|
| [agent-memory-architecture-matrix](skills/agent-memory-architecture-matrix/) | Interactive decision matrix that walks a builder through choosing between provider-hosted memory (fast, locked) and s… | The user is designing an agent's memory layer, comparing memory backends, deciding between Claude memory, Mem0, Zep, SQLite, or… |
| [cross-runtime-skill-converter](skills/cross-runtime-skill-converter/) | Convert a Claude Code skill to Codex format or vice versa. | : "convert my skill to Codex", "port this skill to Claude Code", "make this skill work in both runtimes", "cross-runtime skill"… |
| [fair-agent-license-rubric](skills/fair-agent-license-rubric/) | Score an agent license or SaaS contract term sheet against a 9-trait rubric distinguishing fair agent licensing (tran… | Assessing lock-in or planning a vendor exit. |
| [inference-layer-ownership-auditor](skills/inference-layer-ownership-auditor/) | Map your AI stack to identify who controls each inference layer -- model provider, hosting, hardware -- and score sub… | A strategic AI vendor decision or during portability planning |
| [inference-vendor-lock-in-scorer](skills/inference-vendor-lock-in-scorer/) | Scan agent and skill manifests for AI vendor lock-in exposure -- hardcoded model names, non-portable API surfaces, ab… | A vendor migration or portability planning sprint |
| [license-audit](skills/license-audit/) | Takes a team's current AI tool inventory and work types, then outputs a one-page misfit memo identifying duplicative… | Interactive advisory skill for AI tool stack rationalization |
| [mcp-portability-auditor](skills/mcp-portability-auditor/) | Scan an agent stack (Claude Code plugins, Conway .cnw.zip files, Gemini extensions, ChatGPT GPTs) and flag which capa… | The user asks to audit their agent extensions, score MCP portability, check for vendor-proprietary extension formats, or plan a… |
| [platform-dependency-mapper](skills/platform-dependency-mapper/) | Audit an org's or individual's AI stack and produce an exit-cost estimate across four axes — data, integrations, beha… | The user asks to audit AI lock-in, map vendor dependencies, estimate switching costs, or assess platform risk on their AI stack |
| [poly-skill](skills/poly-skill/) | Convert any Claude Code skill to work in OpenAI Codex (or vice versa) by applying a structural adapter that handles n… | Assessing lock-in or planning a vendor exit. |
| [renewal-interrogation](skills/renewal-interrogation/) | Generate a vendor-specific SaaS renewal playbook for contracts where agent workloads are in scope. | The user says "renewal-interrogation", "renewal playbook", "SaaS renewal prep", "contract negotiation for agents", "help me pre… |

### 🧠 Context & Memory

*Context hygiene, memory architecture, and world-model design.*

| Skill | What it does | When to use |
|---|---|---|
| [claude-code-memory-architect](skills/claude-code-memory-architect/) | Interviews the user to design and build a personalized Claude Code memory system — choosing which building blocks (de… | A user wants to build, redesign, or consolidate their Claude Code memory layer |
| [claude-memory-architect](skills/claude-memory-architect/) | Interview-driven skill that designs a custom Claude Code memory system tailored to how the user actually works. | Clones open-source memory repos, audits their patterns, then builds a personal memory spec using building blocks — decay, promo… |
| [context-fork-guide](skills/context-fork-guide/) | Use when creating or modifying skills that do heavy research, search, or multi-tool work. | Creating or modifying skills that do heavy research, search, or multi-tool work |
| [context-hygiene](skills/context-hygiene/) | Reference for Claude Code context management. | "context is getting large", "session feels slow", "Claude forgot what we were doing", "how do I manage context" |
| [memory-fingerprint-architect](skills/memory-fingerprint-architect/) | Design a personalized Claude Code memory system by cloning existing open-source memory frameworks, auditing them with… | Saying "design my memory system", "build my memory", "personalize my CLAUDE.md memory", "memory architect", or "memory fingerpr… |
| [memory-system-assembler](skills/memory-system-assembler/) | Build a personalized Claude Code memory system by auditing open-source memory repos, cherry-picking patterns that mat… | Setting up memory for the first time, redesigning an existing memory system, or evaluating new memory patterns from the OSS eco… |
| [world-model-principles-scorecard](skills/world-model-principles-scorecard/) | Score an agent system or knowledge base against five principles that determine whether a world model compounds value… | Complementary to bitter-lesson-scorecard (architecture simplicity) — this measures knowledge/decision quality |
| [world-model-readiness-diagnostic](skills/world-model-readiness-diagnostic/) | Interactive diagnostic that maps an organization to a world model paradigm (vector DB, structured ontology, or signal… | Assessing organizational AI readiness, choosing a knowledge architecture, or starting a consulting engagement |

### 🏭 Build Pipelines & Code Comprehension

*Spec-first build loops, code comprehension, and migration safety.*

| Skill | What it does | When to use |
|---|---|---|
| [agent-readiness-audit](skills/agent-readiness-audit/) | Audit a codebase for agent-readiness across 8 pillars (style/validation, build systems, testing, docs, dev environmen… | The user says "audit readiness", "agent readiness", "codebase audit", "is this repo ready for agents", "readiness score", or wa… |
| [claude-architect-audit](skills/claude-architect-audit/) | Audit your Claude Code setup against Anthropic's 5 Certified Architect domains. | You want to level up your Claude Code configuration, prepare for the architect certification, or diagnose why Claude isn't perf… |
| [claude-design-to-code](skills/claude-design-to-code/) | Rapidly prototype UI wireframes and high-fidelity designs with Claude Design, then export to Claude Code with a singl… | Saying "design to code", "wireframe to code", "prototype in Claude Design", "export Claude Design", or "Claude Design handoff" |
| [code-review-memory](skills/code-review-memory/) | Accumulates repo-specific code review lessons and surfaces them before the next review of the same file or module. | Learns from recurring issues -- migration bugs, error-handling patterns, fixture quirks, security gaps -- so the same mistake i… |
| [comprehension-gate](skills/comprehension-gate/) | Pre-merge review that checks a PR diff not for syntax or test coverage, but for human understanding of implications -… | The user says "comprehension gate", "comprehension check", "understanding review", "implication review", "pre-merge comprehensi… |
| [comprehension-interview-loop](skills/comprehension-interview-loop/) | Conduct a Socratic pushback interview about something the user has built. | The user says "interview me", "comprehension interview", "Socratic review", "pushback interview", "do I actually understand thi… |
| [context-layer-generator](skills/context-layer-generator/) | Generate three structured context artifacts for any module or service -- a structural manifest (what it does, depende… | The user says "generate context layer", "context layer", "module context", "behavioral contracts", "decision log", "document th… |
| [dark-code-audit](skills/dark-code-audit/) | Scan a codebase to map where human comprehension has gone missing -- identifying modules with no decision logs, no be… | Onboarding to a new repo, auditing AI-generated code risk, assessing technical debt from comprehension gaps, or as a periodic h… |
| [explanation-artifact-generator](skills/explanation-artifact-generator/) | Walk through a 4-question comprehension template for any project artifact (repo, feature, tool) and produce a structu… | The user says "explanation artifact", "explain this project", "comprehension template", "4-question template", "what did I lear… |
| [image-to-implementation](skills/image-to-implementation/) | Generate a visual reference image for a UI or design concept, then produce a structured implementation prompt that ha… | Closes the "AI invents bad taste" failure mode by anchoring implementation to a concrete visual rather than a text description… |
| [mismatch-check](skills/mismatch-check/) | Diagnose whether your current agent tooling matches your actual problem. | Evaluating an existing agent setup, troubleshooting why an agent isn't delivering, or when someone says "why isn't this working… |
| [self-healing-claudex](skills/self-healing-claudex/) | Self-healing build pipeline with Planner/Builder + Codex adversarial review. | The user says "self-healing claudex", "claudex build", "PBJ with codex review", "two-vendor build loop", or wants Codex (not ju… |
| [self-healing-pipeline](skills/self-healing-pipeline/) | Self-healing build pipeline with Planner/Builder/Judge loop. | The user says "self-healing pipeline", "healing build", "auto-fix pipeline", "build with retries", or wants a resilient impleme… |
| [spec-gap-detector](skills/spec-gap-detector/) | Stress-test any agent prompt or specification for ambiguity, missing constraints, and edge cases that would cause ran… | During spec-first builds or code review. |
| [validated-data-migration](skills/validated-data-migration/) | Migrate a shoebox of inconsistent files (CSV, Excel, JSON, PDFs, VCF) into a clean SQLite database with rejection log… | Onboarding a client with legacy data or cleaning up a data dump before importing into a new system |

### 🧰 Skills, Tools & MCP

*Build, audit, convert, and maintain skills, tools, and MCP servers.*

| Skill | What it does | When to use |
|---|---|---|
| [agent-commerce-mcp-spec](skills/agent-commerce-mcp-spec/) | Take a business's existing storefront, catalog, or checkout flow and emit a complete MCP server spec that makes it ag… | Asked "make this storefront agent-callable", "generate MCP spec for my shop", "agent commerce spec", "MCP server for checkout"… |
| [agent-commerce-scaffold](skills/agent-commerce-scaffold/) | Scaffold a new agentic-commerce product with all 8 commercial-responsibility domains pre-stubbed -- Identity, Authori… | The user says "scaffold an agent product", "agent commerce scaffold", "init agentic product", "commerce agent init", "agent com… |
| [agent-infra-scorer](skills/agent-infra-scorer/) | Score any enterprise tool (Jira, Salesforce, Workday, Google Calendar, etc.) against a 5-test structural diagnostic t… | The user says "score my stack", "is Jira agent-ready", "agent infrastructure test", "which tools should I MCP-wrap", or wants t… |
| [agentify-docs](skills/agentify-docs/) | Converts existing human-oriented documentation (READMEs, runbooks, architecture docs, onboarding guides) into agent-r… | Asked to "write AGENTS.md", "make this doc agent-readable", "add agent instructions", "convert our runbook for agents", or "/ag… |
| [automation-platform-decision-guide](skills/automation-platform-decision-guide/) | Decision-support skill for choosing between agent automation platforms. | Given a use case and org context, recommends between scheduling platforms (n8n, Make, Workspace Agents), custom agent framework… |
| [book-to-skill](skills/book-to-skill/) | Create Claude Code skills from book/long-form prose. Reads a how-to chapter, extracts the teachable SOP, then converts it into a skill via skill-creator. Prose sibling of video-to-skill. | The user says "book to skill", "chapter to skill", "extract skill from this chapter", "turn this how-to into a skill", or "SOP from this writing" |
| [callable-audit](skills/callable-audit/) | Audit whether a business is callable by an AI agent end-to-end. | Asked "can an agent buy from this business", "is this service agent-callable", "callable audit", or "agent-commerce readiness" |
| [demotion-audit](skills/demotion-audit/) | Three-phase audit to determine whether a software tool or artifact should be demoted down the production-class ladder… | "demotion audit", "should I demote this tool", "is this tool still worth supporting", "downgrade this tool", "retire this tool" |
| [eval-agent](skills/eval-agent/) | Score any agent tool or platform against 3 structural questions (persistent memory, inspectable artifacts, compoundin… | Evaluating agent tools, comparing platforms, or deciding whether to trust a tool with a specific workflow |
| [failure-mode-tool-router](skills/failure-mode-tool-router/) | Given any task description, classify it into the right AI tool category and explain why common alternatives are wrong… | Prevents wasting time building agents for tasks that should use a different tool entirely |
| [get-api-docs](skills/get-api-docs/) | Fetch authoritative API documentation via the Context Hub (/chub) to verify model names, parameters, and endpoints be… | Building, auditing, or converting skills and tools. |
| [inbox-load-audit](skills/inbox-load-audit/) | Scans installed skills, plugins, MCP servers, hooks, and scheduled tasks to produce an inbox load score — how many in… | Building, auditing, or converting skills and tools. |
| [mcp-spec-generator](skills/mcp-spec-generator/) | Takes any SaaS product or internal system and outputs a complete MCP server specification — tool list, input/output s… | The user says "spec an MCP server for X", "write an MCP spec", "how would I wrap X as MCP", or wants a buildable blueprint befo… |
| [optimize-description](skills/optimize-description/) | Rewrite a skill's description field for maximum agent discoverability -- clear trigger conditions, explicit input/out… | Building, auditing, or converting skills and tools. |
| [prototype-classifier](skills/prototype-classifier/) | Classify any software tool, script, or AI artifact onto a 4-rung production-class ladder (Personal Tool → Team Beta →… | Never rounds up on aspiration — only classifies at the highest rung the artifact fully qualifies for |
| [skill-audit](skills/skill-audit/) | Audit your Claude Code skills directory, CLAUDE.md, and recent session patterns to surface candidates for new skills… | Building, auditing, or converting skills and tools. |
| [skill-maintenance](skills/skill-maintenance/) | Audit Claude Code skills for content quality against Anthropic best practices. | Forge runs maintenance cycles, when the user asks to check skill quality, or when reviewing skills before publishing |
| [tool-audit](skills/tool-audit/) | Audit a tool already in your stack against a semantic-depth rubric and emit a clear decision — Extend, Wrap, Replace… | Evaluating whether a current tool is worth keeping, improving, or replacing; when a tool is causing agent failures; or the user… |
| [tool-build-guide-generator](skills/tool-build-guide-generator/) | Generate a hands-on, machine-ready build guide for any tool or library — takes a tool name and produces a runnable, a… | Not a hello-world demo; a real build that develops genuine fluency |
| [tool-fluency-builder](skills/tool-fluency-builder/) | Turn any AI tool or framework from "heard of it" to "can build with it" by generating a machine-ready, hands-on build… | Goes beyond hello-world to produce a real, runnable project with annotated steps, pitfalls, and judgment calls |
| [tool-migration-brief](skills/tool-migration-brief/) | Converts enterprise tool audit results (which tools fail agent-infrastructure tests) into a leadership-ready migratio… | The user says "write a migration brief", "make this exec-ready", "brief for leadership on tool migration", or has scored their… |
| [video-to-skill](skills/video-to-skill/) | Create Claude Code skills from screen recordings of manual processes. | The user says "record to skill", "video to skill", "screen record skill", "extract skill from video", "SOP from recording", or… |

### 📊 Strategy & Business Analysis

*Briefings, stress-tests, market signals, and workflow-investment scoring.*

| Skill | What it does | When to use |
|---|---|---|
| [agent-system-touch-map](skills/agent-system-touch-map/) | Map every workflow to the SaaS systems it touches, the operations performed on each system, and the vendor billing me… | The user says "agent-system-touch-map", "map agent costs", "SaaS meter map", "what will this agent cost to run", "agent licensi… |
| [amdahl-ceiling-calculator](skills/amdahl-ceiling-calculator/) | Map a workflow's time allocation between AI-accelerable and non-accelerable steps, calculate the theoretical maximum… | The user says "amdahl ceiling", "workflow bottleneck", "max speedup", "where's my ceiling", "why isn't AI faster", "calculate s… |
| [arbitrage-audit](skills/arbitrage-audit/) | Map a business model to Nate's five exploitable-inefficiency categories (speed, reasoning, fragmentation, discipline… | The user wants an org-level diagnostic of where AI is about to collapse their margins or which parts of their business are most… |
| [brand-memory-probe](skills/brand-memory-probe/) | Probe how a brand appears in AI agent recall across multiple LLM providers. | Asked "does my brand appear in AI search", "brand memory probe", "AI recall audit", "how does ChatGPT describe us", or "agent s… |
| [buyer-questions](skills/buyer-questions/) | Pre-pitch preflight for enterprise AI sales. | Input a product description and buyer persona; outputs the two highest-probability deal-killing questions that buyer will ask… |
| [career-gap-map](skills/career-gap-map/) | Calculate an individual's AI exposure score (percent of weekly tasks AI can already compress to near-zero) and produc… | The user wants to audit their own job, plan a career pivot, evaluate how exposed their role is to the next model release, or bu… |
| [counterargument-stress-test](skills/counterargument-stress-test/) | Takes any strategic argument, business case, or thesis and systematically generates and addresses the N strongest cou… | Analyzing a market, workflow, or business decision. |
| [data-fabric-fit-assessor](skills/data-fabric-fit-assessor/) | Given a client's or team's existing data infrastructure (Microsoft 365, Google Workspace, Salesforce, custom RAG, etc… | Maps four major data fabrics to agent products optimized for each |
| [decision-interview-builder](skills/decision-interview-builder/) | Conduct a structured multi-turn interview through one real past decision the user made — walking situation, decision… | The user says "interview me about a decision", "build my judgment artifact", "extract my reasoning", "decision interview", "sho… |
| [executive-briefing](skills/executive-briefing/) | Takes a complex geopolitical, industry, or market event and produces a structured executive briefing with thesis, tra… | Analyzing a market, workflow, or business decision. |
| [gap-trace](skills/gap-trace/) | Run Nate's three-question industry diagnostic — what inefficiency is this built on, how fast can AI close it, what ne… | The user wants a fast (5-minute) diagnostic of any industry, product, or workflow without running the full arbitrage-audit |
| [geopolitical-signal-enricher](skills/geopolitical-signal-enricher/) | Enriches a market or technology signal with geopolitical context -- affected regions, supply chain nodes, timeline es… | Analyzing a market, workflow, or business decision. |
| [impl-arch-audit](skills/impl-arch-audit/) | Score an AI deployment against six implementation layers (workflow, data, authority, evaluation, audit trail, recovery). | Analyzing a market, workflow, or business decision. |
| [launch-filter](skills/launch-filter/) | Run any agent or AI product announcement through Nate's 5-question launch filter to get a structured verdict and go/w… | Evaluating a new agent platform, AI product release, or vendor announcement |
| [middleware-trap-detector](skills/middleware-trap-detector/) | Diagnose whether an agent deployment is falling into the "middleware trap" — wrapping legacy systems without redesign… | The user says "middleware trap", "deployment health", "is this deployment safe", "wrapping legacy", "automated bottleneck", or… |
| [news-narrative-decomposer](skills/news-narrative-decomposer/) | Takes a month of AI/tech news and extracts the structural shifts underneath the headlines -- classifying each story b… | Fights "absorbed a lot of takes but couldn't name what changed |
| [reasoning-extractor](skills/reasoning-extractor/) | Apply a four-question reasoning framework (situation → decision → risk → change) to any piece of work — from an indiv… | The user says "extract my reasoning", "reasoning trail", "document my thinking", "why I made this call", "annotate this decisio… |
| [semantic-score](skills/semantic-score/) | Score any AI product, vendor pitch, or announcement across 10 semantic-depth dimensions to distinguish "access-only"… | Evaluating AI tooling, reviewing a vendor pitch, auditing an integration, or the user says "/semantic-score", "semantic depth t… |
| [silver-platter](skills/silver-platter/) | Interview a business owner about their day-to-day tools, build a tailored data map, render a Pantry → Prep → Plate HT… | Audits existing Claude Code setups in the cwd before asking questions, so users who've started building don't get re-asked |
| [strategic-timing-matrix](skills/strategic-timing-matrix/) | Map your biggest pending decisions (hiring, fundraising, product launches, home purchase, job change) against macro e… | The user says "timing matrix", "when should I", "decision timing", "should I wait", "accelerate or delay", "macro timing", "str… |
| [stress-test-finder](skills/stress-test-finder/) | Interview the user about their current workload, surface the task they've been avoiding because it felt too messy or… | Deciding what to hand off next or when stuck in indecision about AI delegation |
| [thesis-cluster-detector](skills/thesis-cluster-detector/) | Ingests a batch of enterprise AI or technology news items (from RSS, Substack previews, or pasted headlines) and clus… | The user says "thesis cluster", "what's the underlying bet here", "cluster these stories", "detect the pattern", "what do these… |
| [weekly-signal-diff](skills/weekly-signal-diff/) | Tracks N companies across M categories, re-ranks using user context (projects, interests, priorities), and produces a… | Saves analysis back so signal compounds over time |
| [workflow-decomposer](skills/workflow-decomposer/) | Turn a function, role, or process description into a list of discrete, scoreable workflows — the pre-step before any… | "decompose this role", "break this function into workflows", "workflow decomposer", or before scoring any AI automation opportu… |
| [workflow-fit-scorer](skills/workflow-fit-scorer/) | Score a candidate workflow against 5 automation-fit properties and return a build / switch-tools / resolve-ambiguity… | Front-door diagnostic for any M2AI automation advisory engagement |
| [workflow-investment-scorer](skills/workflow-investment-scorer/) | Score each workflow on six dimensions (frequency, mistake cost, judgment, model-improvement trajectory, market maturi… | "score this workflow", "investment motion", "should I automate or buy", "build buy hire wait" |
| [workflow-tier-classifier](skills/workflow-tier-classifier/) | Paste a product description or pitch and get back a five-tier verdict (Decoration → Full Stack) with the missing impl… | Lightweight lead-magnet classifier and self-assessment tool |

### ✅ Deliverable Quality & Verification

*Hostile-reviewer passes and trust scoring before anything ships.*

| Skill | What it does | When to use |
|---|---|---|
| [artifact-contract-validator](skills/artifact-contract-validator/) | Validate a directory of claimed deliverables for file-type authenticity, formula presence in spreadsheets, embedded m… | Shipping any AI-generated deliverable set to a client or reviewer |
| [institutional-taste-encoder](skills/institutional-taste-encoder/) | Formalize implicit quality judgments, style preferences, and "taste" into structured constraint specifications that a… | The user says "encode my taste", "formalize quality rules", "taste encoder", "write my style constraints", "capture my preferen… |
| [knowledge-work-tests](skills/knowledge-work-tests/) | Generate evaluation criteria, acceptance checks, and scoring rubrics for knowledge work outputs -- the missing "test… | Defining quality gates for agent outputs, building acceptance criteria for delegated work, or reviewing knowledge work delivera… |
| [multi-artifact-work-package](skills/multi-artifact-work-package/) | Turn a messy business situation into a full deliverable set with an explicit artifact contract — Word, PowerPoint, Ex… | A client engagement, proposal, or agent task requires multiple coordinated output formats |
| [pretty-but-wrong](skills/pretty-but-wrong/) | Final hostile-reviewer pass on any AI-generated document, deck, or workbook before sharing. | Sharing any AI-generated deliverable with a decision-maker |
| [promotion-packet-auditor](skills/promotion-packet-auditor/) | Adversarial reviewer that scores a promotion packet or performance self-review for real judgment signal versus AI-gen… | The user says "audit my promo packet", "signal check", "promotion review", "does this show real impact", "what will a reviewer… |
| [recognizable-quality-test-generator](skills/recognizable-quality-test-generator/) | Generate an LLM-as-judge quality rubric from a workflow description and historical examples. | Building an agent that needs verifiable success criteria — converts "I know good when I see it" into a prompt-based pass/fail t… |
| [source-packet](skills/source-packet/) | Builds a structured source inventory from a set of files or documents before any artifact is created. | Starting any AI-generated deliverable (deck, report, workbook) to establish what is known, what is estimated, and where sources… |
| [trust-score](skills/trust-score/) | Score any AI-generated document, spreadsheet, or deck on a 0–100 trust scale across five verifiable dimensions. | Final review before sharing a deliverable. |
| [workbook-doctor](skills/workbook-doctor/) | Audits an existing or AI-generated Excel workbook for hidden risks before it is used in decisions. | Relying on any AI-generated spreadsheet for financial decisions, reporting, or client deliverables |

### 🗂️ Productivity & Workflow

*Sessions, handoffs, recall, calendar, and remote access.*

| Skill | What it does | When to use |
|---|---|---|
| [calendar-hygiene](skills/calendar-hygiene/) | Audit the next N days of a Google Calendar and surface hygiene issues before the user notices them -- back-to-back me… | Asking "calendar hygiene", "audit my calendar", "check my schedule", "what's wrong with my week?", "add buffers to my calendar"… |
| [decompose-goal](skills/decompose-goal/) | Decompose a free-text goal into an ordered list of atomic, dispatchable subtasks for any downstream executor — subagents, Agent Teams, DAG engines (LangGraph, CrewAI, n8n), headless cron, or human checklists. Downstream of goal-maker. | A multi-step instruction needs atomization before handoff; "decompose this goal", "break this into subtasks", "flatten this for dispatch", "turn this into a runnable task list" |
| [file-intel](skills/file-intel/) | Run the Gemini file processor on any folder — extracts content from PDF, PPTX, XLSX, DOCX, CSV, JSON, and any text fo… | Asked to "summarise this folder", "run file intel", "process these files", or a folder path is provided and summaries are needed |
| [gh-review](skills/gh-review/) | Review 1-3 GitHub repos against the current project and generate an HTML report with plain-speak summaries, relevance… | Ever the user shares a GitHub repo link and wants to understand how it fits their project, asks 'what is this repo?', 'how woul… |
| [goal-maker](skills/goal-maker/) | Turn a fuzzy idea or triaged item into a well-formed, runnable GOAL card — crisp objective, observable done-state, and a chosen execution shape (one-shot/loop/cron/subagents/worktree) with owner/sink/kill. Upstream of decompose-goal. | A raw idea needs sharpening into an objective with success criteria and a way to run it; "make a goal", "turn this into a goal/loop", "how should I run this" |
| [goal-os-optimize](skills/goal-os-optimize/) | Use /goal to run a self-directed optimization loop on your agentic OS — skills, CLAUDE.md, rules files, and projects. | A judge agent on a separate LLM validates each iteration |
| [life-engine](skills/life-engine/) | Reference implementation of a proactive Life Engine -- a time-windowed briefing loop that checks email, calendar, pro… | This is a REFERENCE IMPLEMENTATION showing one user's full wiring, not a plug-and-play template |
| [next](skills/next/) | Generate a continuation prompt for a fresh session and list current tasks. | Wrapping up a session or handing off work |
| [remote-channels](skills/remote-channels/) | Set up and configure Claude Code remote access via Telegram and Discord channels. | Guides through bot creation, plugin installation, security lockdown, and always-on configuration |
| [sparring-planner](skills/sparring-planner/) | Custom planning mode that challenges assumptions, asks deep multi-option questions, and explores multiple approaches… | The user says "plan", "let's think through", "help me decide", "sparring planner", "think this through with me", "let's figure… |
| [structured-elicitation](skills/structured-elicitation/) | A conversational skill that interviews the user across five layers of operational knowledge -- operating rhythms, rec… | The user says "elicitation", "interview me", "extract my workflows", "bootstrap agent persona", "build my SOUL.md", "help me do… |
| [tldr](skills/tldr/) | Save a summary of this conversation to the vault. | Key decisions, things to remember, next actions |
| [transaction-history-builder](skills/transaction-history-builder/) | Aggregate completed projects, commits, PRs, shipped features, and explanation artifacts into a running transaction hi… | The user says "transaction history", "build my portfolio", "aggregate my work", "show my trajectory", "living resume", "proof o… |
| [what-am-i-forgetting](skills/what-am-i-forgetting/) | Comprehensive agenda recall across all of your active projects, phases, gates, queued work, ideas, and cleanups. | Ever you ask "what's next", "what's on the agenda", "what am I working on", "what am I forgetting", "what's open", "what's in p… |

### 🎬 Content & Media

*Image and video prompt engineering and shorts pipelines.*

| Skill | What it does | When to use |
|---|---|---|
| [banana-maker](skills/banana-maker/) | Generate images using the Gemini image generation API with the Nano Banana Pro prompting methodology. | The user asks to generate, create, or make an image, picture, photo, illustration, or visual |
| [seedance-prompt](skills/seedance-prompt/) | Master AI Video Prompt Engineer for Seedance 2.0. | Converting a user concept into a high-quality, cinematic Seedance 2 |
| [seedance-shot-prompt](skills/seedance-shot-prompt/) | Use when generating a Seedance 2 video prompt for a linear forward-motion shot — transitions, chase shots, establishi… | Generating a Seedance 2 video prompt for a linear forward-motion shot — transitions, chase shots, establishing shots, A→B narra… |
| [viral-shorts-pipeline](skills/viral-shorts-pipeline/) | Generate and publish viral TikTok/YouTube Shorts from a single theme prompt. | Asked to "make viral videos", "generate TikToks", "create shorts", "run the viral pipeline", or "generate and post videos" |

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

`0.5.0` -- consolidated SkillForge into the pack (now 178 skills), sanitized for sharing, and reorganized the README into 13 divisions. Feedback welcome.
