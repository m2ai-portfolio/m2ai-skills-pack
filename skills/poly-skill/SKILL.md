---
name: poly-skill
description: Convert any Claude Code skill to work in OpenAI Codex (or vice versa) by applying a structural adapter that handles naming differences, sidecar YAML generation, trigger placement, tool-permission fields, and terminal-command syntax between the two platforms.
---

# Poly-Skill

Cross-platform skill adapter. Given a skill written for Claude Code or Codex, produces a version that works correctly on the other platform. Handles the structural mismatches that cause skills to silently misfire when ported.

## Trigger

Use when the user says "poly skill", "convert this skill to codex", "port this skill to claude code", "make this skill work in both", "cross-platform skill", "skill adapter", or provides a SKILL.md and asks why it doesn't work in the other environment.

## Background: Why Skills Misfire Across Platforms

Claude Code and Codex share the same high-level concept (a markdown-defined reusable command) but differ in four structural areas:

| Area | Claude Code | Codex |
|------|-------------|-------|
| Metadata heading | YAML frontmatter `name` / `description` | Frontmatter + `## Metadata` section with `shortDescription` |
| Trigger placement | Anywhere in body | Must be at the top -- Codex truncates long descriptions and may never reach triggers placed at the end |
| Terminal commands | Backtick-bang syntax (`` `!command` ``) | Different invocation model -- no direct backtick-bang |
| Tool permissions | `allowedTools` + `disableModelInvocation` in frontmatter | Sidecar YAML file with `tools`, `policies`, `icon`, `defaultPrompt` sections |

## Phase 1: Read Source Skill

Ask the user for the path to the skill directory (or accept it as an argument). Read:
- `SKILL.md` (or equivalent) for frontmatter, trigger, phases, and any terminal commands
- Any `.yaml` / `.yml` sidecar files
- Any `scripts/` subdirectory contents

Identify the source platform from structural fingerprints:
- Has `allowedTools` in frontmatter? Claude Code.
- Has a `## Metadata` section or a sidecar YAML with `tools:` / `policies:`? Codex.
- Ambiguous? Ask the user.

## Phase 2: Extract Shared Structure

Produce a platform-neutral representation:

```
skill_name: <kebab-case name>
description: <full description>
short_description: <one-sentence summary, max 120 chars>
trigger_phrases: [list of trigger strings]
phases: [ordered list of phase names and bodies]
terminal_commands: [list of shell commands referenced]
allowed_tools: [bash commands, file tools, etc.]
requires_approval: true | false
assets: [paths to scripts, reference files]
```

Backtick-bang patterns in the body (`` `!command` ``) are extracted as `terminal_commands` items with their context.

## Phase 3: Apply Target Platform Adapter

### Claude Code adapter

Output directory: `<skill-name>/` with a single `SKILL.md`.

Frontmatter fields to write:
```yaml
---
name: <skill_name>
description: <description>
allowedTools: [<tools>]
disableModelInvocation: false
---
```

Body rules:
- Trigger section immediately after the title
- Terminal commands rendered as backtick-bang (`` `!command` ``)
- No sidecar file needed

### Codex adapter

Output directory: `<skill-name>/` with two files: `SKILL.md` + `<skill-name>.yaml` (sidecar).

`SKILL.md` frontmatter:
```yaml
---
name: <skill_name>
description: <trigger_phrases[0]> -- <description>
---
```

Put the primary trigger phrase at the very start of the `description` field so Codex sees it even if the body is truncated.

`## Metadata` section at the top of the body:
```markdown
## Metadata
shortDescription: <short_description>
```

Sidecar `<skill-name>.yaml`:
```yaml
display:
  icon: "terminal"
  defaultPrompt: "<trigger_phrases[0]>"
tools: [<allowed_tools>]
policies:
  requireApproval: <requires_approval>
```

Body rules:
- Trigger phrases listed under `## Trigger` near the top (first section after Metadata)
- Terminal commands converted to prose instructions -- Codex does not support backtick-bang

## Phase 4: Write Output

Write output files to `./output/<skill-name>/` by default (or user-specified path). Print the file tree on completion.

If the user asked for both platforms in one run, write both adapters to `./output/<skill-name>-claude/` and `./output/<skill-name>-codex/`.

## Phase 5: Validation Check

After writing, self-verify:
- Does the Codex SKILL.md description begin with a trigger phrase? (truncation safety)
- Does the Claude Code version have `allowedTools` if any tools were used in the original? (permission safety)
- Are any backtick-bang commands still present in the Codex output? (syntax safety -- they should have been prose-converted)

Report a one-line pass/fail per check.

## Source Attribution

Technique derived from Mark Kashef YouTube video "How to INSTANTLY Run ANY Skill in Claude + Codex" (2026-05-21): https://www.youtube.com/watch?v=tjjX43FoAUg
