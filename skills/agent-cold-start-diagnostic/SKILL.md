---
name: agent-cold-start-diagnostic
description: Evaluate an existing agent setup (CLAUDE.md, SOUL.md, memory files, cron config, agent.yaml) and score it on operational completeness -- flagging missing decision frameworks, vague delegation instructions, absent escalation rules, and gaps in rhythm/schedule coverage. Use when the user says "cold start diagnostic", "check agent config", "agent health score", "is my agent configured properly", "audit agent setup", or before deploying a new agent persona.
---

# Agent Cold-Start Diagnostic

Score any agent's configuration artifacts against an operational completeness rubric. Catches the gaps that make agents fail silently: missing escalation paths, vague task boundaries, absent rhythms, no error-handling policy.

Different from `/doctor` (which checks service connectivity) and `agent-readiness-audit` (which scores a *codebase* for agent compatibility). This skill scores the *agent's own config* -- the files that tell it who it is, what it owns, and how to behave.

## When to Use

- Before deploying a new the agent platform agent persona
- After editing an agent's CLAUDE.md / SOUL.md / memory files
- As a scheduled weekly audit across all active agents
- When an agent is producing poor results and you suspect config weakness

## Inputs

- Path to agent config directory (or auto-detect from cwd)
- Optional: agent name (for multi-agent setups where configs live in subdirectories)

## Phase 1: Discover Config Artifacts

Scan the target directory for all configuration files an agent might consume:

| File | Purpose | Required? |
|------|---------|-----------|
| `CLAUDE.md` | Core instructions, rules, conventions | Yes |
| `SOUL.md` / `USER.md` | Persona, user context, relationship model | Recommended |
| `agent.yaml` | Skill manifest, dispatch config | Yes (multi-agent) |
| `HEARTBEAT.md` | Recurring rhythms, scheduled checks | Recommended |
| `memory/*.md` | Persistent memory files | Recommended |
| `cron schedule` | Scheduled tasks (crontab, schedule-cli) | If agent has recurring duties |
| `.env` / `env.shared` | Environment variables, API keys | Check for referenced keys |
| `hooks/` | Pre/Post tool-use hooks | Optional |

Report: found artifacts, missing artifacts, unexpected files.

## Phase 2: Rubric Assessment (8 Dimensions)

Score each dimension 1-5 (1 = absent, 5 = production-grade):

### 2.1 Identity & Jurisdiction
- Does the agent know its name and role?
- Are jurisdiction boundaries explicit (what it owns vs. what it escalates)?
- Is there a "not my job" list to prevent scope creep?

### 2.2 Decision Frameworks
- Are recurring decisions documented with criteria (not just "use judgment")?
- Are thresholds specified (dollar amounts, severity levels, time limits)?
- Is there a default action for ambiguous cases?

### 2.3 Escalation Rules
- Is there a clear escalation path (who to notify, how, when)?
- Are escalation triggers specific (not just "when unsure")?
- Is there a timeout/deadman switch if the escalation target doesn't respond?

### 2.4 Task Specification Quality
- Are delegated tasks specified with inputs, outputs, and definition of done?
- Are edge cases documented?
- Is there a "what success looks like" section?

### 2.5 Operating Rhythms
- Are daily/weekly/monthly rhythms defined?
- Do scheduled tasks cover the stated rhythms?
- Are there gaps (e.g., "weekly report" mentioned but no cron entry)?

### 2.6 Memory & Context
- Does the agent have persistent memory files?
- Is there a memory strategy (what to remember vs. what to forget)?
- Are memory files organized (not a single dump file)?

### 2.7 Error Handling
- Is there a policy for what to do when tools fail?
- Are retry limits specified?
- Is there a "graceful degradation" plan (what to do when a dependency is down)?

### 2.8 Style & Communication
- Are output format rules explicit (markdown, plain text, length)?
- Is the agent's tone/voice defined?
- Are platform constraints documented (Telegram limits, email formatting)?

## Phase 3: Cross-Reference Validation

Check for internal consistency:

1. **Skill manifest vs. available skills**: Does `agent.yaml` reference skills that actually exist?
2. **Cron vs. rhythms**: Do scheduled tasks match the stated operating rhythms?
3. **Memory references**: Do CLAUDE.md rules reference memory files that exist?
4. **Environment variables**: Are referenced env vars actually set in the environment?
5. **Escalation targets**: Are escalation targets (other agents, humans) reachable?

## Phase 4: Produce the Report

```
AGENT COLD-START DIAGNOSTIC
============================
Agent: <name>
Config root: <path>
Date: <date>

ARTIFACTS FOUND
  [x] CLAUDE.md (1247 lines)
  [x] agent.yaml (12 skills listed)
  [ ] SOUL.md -- MISSING (recommended)
  [x] memory/ (3 files)
  [ ] HEARTBEAT.md -- MISSING (recommended)

DIMENSION SCORES
  Identity & Jurisdiction:  4/5  -- clear role, missing "not my job" list
  Decision Frameworks:      2/5  -- only 1 of 6 recurring decisions documented
  Escalation Rules:         1/5  -- no escalation path defined
  Task Specification:       3/5  -- inputs defined, outputs vague
  Operating Rhythms:        3/5  -- 2 of 4 rhythms have matching cron entries
  Memory & Context:         4/5  -- organized, no retention policy
  Error Handling:           1/5  -- no error policy found
  Style & Communication:    5/5  -- detailed format rules

OVERALL SCORE: 23/40 (57%) -- NEEDS WORK

CROSS-REFERENCE ISSUES
  [!] agent.yaml lists skill "social-media" but it is not installed
  [!] CLAUDE.md references $SLACK_WEBHOOK but env var is not set
  [!] "Monday standup" rhythm has no matching cron entry

TOP 3 FIXES (highest impact)
  1. Add escalation rules -- agent has no way to ask for help
  2. Document decision frameworks for recurring judgments
  3. Add HEARTBEAT.md with cron entries for stated rhythms
```

## Phase 5: Optional -- Generate Fix Stubs

If the user approves, generate skeleton files for the highest-impact gaps:
- Stub SOUL.md with sections to fill
- Stub HEARTBEAT.md with rhythm entries derived from CLAUDE.md
- Stub escalation-rules section for CLAUDE.md

## Source Attribution

Extracted from Nate's Newsletter (2026-04-15): "Your agent needs a SOUL.md you can't write from scratch." Core insight: agents fail silently when their config artifacts have gaps in operational completeness, and most users don't know what "complete" looks like.

## Verification

After running the diagnostic:
- [ ] All 8 dimensions scored with evidence (not guessed)
- [ ] Cross-reference checks ran against live filesystem
- [ ] Report includes actionable fix recommendations
- [ ] No false positives from optional/irrelevant dimensions
