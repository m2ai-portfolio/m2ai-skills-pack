---
name: skill-maintenance
description: Audit Claude Code skills for content quality against Anthropic best practices. Use when Forge runs maintenance cycles, when the user asks to check skill quality, or when reviewing skills before publishing.
---

# Skill Maintenance — Content Quality Auditor

## When to Use

Activate when:
- The user asks to audit, review, or check skill quality
- Forge triggers a maintenance cycle
- Before publishing or sharing skills
- After bulk skill creation to verify standards compliance

## What This Does

Audits skills in `~/.claude/skills/` against Anthropic's documented best practices for the agent skills open standard. Produces a scored report with actionable findings and patch candidates for Phase 2b auto-remediation.

This skill focuses on **content quality** (structure, metadata, progressive disclosure). It does NOT measure invocation metrics — that is handled by `scorecard.py` in the skill library.

## Workflow

### Step 1: Determine Scope

Ask the user (or accept from Forge):
- **Single skill**: audit one skill by name or path
- **Full sweep**: audit all skills in `~/.claude/skills/`

### Step 2: Run the Audit

**For a single skill:**
```bash
bash ~/.claude/skills/skill-maintenance/scripts/audit-skill.sh ~/.claude/skills/<skill-name>
```

**For all skills:**
```bash
bash ~/.claude/skills/skill-maintenance/scripts/run-audit.sh
```

IMPORTANT: Run scripts via Bash tool. Do NOT read the script files — they execute without loading contents into context, keeping token usage efficient.

### Step 3: Interpret Results

The audit scripts output JSON to stdout. Parse the output to understand:

- **Per-skill checks**: boolean pass/fail for each criterion
- **Raw metrics**: line counts, file references, code blocks
- **Content quality score**: 0-100 weighted score

If reviewing the scoring methodology, read `references/scoring-rubric.md`.
If reviewing what each check means and why it matters, read `references/audit-criteria.md`.

### Step 4: Present Findings

For each skill, report:
1. **Score** (0-100) with category: excellent (80+), good (60-79), needs attention (40-59), critical (<40)
2. **Top findings** — what passed, what failed, and why it matters
3. **Patch candidates** — specific improvements ranked by priority (1=quick fix, 3=major rework)

### Step 5: Recommend Actions

- **Score >= 80**: No action needed. Mention any minor improvements.
- **Score 40-79**: List specific fixes. Offer to apply auto-applicable patches (frontmatter, name fixes).
- **Score < 40**: Flag as critical. Recommend a focused improvement session.

If the user wants to understand the patch format for Phase 2b integration, read `references/patch-format.md`.

## Output Format

### Single Skill (human-readable)

```
## Skill: <name>
Score: <N>/100 (<category>)

### Checks
- [pass/fail] Frontmatter present and valid
- [pass/fail] Name valid and matches directory
- ...

### Findings
1. <finding with rationale>
2. ...

### Patch Candidates
| Priority | Type | Description |
|----------|------|-------------|
| 1 | add_frontmatter | Missing frontmatter block |
| ... | ... | ... |
```

### Full Sweep (JSON to stdout, summary to stderr)

The `run-audit.sh` script outputs structured JSON for programmatic consumption and a human-readable summary to stderr. Present both to the user.

## Important Notes

- Skills under 60 lines are "simple skills" — they get full marks for directory structure even without subdirs
- The `scripts_run_not_read` check only applies to skills that have a `scripts/` directory
- This skill should score >= 80 against its own rubric (it practices what it preaches)
- Patch candidates with `auto_applicable: true` are safe to apply without human review
- All other patches require HIL (human-in-the-loop) approval before application

## Reference Files

| File | When to Read |
|------|-------------|
| `references/scoring-rubric.md` | When you need to understand score weights or thresholds |
| `references/audit-criteria.md` | When you need rationale for specific checks |
| `references/patch-format.md` | When generating or applying Phase 2b patches |
