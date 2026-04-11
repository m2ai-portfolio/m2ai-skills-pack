# Content Quality Scoring Rubric

Score range: 0-100. Seven weighted categories.

## Scoring Table

| # | Check | Weight | Scoring |
|---|-------|--------|---------|
| 1 | Frontmatter present + valid | 15 | 0 or 15 (binary: has_frontmatter) |
| 2 | Name valid (format + matches dir) | 10 | 0 = invalid format, 5 = valid but mismatches dir, 10 = valid + matches |
| 3 | Description quality | 20 | 0 = missing, 5 = present only, 10 = answers what, 15 = answers when, 20 = answers both + under 1024 chars |
| 4 | Progressive disclosure | 20 | 0 = over 500 lines + no external refs, 10 = under 500 OR uses refs, 20 = under 500 AND uses refs |
| 5 | Directory structure | 10 | Simple skill (<=60 lines): always 10. Complex: proportional to subdirs present (scripts/references/assets) |
| 6 | Script efficiency (run not read) | 10 | Only scored if scripts/ exists. true=10, false=0, null=5. No scripts/ dir = 10 (exempt) |
| 7 | Tool restrictions | 15 | 0 = no frontmatter, 5 = frontmatter but no allowed-tools or model, 10 = has one, 15 = has both |

## Simple Skill Exemption

Skills with 60 or fewer lines in SKILL.md are classified as "simple skills." They receive:
- Full marks (10) for directory structure regardless of subdirectories
- Script efficiency is exempt (scored as 10) unless scripts/ actually exists

Threshold: `line_count <= 60`

## Score Categories

| Range | Category | Action |
|-------|----------|--------|
| 80-100 | Excellent | No action needed |
| 60-79 | Good | Minor improvements suggested |
| 40-59 | Needs attention | Specific fixes listed |
| 0-39 | Critical | Focused improvement session recommended |

## Recalibration Trigger

If the mean score across all audited skills is above 85 or below 30, the weights may need review. This indicates either:
- Scores too generous (>85): tighten criteria or add new checks
- Scores too harsh (<30): relax weights or adjust thresholds

The `run-audit.sh` script flags this condition in its output as `recalibration_needed`.
