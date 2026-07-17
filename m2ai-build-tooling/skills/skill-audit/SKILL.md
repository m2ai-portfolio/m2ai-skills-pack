---
name: skill-audit
description: "Audit your Claude Code skills directory, CLAUDE.md, and recent session patterns to surface candidates for new skills -- gaps, redundancies, and formalization opportunities -- and to catch skill hygiene failures: runtime artifacts (venv, __pycache__, node_modules) living inside a skill directory, and absolute paths or identity leaking out of tracked files."
context: fork
---

# Skill Backlog Audit

Scans your existing skill library, CLAUDE.md instructions, and workflow patterns to identify what should be formalized into a skill but hasn't been yet.

## Trigger

Use when the user says "audit my skills", "what skills am I missing", "skill audit", "skill backlog", "what should be a skill", or asks about gaps in their skill library.

## Phase 1: Inventory

Scan these sources and build a full inventory:

1. **Skills directory** (`~/.claude/skills/`) -- list every skill, its description, trigger patterns, and category
2. **Plugins** (`~/.claude/plugins/installed_plugins.json`) -- list installed plugins and their capabilities
3. **CLAUDE.md files** -- read `~/.claude/CLAUDE.md` and the current project's `CLAUDE.md` for repeated instruction patterns that could be skills
4. **Hooks** (`~/.claude/settings.json`, `~/.claude/settings.local.json`) -- check for hook-based behaviors that might work better as skills

Build a table:

| # | Skill/Plugin | Category | Trigger Coverage | Last Modified |
|---|-------------|----------|-----------------|---------------|

### Hygiene scan (run inside any git repo of skills)

Gap analysis asks what a skill is missing. This asks what a skill is *carrying* that it should not.
Run it whenever the skills live in a repo, and always before anything ships to a public pack.

Use `git ls-files` / `git grep -a`, never a plain working-tree grep or `find`. The distinction between
TRACKED and merely present is the entire point, and a working-tree scan conflates them:

```
git -C <repo> ls-files | grep -E 'venv/|__pycache__|\.pyc$|node_modules/|\.pytest_cache/|egg-info/|(^|/)\.env$'   # A: TRACKED artifact FILES
git -C <repo> ls-files skills/ | grep -E '/(output|reports|dist|build|logs|tmp)/'   # A: TRACKED artifact DIRS
find <repo>/skills -maxdepth 2 \( -name venv -o -name .venv -o -name __pycache__ -o -name node_modules -o -name output -o -name dist \) -prune -exec du -sh {} +   # A: present-but-untracked
git -C <repo> grep -l -a -E '/home/[a-z0-9_-]+|/Users/[A-Za-z0-9_-]+|C:\\Users\\[A-Za-z0-9_-]+'   # B: paths in TRACKED files, -a reads binaries
```

Scan artifact DIRS separately from artifact FILES. A pattern built only from `venv`/`__pycache__`/
`.pyc` looks thorough and still misses the biggest finding: in `m2ai-skills-pack` on 2026-07-16 that
exact pattern reported a clean index while 4.8MB of generated images sat tracked in
`skills/banana-maker/output/`, which was 69% of the pack's tracked weight, plus a real audit run in
`skills/skill-maintenance/reports/`. The tell is that a skill WRITES to these dirs, so anything
committed in one is a leftover from somebody's actual usage.

Keep the dir list narrow and name it explicitly. `examples/`, `references/`, `evals/` and `scripts/`
are legitimate tracked documentation for real skills, so a broad "any subdirectory" rule produces
false positives that get the whole check ignored.

**A. Runtime artifacts inside a skill directory.** Report each with its size (a 64MB venv and a stray
`.pyc` are not the same finding) and its severity:

- **TRACKED** = severe. It already ships. Anyone who clones the repo gets it.
- **PRESENT but untracked** = latent, not safe. It is one `.gitignore` edit away from shipping. If any
  auto-commit watcher runs against the repo (a `git add -A` cron, an IDE autosave, a WIP-snapshot
  script), the window between that edit and a commit is however often it fires, with no human in it.
  Check for one before calling an untracked artifact safe.

**Do not report `.gitignore` as the fix.** Ignoring is a mitigation; relocation is the fix. A skill that
needs a runtime artifact should keep it OUTSIDE the skill directory entirely (a venv under
`~/.cache/`, generated output under a dedicated content or scratch dir), not merely ignored in place.
This is the same failure class as a committed `.env` backup: excluding the SCRIPT is not enough, the
ARTIFACT it generates is what leaks.

