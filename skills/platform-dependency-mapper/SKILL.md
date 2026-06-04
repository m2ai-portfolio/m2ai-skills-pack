---
name: platform-dependency-mapper
description: Audit an org's or individual's AI stack and produce an exit-cost estimate across four axes — data, integrations, behavioral context, and billing. Outputs a ranked dependency map and a "what you'd lose if you left tomorrow" report. Use when the user asks to audit AI lock-in, map vendor dependencies, estimate switching costs, or assess platform risk on their AI stack.
---

# Platform Dependency Mapper

Produces a structured audit of AI platform lock-in across four axes. Designed for M2AI AI Chief of Staff engagements and personal stack reviews.

## When to Invoke

Trigger on: "audit my AI stack", "map my dependencies", "platform lock-in risk", "what would I lose if I switched off Claude/OpenAI/Gemini", "exit cost estimate", "vendor risk review".

## Inputs

Ask the user for (one question at a time if missing):

1. **Scope** — personal stack or org stack? If org, how many users?
2. **Primary platforms** — which AI tools are in daily use? (Claude Code, ChatGPT, Gemini, Copilot, Cursor, custom agents, etc.)
3. **Integrations** — connected services (Gmail, Slack, GitHub, Notion, Drive, MCP servers, custom plugins)
4. **Billing** — approximate monthly spend per platform, contract terms (monthly/annual/enterprise)
5. **Stored artifacts** — conversation history, custom instructions, GPTs/Projects/Skills, memory/context files

## Four-Axis Framework

Score each platform 0-5 on each axis (0 = trivial to leave, 5 = severe lock-in):

### 1. Data Lock-In
- Conversation history exportability (JSON? markdown? proprietary blob?)
- File/artifact storage (local vs cloud-only)
- Custom knowledge bases (RAG indices, uploaded docs)
- Whether exports preserve structure and metadata

### 2. Integration Lock-In
- Number of active connectors/MCP servers/plugins
- Proprietary extension formats (e.g. `.cnw.zip`, custom GPTs, Gemini extensions)
- Portability to open standards (MCP) vs vendor-specific
- Reconfiguration cost on migration

### 3. Behavioral Context Lock-In
- Accumulated user preferences, communication style, decision heuristics the platform has learned
- Custom instructions, CLAUDE.md-equivalents, system prompts
- Agent routines and scheduled tasks
- **This is the hardest to export and the most underrated lock-in axis.** Flag explicitly.

### 4. Billing / Commercial Lock-In
- Contract length and early termination terms
- Volume discounts tied to seat counts
- Prepaid credits or committed spend
- Enterprise SSO/admin tooling that would need rebuilding

## Output Format

```markdown
# Platform Dependency Report — {date}

## Stack Summary
{bullet list of platforms in scope}

## Dependency Scores
| Platform | Data | Integrations | Behavior | Billing | Total |
|----------|------|--------------|----------|---------|-------|
| ...      | 0-5  | 0-5          | 0-5      | 0-5     | /20   |

## Ranked Exit Cost
1. {highest-lock-in platform} — total N/20 — {1-line rationale}
2. ...

## "If You Left Tomorrow"
For each platform, a paragraph: what you'd lose immediately, what's recoverable with effort, what's permanently gone.

## Remediation Playbook
- Quick wins (export X, mirror Y to MCP, document Z)
- Medium effort (migrate integration A to open standard)
- Strategic (behavioral context snapshotting, portable memory layer)

## Red Flags
{any axis scoring 5 gets a red flag with an action item}
```

## Verification

Before finishing, confirm:
- [ ] All platforms the user mentioned are scored
- [ ] Behavioral Context axis has an explicit callout (it is the most-missed)
- [ ] Output includes a concrete remediation action for each axis scoring 4 or 5
- [ ] Report is saved to a user-specified path or `/tmp/platform-dependency-report-{date}.md`

## Source

Nate's Newsletter — "512,000 Lines of Leaked Code Reveal the Lock-In Strategy Coming for Your AI Stack" (2026-04-08). Original thesis: the real AI lock-in is not data or files but accumulated behavioral context, which has no export path.
