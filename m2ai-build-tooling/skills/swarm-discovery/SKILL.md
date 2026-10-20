---
name: swarm-discovery
description: "Map an unfamiliar repository with a cheap, verified agent swarm before any planning work: one read-only Haiku worker per module fills a fixed card, Sonnet skeptics vote on every claim of a flagged card, Haiku hunters look for missed IO and risks until two quiet rounds, and one Opus agent writes the architecture map from verified findings only. Never edits code. Use on first contact with a repo, service tree or data store, before a refactor, migration or ETL design, or when the user says swarm discovery, map this repo, deep check, or architecture map. Requires Claude Code with the Workflow tool."
---

# Swarm Discovery

Build a trustworthy map of one repository cheaply. Small models do the reading, bigger models check them, and code does the counting. The output is a markdown report: verdict, ASCII architecture diagram, module table, external IO inventory, data shapes, risks and next steps, with every unverified finding labelled as such.

This skill ships a Workflow script (`swarm-discovery.js`) and a deterministic inventory helper (`scripts/repo-inventory.mjs`). `SKILL_DIR` below is this skill's folder.

## How it works

| Phase | Who | What |
|---|---|---|
| 0 Inventory | `repo-inventory.mjs` (no LLM) | Counts files, LOC, import edges and entrypoints per module. Models interpret; code counts. |
| 1 Map | one Haiku worker per module | Fills a schema-forced card: purpose, public surface, dependencies, external IO, data shapes, risks, evidence as `file:line`, confidence. |
| 2 Verify | Sonnet skeptics (2 votes by default) | Judge each claim of a flagged card as verified, refuted or unverified. They never see the worker's confidence. Claims they find missing seed the next round. |
| 3 Hunt | Haiku hunters, rounds 2..4 | Look only for IO and risks not already in the ledger. Stops after 2 consecutive rounds with no novel finding. |
| 4 Synthesize | one Opus agent | Writes the report from the ledger: verified findings as fact, unverified ones in labelled subsections, refuted ones as a count. |

A card is flagged for verification when its confidence is below 0.7, it touches db, secret, http, network, queue, listener or code_exec IO, or it lists any risk.

**Fan-out caps.** Only the 40 largest modules by LOC are mapped by default; the rest are listed in a "Not mapped" section, never described as clean. An uncapped 195-module repo once spent 294 agents in 43 minutes and never reached synthesis, which is why the cap exists. A hard cap of 160 agents covers all phases, with one slot always reserved for synthesis.

## Run it

1. Build the inventory and an emitted launch script (the Workflow tool cannot read files, so the inventory is embedded into a copy of the script):

   ```bash
   node "$SKILL_DIR/scripts/repo-inventory.mjs" <repo> --max-modules 40 \
     --out /tmp/swarm-inv.json --emit-script /tmp/swarm-launch.js
   ```

   It prints the Workflow args to use. Stop if it reports 0 modules.

2. Launch the emitted copy:

   ```
   Workflow({ scriptPath: '/tmp/swarm-launch.js', args: {
     repo: '<repo>', ts: '<ISO now>', out: '<report path>.md',
     inventory: { repo, head, totals }   // from step 1's printed args
   } })
   ```

3. When it finishes, read the report at `out` and the returned object. Lead with `stop_reason`, `coverage_loc_pct`, `capped`, `unmapped`, and the verified, unverified and refuted counts, then the verdict. Never present an unverified finding as fact.

## Options (Workflow args)

| Arg | Default | Meaning |
|---|---|---|
| `votes` | 2 | Skeptics per verified card or hunt batch |
| `verify` | `flagged` | `flagged`, `all` or `none` |
| `worker_model` / `verifier_model` / `synth_model` | `haiku` / `sonnet` / `opus` | Model per phase |
| `max_modules` | 40 | Modules mapped (largest by LOC); `0` maps all |
| `max_rounds` | 4 | `1` = a single map and verify pass |
| `max_agents` | 160 | Hard cap across all phases |

Inventory flags: `--depth` (2, directory depth that defines a module), `--split-flat` (40, a directory with more files than this is split by filename prefix into virtual modules).

## Rules

- Read-only. Workers and skeptics may read, grep and run `git log` / `git show`; nothing mutates the repo.
- Secret values are never copied: IO entries record the env var or secret NAME only.
- A run with 0 modules fails loudly instead of returning an empty map.
- If the emitted launch script would exceed the Workflow tool's 512 KB script limit, the helper refuses; lower `--max-modules`.

## Configuration

Prerequisites:

- Claude Code with the **Workflow tool** enabled. Other harnesses (including Cursor) can read this skill but cannot run the workflow script; the phases and schemas in `swarm-discovery.js` still serve as a reference design.
- Node.js 18+ for `scripts/repo-inventory.mjs`.
- Access to Haiku, Sonnet and Opus. A capped 40-module run is roughly 80 to 160 agents.
- `git` on PATH (the inventory uses `git ls-files`; it falls back to `find` outside a git repo).