**B. Absolute-path / identity leakage in TRACKED files.** Home paths (`/home/<user>`, `/Users/<user>`,
`C:\Users\<user>`) identify the author. Pass `-a` so `git grep` reads BINARY artifacts too: in a real
2026 incident the ONLY leak of the author's username in an entire public repo was compiled inside a
tracked `.pyc`, where a text-only grep of source files finds nothing and reports the repo clean.

## Phase 2: Gap Analysis

Analyze the inventory for:

### Missing Skills
- Repeated multi-step workflows in CLAUDE.md that aren't skills yet
- Patterns the user does frequently (check conversation history if available) that have no skill
- Common Claude Code operations with no skill coverage (deployment, testing, refactoring patterns)

### Redundant Skills
- Skills with overlapping trigger patterns (risk of wrong skill firing)
- Skills that cover the same domain from different angles (candidates for merging)

### Underspecified Skills
- Skills missing description fields (won't trigger reliably for agents)
- Skills with vague triggers ("use when needed")
- Skills without verification/output phases

### Leaky Skills (from the hygiene scan)
- Skills carrying a runtime artifact in their own directory, tracked or merely present
- Skills whose tracked files leak a home path or the author's identity
- **Publish-readiness**, and only when the skill dir is destined for a public pack: personal names,
  internal agent names, client names, LAN IPs. Flag these and stop. `/publish-skill` OWNS this gate
  and its per-match sanitization review; this audit only tells you a leak exists, it does not clean
  one, and it never edits a pack copy. Report the finding and route it.

## Phase 3: Recommendations

Produce a ranked list of recommendations:

```
PRIORITY | ACTION     | TARGET              | RATIONALE
---------|------------|---------------------|----------
1        | CREATE     | <skill name>        | <why>
2        | MERGE      | <skill A> + <B>     | <why>
3        | IMPROVE    | <existing skill>    | <what's weak>
```

Limit to top 10 recommendations. For each CREATE recommendation, include:
- Suggested skill name
- One-line description
- Trigger patterns
- Estimated complexity (trivial / weekend / multi-sprint)

## Phase 4: Output

Present findings as:
1. **Summary stats**: total skills, total plugins, coverage gaps found, redundancies found,
   leaky skills found (split TRACKED vs present-but-untracked, with total artifact size)
2. **Recommendations table** (from Phase 3)
3. **Quick wins**: any recommendations that could be implemented in under 30 minutes

Do NOT auto-create skills. This is an audit -- the user decides what to act on.

## Phase 5: Follow-up routing (turn recommendations into work)

An audit ends at insight unless each recommendation is routed to the thing that acts on it.
After Phase 4, emit a short routing block -- one line per recommendation -- mapping its ACTION
to a concrete next step:

- **CREATE** -> hand to `/skill-creator`, and state the 14-day adoption gate explicitly
  ("experimental until <date+14>; needs 3 human uses, an active-agent manifest entry, or a
  callsite by then or it cold-archives to skill-forge").
- **IMPROVE** -> hand to `/skill-maintenance` (content-quality audit) before any edit; if the
  skill might be shareable, note `/publish-skill` after.
- **MERGE** -> no auto-merge; capture as bounded work via `goal-maker` with owner/sink/kill so
  the consolidation does not get lost.
- **DEFER / someday** -> `/quick` into the backlog, or drop it. Do NOT leave it as a floating
  recommendation that silently becomes build-but-forget debt.
- **No action** -> if a gap is acknowledged but intentionally not filled, say so explicitly so
  silence is not mistaken for an oversight.
- **RELOCATE** (a leaky skill, from Phase 2) -> capture via `goal-maker` with owner/sink/kill. The
  work is moving the artifact out of the skill directory, plus `git rm --cached` on anything already
  tracked. Do NOT close it by adding a `.gitignore` line. A tracked leak in a published pack is
  already public, so say so plainly and treat rotation or history as part of the goal, not a footnote.
- **SANITIZE** (identity or client leakage in something bound for a public pack) -> `/publish-skill`,
  which owns sanitization. This audit reports; it does not sanitize.

Do NOT propose scheduling this audit as a new recurring loop -- the Sunday tool-audit cron
already owns that cadence (owner/sink/kill satisfied). A second standing loop would be an
orphan loop.

## Source Attribution

Technique: Skill Backlog Audit prompt pattern
Source: Nate's Newsletter (natesnewsletter@substack.com), 2026-03-30
Post: "Your Best AI Work Vanishes Every Session. 4 Prompts That Make It Permanent"
