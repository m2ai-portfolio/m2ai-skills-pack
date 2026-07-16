---
name: what-am-i-forgetting
description: >
  Comprehensive agenda recall across all of your active projects, phases, gates,
  queued work, ideas, and cleanups. Casts a wide net across roadmaps, memory
  files, project TODOs, daily notes, cron manifests, and project folders to
  produce a consolidated dashboard. Use whenever you ask "what's next", "what's
  on the agenda", "what am I working on", "what am I forgetting", "what's open",
  "what's in progress", "give me a recap", or invoke `/what-am-i-forgetting`.
  Gives a concrete list to disambiguate generic questions about priorities
  instead of guessing which project is meant.
---

# What Am I Forgetting: Comprehensive Agenda Recall

This skill produces a consolidated view of everything open across your project
ecosystem. It is deliberately exhaustive — the cost of missing an item is
higher than the cost of listing too many.

## When to use this skill

Use this skill automatically when the user:

- Asks "what's next", "what's on the agenda", "what am I working on"
- Asks "what am I forgetting", "what's open", "what's in progress"
- Asks "give me a recap", "where did we leave off", "what's the state"
- Invokes `/what-am-i-forgetting` explicitly
- Starts a session with a generic "let's continue" without a specific project

When the user asks a generic agenda question without naming a project, do not
guess which project they mean. Produce the full list and let them point at the
right item.

## Output structure (always use these sections)

1. **Primary Pipeline / Program Status** (if you have a main workstream — phase status + blockers)
2. **Time-boxed / Expiring Items** (table with deadlines, sorted by closest)
3. **Active Projects — In Flight**
4. **Active Projects — Queued / Planning**
5. **Client / Revenue Work**
6. **Ideas Not Yet Started**
7. **Hygiene / Cleanup Backlog**
8. **Ongoing Automation (crons, daemons)**
9. **Unknown Status** (project folders not mentioned elsewhere)
10. **Suggested Prioritization**

Do not omit sections even if empty — write "(none)" so the user can confirm
the section was considered, not forgotten.

## Data sources to consult (in order)

### 1. Memory index (always start here, if one exists)

```
$MEMORY_INDEX   (e.g. ~/.claude/.../MEMORY.md, or an equivalent index file)
```

If the user maintains a memory-index file, this is the authoritative source.
Skim all sections. Each linked memory file is a potential agenda item. Pay
special attention to:
- Sections named "Active Projects" or similar
- Sections for "Paused" / "Early-Stage Ideas"
- Any file whose description contains "expires", "deadline", or a future date
- Any file whose description contains "COMPLETE" / "SHIPPED" (for confirming done)

### 2. Roadmap files

Look for roadmap/blueprint docs at common locations:
```bash
ls $PROJECTS_DIR/*ROADMAP*.md $PROJECTS_DIR/*BLUEPRINT*.md 2>/dev/null
ls $PROJECTS_DIR/*/ROADMAP.md $PROJECTS_DIR/*/BLUEPRINT.md 2>/dev/null
```
Extract current phase status and open phase items from each.

### 3. Open-item queues (search broadly)

```bash
find $PROJECTS_DIR -maxdepth 3 -type f \
  \( -name "NEXT.md" -o -name "TODO.md" -o -name "open_items.json" \
     -o -name "open-items.json" -o -name "AGENDA.md" \) 2>/dev/null
```
Read these to extract pending work items not captured in memory.

### 4. Recent daily notes (last 7 days)

```bash
ls -t $VAULT_DIR/daily/*.md 2>/dev/null | head -10
```
Look for "Next Actions" sections — these are work items the user wrote down
but may not have transferred to memory or open-items yet.

### 5. Project folder inventory

```bash
ls -d $PROJECTS_DIR/*/
```
Cross-reference against items already mentioned. Any project folder NOT
mentioned in memory, roadmaps, or queues goes into "Unknown Status" —
these are often stale folder accumulation that need decisions.

### 6. Cron / automation manifest

