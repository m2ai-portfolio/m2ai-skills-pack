---
name: agentify-docs
description: >
  Converts existing human-oriented documentation (READMEs, runbooks, architecture docs,
  onboarding guides) into agent-readable equivalents with explicit boundaries, permission
  declarations, and "what to do when stuck" instructions. Use when asked to "write
  AGENTS.md", "make this doc agent-readable", "add agent instructions", "convert our
  runbook for agents", or "/agentify-docs".
---

# Agent-Readable Docs Converter

Rewrites human-oriented internal documentation into agent-ready format. Most internal
docs assume a person who already understands the environment. Agents need explicit
boundaries, not implied conventions.

## Trigger

Use when the user says "/agentify-docs", "write AGENTS.md", "make this doc agent-readable",
"convert this runbook for agents", "add agent instructions to this README", or wants
to produce agent-facing documentation from an existing human-facing doc.

## Phase 1: Ingest Source Document

Ask the user to paste or point to the source document. Acceptable inputs:

- A raw README, runbook, or architecture doc (pasted text or file path)
- A description of what the doc covers (skill will draft from scratch)
- A URL (user pastes the text; skill does not fetch)

Ask: "What type of doc is this — README, runbook, architecture overview, onboarding
guide, or something else?" This informs the output template.

## Phase 2: Identify Implicit Assumptions

Analyze the source document for assumptions that humans fill in from context but agents
cannot:

| Category | Examples |
|---|---|
| **Access rights** | "you'll need access to the staging database" — agents need explicit grant or deny |
| **Implicit knowledge** | "deploy the usual way" — agents need a literal command sequence |
| **Judgment calls** | "use your discretion" — agents need a decision rule or escalation path |
| **Scope limits** | "feel free to refactor" — agents need explicit blast-radius limits |
| **Error handling** | "if something breaks, ping #oncall" — agents need structured error paths |
| **Environment state** | "assuming your venv is active" — agents need environment setup steps |

List identified assumptions to the user before proceeding. If none are found, say so.

## Phase 3: Rewrite for Agent Readability

Produce the agent-readable document with these sections (include only those relevant to
the source doc type):

```markdown
# [Document Title] — Agent Instructions

## Scope
What this document covers. What it does NOT cover (explicit exclusion is as important
as inclusion for agents).

## Prerequisites
List every tool, credential, environment variable, and system access the agent needs
before starting. No implicit "you should already have this."

## Permitted Actions
What the agent is allowed to do within this document's scope.
- Be specific: "can create files under ./src/" not "can modify code"
- List each distinct action type

## Prohibited Actions
What the agent must NOT do without explicit human instruction.
- Include the blast-radius reason: "DO NOT drop tables — no automated rollback exists"
- Cover infrastructure, credentials, external APIs, data mutations, and communication

## Step-by-Step Procedures
[Subsection per named procedure from the source doc]

### [Procedure Name]
1. [Exact command or action]
2. [Exact command or action]
   - If condition X: do Y
   - If condition Z: escalate (see Escalation section)

## Known Failure Modes
| Failure | Symptom | Recovery |
|---|---|---|
| [name] | [what the agent will observe] | [exact recovery steps or escalation] |

## Escalation
When the agent should stop and surface to a human:
- Condition A → message: "[what to say]"
- Condition B → message: "[what to say]"
Never continue past an escalation point without human confirmation.

## Environment Setup
Commands the agent must run before the main procedure (idempotent if possible):
```
[setup commands]
```

## Verification
How the agent confirms the procedure succeeded:
- Expected output: [exact string or pattern]
- Expected side effect: [observable state change]
- If verification fails: [exact recovery or escalation step]
```

## Phase 4: Gap Report

After producing the rewritten document, output a brief gap report:

```
GAPS FILLED:
- [N] implicit assumptions made explicit
- [N] judgment calls replaced with decision rules
- [N] error paths defined

STILL REQUIRING HUMAN INPUT:
- [Any gaps that couldn't be resolved from the source doc alone]
```

If the user needs to fill in gaps, ask for the information and iterate.

## Phase 5: Placement Recommendation

Advise where the output should live:

- **AGENTS.md** at repo root — for project-wide agent instructions (analogous to CLAUDE.md)
- **AGENTS.md** in a subdirectory — for module-specific agent instructions
- Inline in the README under an `## For Agents` section — if the repo uses a single doc

Output as a file write if the user confirms the path.

## Notes

- Rewriting is additive: the human-facing version of the doc is not replaced. The agent
  version supplements it or lives alongside it.
- Short runbooks (under 200 lines) typically need only Phases 2-3. Complex architecture
  docs may need all phases.
- Prefer explicit over flexible: agents default to the literal instruction, not the spirit.
  When in doubt, add a prohibition rather than leaving scope ambiguous.

## Source

Derived from Nate Kadlac newsletter (2026-05-25): "AI made your app teams 10x faster.
Nobody gave your platform team 10x the headcount." — "most internal docs assume a person
who already understands the environment. Agents need explicit boundaries."
