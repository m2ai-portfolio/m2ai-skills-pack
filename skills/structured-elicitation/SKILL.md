---
name: structured-elicitation
description: A conversational skill that interviews the user across five layers of operational knowledge -- operating rhythms, recurring decisions, dependencies, institutional knowledge, and friction -- with checkpoint approvals between each layer. Generates agent config artifacts (SOUL.md, USER.md, HEARTBEAT.md, operating-model.json, schedule-recommendations.json). Use when the user says "elicitation", "interview me", "extract my workflows", "bootstrap agent persona", "build my SOUL.md", "help me document what I do", or when onboarding a new agent that needs to understand a human's work patterns.
---

# Structured Elicitation -- Operational Knowledge Extraction

Interview a user across five layers of operational knowledge, then generate the config artifacts an agent needs to act on that knowledge. Addresses the core bottleneck: users can't describe their own work at the resolution an agent needs because expertise compiles into invisible judgment.

Different from `vault-setup` (which builds an Obsidian vault structure from a brief description). This skill does deep multi-turn elicitation with checkpoints, producing agent-consumable config files, not vault folders.

## When to Use

- Bootstrapping a new the agent platform agent persona from scratch
- Onboarding a client for CoWork skill packages
- When an existing agent keeps failing because its config was written from guesswork
- When the user says "I don't know how to describe what I do" -- this skill does the extraction

## Prerequisites

- 30-45 minutes of user availability (five interview layers)
- User should be at their workstation (they may need to reference tools, calendars, etc.)

## Phase 1: Framing

Display this message, then wait:

---

**I'm going to interview you across 5 layers to extract what an agent needs to know to do your job. Each layer takes about 5-8 minutes. After each layer I'll show you what I captured and you can correct anything before we move on.**

**The 5 layers:**
1. Operating Rhythms -- what you do daily, weekly, monthly
2. Recurring Decisions -- judgments you make repeatedly
3. Dependencies -- people, tools, and systems you rely on
4. Institutional Knowledge -- things you know that aren't written down
5. Friction -- where things break, slow down, or get dropped

**Ready to start?**

---

## Phase 2: Layer 1 -- Operating Rhythms

Ask these questions one at a time. Wait for each answer before asking the next. Probe for specifics (times, frequencies, triggers).

1. Walk me through a typical Monday morning. What do you do in the first hour?
2. What are the things you do every single day, no exceptions?
3. What happens weekly? Any specific days for specific tasks?
4. Monthly or quarterly rhythms -- reports, reviews, planning sessions?
5. What's the first thing you check when you sit down? Last thing before you stop?

**Capture format** (internal, don't show raw):
```json
{
  "rhythms": [
    {"name": "Morning triage", "frequency": "daily", "time": "09:00", "duration_min": 30, "trigger": "session start", "description": "Check email, Slack, review overnight alerts"},
    ...
  ]
}
```

**Checkpoint**: Show the user a clean summary of captured rhythms. Ask: "Anything missing or wrong?" Correct before proceeding.

## Phase 3: Layer 2 -- Recurring Decisions

1. What decisions do you make more than once a week?
2. For each: what information do you need to make that decision?
3. What's the threshold or rule of thumb you use? (e.g., "if it's under $500, approve it")
4. When do you escalate instead of deciding yourself?
5. What's the worst that happens if you get this decision wrong?

**Capture format**:
```json
{
  "decisions": [
    {"name": "PR approval", "frequency": "daily", "inputs": ["diff size", "test coverage", "author"], "threshold": "approve if <200 lines and tests pass", "escalation": "flag for review if touches auth module", "risk": "medium"},
    ...
  ]
}
```

**Checkpoint**: Show summary. Confirm or correct.

## Phase 4: Layer 3 -- Dependencies

1. Who do you depend on to get your work done? (people, teams, services)
2. For each: what do you need from them, and how often?
3. What tools or systems would stop your work if they went down?
4. What information do you consume regularly? (dashboards, reports, feeds)
5. Who depends on YOU? What do they need and when?

**Capture format**:
```json
{
  "dependencies": {
    "upstream": [{"name": "Design team", "what": "approved mockups", "frequency": "per sprint", "channel": "Figma + Slack"}],
    "downstream": [{"name": "QA", "what": "deployed features", "frequency": "per PR merge", "channel": "GitHub + Slack"}],
    "tools": [{"name": "GitHub", "criticality": "blocking", "fallback": "none"}],
    "information": [{"name": "Sentry dashboard", "frequency": "daily", "purpose": "error triage"}]
  }
}
```

**Checkpoint**: Show summary. Confirm or correct.

## Phase 5: Layer 4 -- Institutional Knowledge

1. What do you know that isn't written down anywhere?
2. If you were training your replacement, what would take the longest to explain?
3. Are there unwritten rules about how things work here? (politics, preferences, history)
4. What do people come to you for that they can't get from docs or tools?
5. What have you learned the hard way that you wish someone had told you?

**Capture format**:
```json
{
  "institutional_knowledge": [
    {"domain": "deployment", "insight": "Never deploy on Fridays -- not a rule, but the on-call team is skeleton crew", "source": "experience", "importance": "high"},
    ...
  ]
}
```

**Checkpoint**: Show summary. Confirm or correct.

## Phase 6: Layer 5 -- Friction

1. What takes longer than it should?
2. Where do things get dropped or forgotten?
3. What do you procrastinate on and why?
4. What recurring problems never get fully solved?
5. If you had an assistant who could do anything, what would you hand off first?

**Capture format**:
```json
{
  "friction": [
    {"area": "expense reports", "symptom": "always 2 weeks late", "cause": "manual data entry from receipts", "impact": "finance complaints", "delegatable": true},
    ...
  ]
}
```

**Checkpoint**: Show summary. Confirm or correct.

## Phase 7: Artifact Generation

From the captured data, generate the following files:

### SOUL.md
Agent persona document: who the user is, how they think, what they value, communication style (inferred from interview responses).

### USER.md
User context: role, responsibilities, key relationships, tools, preferences.

### HEARTBEAT.md
Recurring rhythms as a checklist with frequencies and triggers. Maps directly to cron scheduling.

### operating-model.json
Structured JSON combining all five layers -- machine-readable for agent consumption.

### schedule-recommendations.json
Recommended cron schedules derived from operating rhythms, with suggested agent assignments.

## Phase 8: Review & Deploy

1. Show all generated artifacts to the user for review
2. Ask which agent(s) should consume these files
3. Write files to the appropriate config directories
4. If the agent platform: offer to update agent.yaml with new config references

## Source Attribution

Extracted from Nate's Newsletter (2026-04-15): "Your agent needs a SOUL.md you can't write from scratch." Core insight: the biggest bottleneck in the agent space is that users can't describe their own work at the resolution an agent needs, because expertise compiles into invisible judgment. The five-layer interview structure is adapted from Nate's elicitation framework.

## Verification

- [ ] All 5 layers completed with user checkpoint approval
- [ ] Generated artifacts are internally consistent (rhythms match schedule, decisions reference correct dependencies)
- [ ] No placeholder or template text left in generated files
- [ ] User reviewed and approved all output artifacts
