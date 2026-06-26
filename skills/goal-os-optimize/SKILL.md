---
name: goal-os-optimize
description: "Use /goal to run a self-directed optimization loop on your agentic OS — skills, CLAUDE.md, rules files, and projects. A judge agent on a separate LLM validates each iteration. Five modes: clean, sharpen, revive, forge, maintain. Trigger: \"goal OS\", \"optimize my skills\", \"clean my agentic OS\", \"self-optimize\", \"OS maintenance\", \"prune my skills\", \"revive projects\", \"goal os optimize\"."
---

# Goal OS Optimize — Self-Directed Agentic OS Maintenance

Uses the `/goal` slash command to have Claude Code autonomously audit and improve its own workspace — skill library, rules, CLAUDE.md files, and project catalog — with a judge agent on a separate LLM validating each iteration.

## How /goal Works

`/goal` accepts a goal description (up to 4,000 characters) and runs a loop:

- **Primary agent**: works toward the goal
- **Judge agent**: runs on a different LLM model; after each iteration checks whether the done condition has been met
- Loop ends when the judge confirms the condition is satisfied, or the max iteration budget runs out
- Typical duration: 3 minutes (simple cleanup) to 1 hour (complex multi-project work)

The judge operates independently from the primary agent, providing adversarial validation on the primary agent's own progress claims.

## Five Modes

### 1. Clean — Reduce and de-duplicate

Cuts skill count, removes contradictions in rules files, archives rather than deletes.

```
/goal
Audit the skills folder at ~/.claude/skills/ and any rules files for this workspace.
Goal: reduce the skill count by consolidating or archiving redundant and stale skills.
Archive all removed skills to ./archived-skills/ with a brief archival note — do not delete permanently.
For rules files, identify any contradictions between rules and write them to contradictions.md.
Done when: skill count is reduced, all removed items are archived (not deleted), and contradictions.md lists any conflicts found.
```

Adjust scope to your skills path and the consolidation threshold you want. The archive-not-delete constraint matters — state it explicitly so the judge enforces it.

### 2. Sharpen — Optimize against a rubric

Scores each skill against explicit criteria you define; rewrites skills that fail.

First, write a `rubric.md` that lists your quality criteria. Example:

```markdown
# Skill Quality Rubric
1. Trigger phrase appears within the first 150 characters of the description field
2. Behavior steps are numbered and concrete — no vague "process the input"
3. Output contract is explicit: the user knows exactly what they will see
4. No hardcoded absolute paths or user-specific values
5. Skill body is under 200 lines
```

Then run:

```
/goal
Read rubric.md. Audit every skill in ~/.claude/skills/.
For each skill: score it against each rubric criterion (pass/fail per criterion).
For any criterion where fewer than 4 of 5 skills pass: rewrite the failing skills to meet that criterion.
Write scoring-log.md with before/after pass counts per criterion and a list of each skill that was changed.
Done when: all criteria score at least 4/5 skills passing and scoring-log.md is complete.
```

Writing your own rubric prevents the agent from setting a low bar it can easily meet. Do not skip this step.

### 3. Revive — Resurrect dormant projects

Classifies half-built projects, creates revival checklists for viable ones, archives the rest.

```
/goal
Go through every subfolder in ~/projects/ (or the specified projects directory).
For each project: check for git commits, runnable entry points, tests, and a README.
Classify each as: (a) production-ready, (b) revivable with under 2 hours of work, (c) dormant with no useful prior work.
For class (b): write a revival-checklist.md inside the project folder listing the exact steps to make it runnable.
For class (c): move to ./archived-projects/ with a one-line archival note explaining why.
Done when: all projects are classified, each (b) project has a revival checklist, each (c) project is archived.
```

Adjust the projects path to match your setup.

### 4. Forge — Extract recurring patterns as skills

Mines past Claude Code session transcripts for prompt patterns that recur without an existing skill.

Claude Code stores session transcripts as JSONL files in `~/.claude/` (and per-project `.claude/` folders).

```
/goal
Go through all session transcripts in ~/.claude/ (look for *.jsonl files).
For each transcript: scan the user turns for prompt patterns that recur across multiple sessions with no associated skill covering them.
Identify the top 3 most frequent patterns that have no existing skill.
For each pattern: draft a SKILL.md using the standard format (YAML frontmatter with name + description, a Trigger section listing invocation phrases, numbered Behavior steps, and an Output Contract).
Save each draft to ~/.claude/skills/<name>/SKILL.md.
Done when: 3 skill drafts are written.
```

Review drafts before installing — extracted skills may have over-broad triggers that collide with existing skills.

### 5. Maintain — Continuous background audit via /loop

Combines `/loop` with `/goal` for a recurring maintenance cycle that runs as long as the session is open.

```
/loop 30m
/goal
Audit skills in ~/.claude/skills/ for staleness.
Archive any skill not modified or invoked in the last 30 days to ./archived-skills/ with a timestamp note.
Check CLAUDE.md and any rules files for contradictions between rules; log findings to maintenance-log.md.
If CLAUDE.md exceeds 150 lines, propose consolidations in maintenance-log.md (do not edit the file directly).
Done when: archived list is current, maintenance-log.md has a new entry dated today.
```

This runs every 30 minutes while the session is open. The maintenance log accumulates over time — review it periodically to see what keeps going stale.

**Note**: `/loop` keeps running until you close the session. Use this during active work periods, not for overnight runs.

## Template Variables

| Placeholder | What to replace with |
|-------------|----------------------|
| `~/.claude/skills/` | Your actual skills path |
| `~/projects/` | Your projects root |
| `30-day staleness` | Your preferred inactivity window |
| `./archived-skills/` | Any archive directory you prefer — keep it inside the project |
| `4 of 5 skills` | Adjust rubric passing threshold to your needs |
| `3 patterns` | Number of patterns to extract in Forge mode |

## Common Pitfalls

- **Don't let the agent write its own rubric in Sharpen mode.** It will pick criteria it can already meet. Always write `rubric.md` yourself first.
- **Archive, don't delete.** State this explicitly in the done condition — the judge will enforce what you describe.
- **Review Forge output before installing.** Skills extracted from transcripts may have vague or colliding trigger phrases.
- **Maintain mode keeps running.** Set a reasonable interval (30-60 min); shorter intervals waste turns on no-op audit passes.

## Source Attribution

Technique: /goal for self-directed agentic OS optimization
Source: Mark Kashef YouTube
URL: https://www.youtube.com/watch?v=5xrjO38WUYY
Published: 2026-05-17