Check these locations for running background processes:
```bash
crontab -l 2>/dev/null
ls /etc/cron.d/ 2>/dev/null
ls ~/.claude/triggers/ 2>/dev/null
pm2 list 2>/dev/null
systemctl --user list-units --type=service 2>/dev/null | grep -i running
```
List what is actively running so the user knows what to monitor.

### 7. Expiring-item extraction

```bash
grep -rE "expires|deadline|by 20[0-9]{2}-" $MEMORY_DIR 2>/dev/null
```
Every match is a candidate time-boxed item. Sort by expiration date, soonest
first. Flag anything expiring in <=7 days as urgent.

## Categorization rules

**In Flight** = memory/notes say "IN PROGRESS", "ACTIVE", "LIVE", "DEPLOYED",
or have a recent daily note with substantive progress.

**Queued / Planning** = memory/notes say "PLANNING", "SCAFFOLDED", "BLOCKED",
or have a NEXT.md but no recent daily note activity.

**Client / Revenue** = anything tagged with a client name, or living in a
client-engagement folder (e.g. `vault/clients/`, `clients/`).

**Ideas Not Yet Started** = memory description starts with "Early idea",
"Flagged, not built", "Theory", "Concept", or similar. No code work done.

**Hygiene / Cleanup** = stale skill/plugin lists from audits, empty
folders, duplicate crons, unreferenced memory files, orphan plugins.

**Ongoing Automation** = anything in crons/triggers/pm2/systemd that runs
unattended. List the name, schedule, and last-known-working date if tracked.

**Unknown Status** = project folder exists but no memory/roadmap/daily
mention. Flag for the user to confirm keep/archive/delete.

## Suggested Prioritization rules

Rank by these factors, in order:
1. **Deadline-driven urgency** (any item expiring in <=7 days)
2. **Blocker on primary pipeline** (blocks main-workstream progression)
3. **Revenue impact** (client work, paid engagements)
4. **Momentum preservation** (currently in flight, losing context if paused)
5. **Hygiene ROI** (compound cleanup value)
6. **Idea maturity** (no deadline, lowest priority)

Present the prioritization as a ranked "This week / Next week / Background"
triage, not a single long list.

## Honest gap-flagging

After producing the full list, add a "Gaps I might have missed" section:
- Projects for which no data was available to assess
- Memory files that couldn't be parsed
- Folders normally skipped (venvs, caches) — confirm they should be skipped
- Sources that should have been checked but couldn't be

This is critical. The skill is only useful if the user trusts it's exhaustive.
Explicitly call out what was *not* checked so they can decide whether to expand
the source list.

## Output length

Aim for a working dashboard, not a data dump. Roughly 600-1200 words.
Use tables for items with deadlines. Use bullet lists for everything else.
Do not narrate — just produce the agenda.

## Self-update rule

If the user corrects an item ("project X is actually done", "you missed
project Y", "Z is no longer client work"), update the relevant memory file
immediately and rerun the skill. The skill's value compounds with the quality
of the memory index; do not let corrections evaporate.

## Configuration

This skill scans user-specific locations. Set these env vars (or inline at
invocation):

| Variable | Purpose | Example |
|---|---|---|
| `$PROJECTS_DIR` | Root of your code projects | `~/projects` |
| `$VAULT_DIR` | Your notes vault (daily notes, project files) | `~/vault` |
| `$MEMORY_INDEX` | Your memory-index file, if you maintain one | `~/.claude/memory/MEMORY.md` |
| `$MEMORY_DIR` | Directory containing memory files | `~/.claude/memory/` |

If any of these are unset, skip that data source gracefully and flag it in
the "Gaps" section rather than failing.

## Prerequisites (optional but helpful)

This skill is most useful when you already maintain:

- A memory-index file with one-line entries per project/topic
- Per-project `NEXT.md` or `TODO.md` or `open_items.json` files
- Daily notes in a vault folder
- Roadmap/blueprint documents for major programs

Without these, the skill falls back to project-folder inventory and cron
listings, which is still useful for answering "what's running?" but won't
capture planned or ideated work.
