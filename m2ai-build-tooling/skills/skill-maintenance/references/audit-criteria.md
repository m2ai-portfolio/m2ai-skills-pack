# Audit Criteria Reference

Detailed documentation of each content quality check. Rationale sourced from Anthropic's skill course (Progressive_disclosure.txt).

## FM-01: Frontmatter Present

**Check**: SKILL.md starts with `---` frontmatter block containing at least `name` and `description`.

**Rationale**: "name and description are required" (Anthropic). Without frontmatter, Claude cannot match the skill to user requests. The skill becomes invisible to automatic activation.

**Pass example**: `banana-maker/SKILL.md` — has proper `---` delimited frontmatter with name and description.
**Fail example**: `braindump/SKILL.md` — no frontmatter block, starts directly with markdown heading.

## NM-01: Name Valid

**Check**: `name` field uses only lowercase letters, numbers, and hyphens. Maximum 64 characters.

**Rationale**: "Use lowercase letters, numbers, and hyphens only. Maximum 64 characters." (Anthropic). Invalid names break skill discovery and may cause filesystem issues.

**Pass**: `banana-maker`, `skill-maintenance`, `l5-sprint`
**Fail**: `Banana_Maker` (uppercase, underscores), `my-really-long-skill-name-that-exceeds-sixty-four-characters-limit-by-far` (too long)

## NM-02: Name Matches Directory

**Check**: `name` field value matches the skill's directory name exactly.

**Rationale**: "Should match your directory name" (Anthropic). Mismatches cause confusion when referencing skills and may break automation that expects name-directory parity.

**Pass**: Directory `banana-maker/` with `name: banana-maker`
**Fail**: Directory `my-skill/` with `name: my_skill`

## DS-01: Description Present

**Check**: `description` field exists and is non-empty in frontmatter.

**Rationale**: "description is required" (Anthropic). "This is the most important field because Claude uses it for matching." Without it, the skill cannot be discovered.

## DS-02: Description Length

**Check**: Description is at most 1,024 characters.

**Rationale**: Maximum 1,024 characters per the open standard. Overly long descriptions waste context and reduce matching precision.

## DS-03: Description Answers "What"

**Check**: Description contains action verbs indicating what the skill does (heuristic: presence of verbs like audit, generate, create, build, analyze, check, review, etc.).

**Rationale**: "A good description answers two questions: What does the skill do? When should Claude use it?" (Anthropic). A description without clear action verbs fails the "what" test.

**Pass**: "Generate images using the Gemini image generation API" — clear action verb "generate"
**Fail**: "A tool for images" — no clear action verb

## DS-04: Description Answers "When"

**Check**: Description contains trigger phrases indicating when to use the skill (heuristic: "Use when", "Activate when", "When the user", etc.).

**Rationale**: Same Anthropic guidance. "If your skill isn't triggering when you expect it to, try adding more keywords that match how you actually phrase your requests." Trigger phrases improve activation accuracy.

**Pass**: "Use when the user asks to generate, create, or make an image"
**Fail**: "Generates images from text prompts" — no trigger context

## PD-01: Under 500 Lines

**Check**: SKILL.md is 500 lines or fewer.

**Rationale**: "A good rule of thumb: keep SKILL.md under 500 lines. If you're exceeding that, consider whether the content should be split into separate reference files." (Anthropic). Oversized skill files consume excessive context.

**Pass**: `banana-maker/SKILL.md` (~95 lines)
**Fail**: `frontend-slides/SKILL.md` (~1097 lines)

## PD-02: Uses Progressive Disclosure

**Check**: SKILL.md references external files (references/, scripts/, assets/) for on-demand loading.

**Rationale**: "Keep essential instructions in SKILL.md and put detailed reference material in separate files that Claude reads only when needed." (Anthropic). Progressive disclosure keeps context lean.

**Pass**: "If reviewing scoring criteria, read references/scoring-rubric.md"
**Fail**: 800-line SKILL.md with all documentation inline

## PD-03: Scripts Run Not Read

**Check**: When a scripts/ directory exists, SKILL.md instructs Claude to execute scripts via Bash rather than reading them with the Read tool.

**Rationale**: "Scripts execute without loading their contents into context — only the output consumes tokens, keeping context efficient." (Anthropic). Reading script source into context wastes tokens and may confuse the model.

**Pass**: "Run the script: `bash scripts/audit-skill.sh`"
**Fail**: "Read scripts/audit-skill.sh to understand the checks"

## ST-01: Has Scripts Directory

**Check**: `scripts/` subdirectory exists.

**Rationale**: The open standard suggests `scripts/` for executable code. Not required for simple skills but recommended for skills with automation logic.

## ST-02: Has References Directory

**Check**: `references/` subdirectory exists.

**Rationale**: The open standard suggests `references/` for additional documentation. Supports progressive disclosure by housing detail that SKILL.md can reference on demand.

## ST-03: Has Assets Directory

**Check**: `assets/` subdirectory exists.

**Rationale**: The open standard suggests `assets/` for images, templates, or other data files. Only relevant for skills that use non-code resources.

## TL-01: Has Allowed-Tools

**Check**: `allowed-tools` field is present in frontmatter.

**Rationale**: "Restricts which tools Claude can use when the skill is active — useful for security-sensitive workflows, read-only tasks, or any situation where you want guardrails." (Anthropic). Not required for all skills, but important for security-sensitive or constrained workflows.

## TL-02: Has Model Field

**Check**: `model` field is present in frontmatter.

**Rationale**: "Specifies which Claude model to use for the skill." (Anthropic). Useful for cost optimization (use haiku for simple tasks) or capability requirements (use opus for complex reasoning).
