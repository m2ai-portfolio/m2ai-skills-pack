---
name: cross-runtime-skill-converter
description: |
  Convert a Claude Code skill to Codex format or vice versa. Trigger on: "convert my skill to Codex", "port this skill to Claude Code", "make this skill work in both runtimes", "cross-runtime skill", "skill doesn't work in [provider]", "convert [skill-name] to Codex", "bring this Codex skill into Claude Code", "polyskill".
  Handles structural differences in tool declarations, description truncation, sidecar YAML generation, and dynamic injection syntax translation.
---

# Cross-Runtime Skill Converter

Converts agent skills between Claude Code (Anthropic) and Codex (OpenAI) format by analyzing each runtime's structural requirements and generating adapter files.

## Runtime Anatomy

### Claude Code Skill Structure

A Claude Code skill lives at `~/.claude/skills/<skill-name>/SKILL.md`:

```yaml
---
name: skill-name          # kebab-case
description: |            # fully read at session start (up to context limit)
  Full description with triggers at any position.
allowed_tools:            # optional — tool whitelist for this skill
  - Bash
  - Read
  - Write
disable_model_invocation: false   # true = requires explicit user trigger
---
```

Body: markdown with step-by-step instructions. Dynamic injection runs shell commands inline via backtick-bang syntax (`` `!command` ``).

### Codex Skill Structure

A Codex skill lives at `~/.codex/agents/<skill-name>/`:

**Agent file (SKILL.md or agent.md)**:
```yaml
---
name: skill-name
description: |
  TRIGGERS MUST BE AT THE TOP — Codex truncates descriptions; never bury triggers.
  Additional prose follows.
metadata:
  short_description: one-line summary shown in the Codex app (≤120 chars)
---
```

**Sidecar config (`<skill-name>.yaml`)**:
```yaml
display:
  name: Human-Readable Name
  icon: "🔧"
  default_prompt: "Describe what you want to do"
tools:
  - type: bash
  - type: web_search
policies:
  invocation: auto   # or: manual
```

No backtick-bang dynamic injection — use companion script files instead.

## Phase 1: Identify Source

1. Ask: "What is the source skill name and which runtime is it in (Claude Code or Codex)?"
2. Locate and read the skill's SKILL.md.
3. Detect runtime: `allowed_tools` or `disable_model_invocation` → Claude Code. `metadata.short_description` or a sidecar `.yaml` → Codex.
4. Confirm target runtime with the user.

## Phase 2: Claude Code → Codex

1. **Reorder description**: Move all trigger phrases to the first lines of the `description` block (before any prose).
2. **Add `metadata.short_description`**: Derive a ≤120-char summary from the description.
3. **Generate sidecar YAML**:
   - Map each `allowed_tools` entry to a `tools:` list item.
   - Map `disable_model_invocation: true` to `policies.invocation: manual`.
   - Populate `display.name` from the skill's name (title-cased).
4. **Convert dynamic injection**: Replace `` `!cmd` `` expressions with "Run: `cmd`" inline notes or extract into `scripts/<step>.sh`.
5. Write output to `~/.codex/agents/<skill-name>/` (or user-specified path).

## Phase 3: Codex → Claude Code

1. **Flatten sidecar YAML** into SKILL.md frontmatter:
   - `tools:` items → `allowed_tools:` list.
   - `policies.invocation: manual` → `disable_model_invocation: true`.
2. **Merge `metadata.short_description`** into the description block.
3. **Remove Codex-specific display keys** (`icon`, `default_prompt`) — they add noise in Claude Code.
4. Write output to `~/.claude/skills/<skill-name>/SKILL.md` (or user-specified path).

## Phase 4: Verify

After writing output files:

- [ ] Confirm output frontmatter is valid YAML (no tab characters, correct indentation).
- [ ] For Codex target: trigger phrases appear in the first 3 lines of `description`.
- [ ] For Claude Code target: `allowed_tools` entries are valid Claude Code tool names (`Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep`, `WebFetch`, `Agent`, etc.).
- [ ] Report: source path, target path, list of changes made, any fields that could not be automatically mapped.

## Constraints

- Never modify the source skill — always write to a new target path.
- If a source field has no target equivalent, log it as a `# [unsupported: <field>]` comment in the output file.
- If neither runtime is installed, write converted files to `./converted/<skill-name>/` instead.

## Source

Mark Kashef — "How to INSTANTLY Run ANY Skill in Claude + Codex" (2026-05-21)
https://www.youtube.com/watch?v=tjjX43FoAUg
