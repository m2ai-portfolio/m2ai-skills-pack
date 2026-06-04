---
name: license-audit
description: Takes a team's current AI tool inventory and work types, then outputs a one-page misfit memo identifying duplicative tools, underserved work classes, and wasted license spend. Interactive advisory skill for AI tool stack rationalization.
---

# License Audit

AI tool stacks accumulate faster than they get rationalized. Most teams end up with Copilot, Cursor, Claude, ChatGPT, Perplexity, and a few others all running simultaneously — each with a separate license fee, overlapping capabilities, and no clear routing rule for which tool to use when. This skill produces a structured misfit memo that identifies waste and recommends cuts or consolidations.

## Trigger

Use when the user says "/license-audit", "audit our AI tools", "we're paying for too many AI tools", "which AI licenses should we cut", "AI tool rationalization", "which tools are duplicative", or when evaluating an AI budget for a team or organization.

## Phase 1: Intake

Collect the team's current AI tool inventory. If the user provides a list, proceed. If not, prompt:

> "List every AI tool your team pays for, even if only some people use it. Include the license tier if you know it (e.g., 'ChatGPT Team', 'GitHub Copilot Business', 'Claude Pro')."

Then collect:

1. **AI tool inventory** — tool name + license tier + rough monthly cost if known
2. **Team size** — how many people does the license cover?
3. **Work types** — what are the 3–5 most common AI-assisted tasks the team does? (e.g., coding, document drafting, research, CRM data entry, customer support, image generation)
4. **Power users** — are there specific individuals who use specific tools heavily? Or is usage broadly distributed?
5. **Locked-in tools** — are any tools bundled with existing contracts (e.g., Copilot bundled with M365, ChatGPT bundled with enterprise agreement)?

## Phase 2: Capability Overlap Matrix

For each tool in the inventory, map which of the team's work types it serves:

| Tool | Coding | Writing/Research | Data/CRM | Customer-facing | Creative | Other |
|------|--------|-----------------|---------|-----------------|---------|-------|
| {tool 1} | ✓ | ✓ | — | — | — | |
| {tool 2} | — | ✓ | — | — | — | |
| ...  | | | | | | |

Flag columns where 2+ tools both serve the same work type with a comparable fit level — these are the duplication candidates.

## Phase 3: Misfit Detection

### Misfit Type 1 — Duplication

Two or more tools with nearly identical capability for the same work type. One can be cut without loss.

**How to identify:** Same column has 2+ strong fits (✓) from different tools serving the same work type with no meaningful differentiation for this team.

### Misfit Type 2 — Underserved Work Type

A work type the team does regularly but no tool serves well (no ✓ in that column), or the tool serving it is poorly matched (wrong data access, no integration, high friction).

**How to identify:** A common work type has no ✓, or the team reports high friction for that type.

### Misfit Type 3 — Orphaned License

A tool the team pays for but uses rarely or only one person uses. License cost is not justified by breadth of adoption.

**How to identify:** Ask "who uses this, and how often?" If the honest answer is "mostly {name}, occasionally" — this is an orphan.

### Misfit Type 4 — Bundled Tool Being Ignored

A capable tool is bundled with an existing contract (e.g., Copilot in M365, Gemini in Google Workspace) but the team pays for a third-party alternative doing the same thing. The bundle is being wasted.

**How to identify:** Tool inventory has a bundled item (zero marginal cost) and a paid third-party alternative covering the same work type.

## Phase 4: Consolidation Recommendations

For each misfit identified:

1. **Duplication** — which tool to keep and which to cut, with a one-sentence rationale (keep the one with better data fabric fit, lower cost, or broader adoption).
2. **Underserved work type** — which existing tool could cover it with configuration, or what to add.
3. **Orphan** — recommend downgrading to a free tier, canceling, or repurposing the license.
4. **Ignored bundle** — recommend switching to the bundled tool and canceling the paid duplicate.

## Phase 5: Output

```
AI LICENSE AUDIT — MISFIT MEMO
================================
Team size:      {N}
Tools audited:  {N tools}
Monthly spend:  ~${total if known, or "unknown"}

CAPABILITY OVERLAP MATRIX
{table from Phase 2}

MISFITS FOUND
-------------
{For each misfit:}

[DUPLICATION] {Tool A} ↔ {Tool B}
  Both cover: {work type}
  Recommendation: Keep {Tool A}, cancel {Tool B}
  Rationale: {one sentence}
  Monthly savings: ~${amount if known}

[UNDERSERVED] {Work type}
  Current coverage: {tool or "none"}
  Issue: {why it's underserved}
  Fix: {use {existing tool} with {config change} | add {specific tool}}

[ORPHAN] {Tool name}
  Used by: {N people, N times/week}
  Recommendation: {cancel | downgrade to free tier | reassign license}
  Monthly savings: ~${amount if known}

[IGNORED BUNDLE] {Bundled tool} vs. {Paid tool}
  Bundle: {tool included in {contract}, $0 marginal cost}
  Duplicate: {paid tool} — ~${cost}/mo
  Recommendation: Switch to bundle, cancel paid tool
  Monthly savings: ~${amount}

SUMMARY
-------
Total addressable waste:  ~${total}/mo (if costs provided)
Underserved work types:   {N}
Recommended cuts:         {tool list}
Recommended additions:    {tool list or "none"}

Next step:
  {concrete action — e.g., "Cancel Perplexity Pro (orphan, 1 user) and 
   enable Gemini for Workspace (already bundled) for research work"}
================================
```

## What This Does NOT Do

- Does not negotiate contracts or evaluate vendor pricing outside what the user provides.
- Does not audit security or compliance posture of individual tools.
- Does not evaluate model quality or accuracy — use a benchmark review for that.
- Does not account for tools under evaluation or trial — focus on what the team currently pays for.
- Does not generate a vendor shortlist for new tools. Use a separate evaluation framework for additions.

## Source

Framework derived from Nate Kadlac newsletter (2026-04-29): "The 5-question filter I run every agent launch through." Nate's framing of the enterprise decision as "which agents fit which ecosystems" and the need to route work types to the right tool (rather than evaluating by benchmark) grounds this skill. The four misfit types and consolidation heuristics are purpose-built extensions for tool rationalization advisory work.
