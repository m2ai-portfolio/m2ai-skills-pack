---
name: source-packet
description: Builds a structured source inventory from a set of files or documents before any artifact is created. Assigns each source an ID, status, and reliability tier; produces a conflict log where sources disagree; flags human-decision points. Use before starting any AI-generated deliverable (deck, report, workbook) to establish what is known, what is estimated, and where sources contradict each other.
---

# Source Packet Builder

Produces a structured map of source materials before any document or deliverable is created. The most common failure mode in AI-generated output is not bad writing — it is bad sourcing. Sources go in unexamined and claims come out unqualified. This skill makes the source map the first deliverable, not an afterthought.

Running this before creating a deck, report, or workbook forces the user to confront what they actually know versus what they are assuming. The source packet then constrains all downstream generation: the artifact may only make claims traceable to the packet.

## When to Invoke

Trigger on: "source-packet", "map my sources", "inventory my files", "source inventory", "organize my research", "what do I actually have", "prep my sources before I build", or any time the user has a folder of documents they intend to turn into a deliverable.

## Phase 1: Scope the Packet

Ask the user:
1. **What deliverable is this for?** (board deck, investor memo, internal report, workbook, proposal)
2. **Who is the audience and what decision will they make?**
3. **What files or sources do you have?** (list them or paste their names)

This shapes how sources are classified. A board-facing financial projection has stricter sourcing requirements than an internal brainstorm.

## Phase 2: Inventory Each Source

For each file or source provided, produce one row in the inventory table:

| Field | Description |
|-------|-------------|
| **ID** | Short unique code (S01, S02, ...) assigned in intake order |
| **Name** | File name or source title |
| **Date** | Date of the source (publication, report date, data pull date) |
| **Owner** | Who produced it (internal team, vendor, public source, unknown) |
| **Type** | One of: primary data / secondary research / internal estimate / raw data / background context |
| **Status** | One of: current / superseded / unverified / estimate |
| **Key claims** | 1–3 specific facts or figures this source contributes |
| **Limitations** | Coverage gaps, age, sample size, methodology concerns |

Output the inventory as a markdown table.

## Phase 3: Classify Each Source by Reliability

After inventorying, tag each source with a reliability tier:

| Tier | Definition |
|------|-----------|
| **Verified** | Primary data from a known, dated, accountable source |
| **Referenced** | Secondary research — citable but one step removed |
| **Estimated** | Internal projections, assumptions, or back-of-envelope calculations |
| **Unverified** | Origin, date, or methodology unclear |

Flag any claim in the downstream deliverable that will rely solely on Estimated or Unverified sources. These require explicit labeling in the artifact.

## Phase 4: Build the Conflict Log

Identify any instances where two or more sources contradict each other. For each conflict:

```
Conflict [C01]:
  Topic: [what they disagree on]
  Source A [ID]: [claim, value, or conclusion]
  Source B [ID]: [claim, value, or conclusion]
  Delta: [how large is the discrepancy?]
  Human decision required: [yes/no — can this be resolved by the data, or does a person need to choose?]
  Recommended resolution: [use most recent / use primary data / flag as range / escalate]
```

If no conflicts exist, state that explicitly.

## Phase 5: Flag Human-Decision Points

List any items where the source packet is insufficient to support a specific claim the deliverable will need to make:

```
Gap [G01]:
  Claim needed: [what the deliverable must assert]
  Available support: [what the packet currently provides]
  Gap: [what is missing]
  Resolution options: [collect additional data / label as estimate / omit the claim]
```

## Phase 6: Output the Source Packet

Produce a single markdown document with four sections:

```markdown
# Source Packet — [Deliverable Name]

**Created**: [date]
**Deliverable**: [type and audience]
**Total sources**: [N] | Verified: [N] | Referenced: [N] | Estimated: [N] | Unverified: [N]

---

## Source Inventory

[table from Phase 2]

---

## Conflict Log

[conflicts from Phase 4, or "No conflicts found."]

---

## Gaps Requiring Human Decision

[gaps from Phase 5, or "No gaps identified."]

---

## Usage Constraints

The artifact derived from this packet:
- May assert as fact only claims supported by Verified or Referenced sources
- Must label all Estimated figures explicitly as estimates
- Must resolve all conflicts before finalizing any claim that depends on conflicting sources
- Must address all gaps (collect data, label, or omit) before distribution
```

## Verification

- [ ] Every source has an ID, status, and reliability tier
- [ ] All conflicts are logged — none silently resolved by choosing one source
- [ ] All gaps requiring human decision are listed, not assumed away
- [ ] Usage constraints included so downstream generation is bound by the packet

## Source

Nate Jones newsletter (2026-05-27) — "The deck got forwarded with a wrong number inside. The Trust Layer's two-model review is built to catch exactly that." The source packet is Stage 1 of the Trust Layer workflow: "the stage most people skip" and "determines whether the final file can be trusted." Core insight: the first deliverable in any AI-assisted document workflow should be a map of the material, not the material itself.
