---
name: agents-md-generator
description: Generate or lint an AGENTS.md file from repository analysis. Discovers build commands, test commands, environment variables, architecture patterns, and coding conventions, then produces a comprehensive AGENTS.md that tells AI coding agents how to work in the repo. Use when the user says "generate agents.md", "create agents.md", "lint agents.md", "agents file", "agent instructions", or wants to create standardized agent onboarding docs for a repository.
---

# AGENTS.md Generator / Linter — Agent Onboarding for Any Repo

Analyze a repository and generate a comprehensive AGENTS.md that gives AI coding agents everything they need to operate effectively. Also lints existing AGENTS.md files for completeness gaps.

## Prerequisites

- Target repository must be locally accessible
- Works with any language/framework (polyglot detection)
- No external API calls required

## Mode Selection

Ask the user which mode:

1. **Generate**: Create a new AGENTS.md from scratch via repo analysis
2. **Lint**: Audit an existing AGENTS.md for completeness and accuracy
3. **Update**: Re-analyze the repo and merge new findings into an existing AGENTS.md

## Phase 1: Repository Analysis (Generate/Update modes)

Scan the repository for the following categories:

### 1.1 Build & Run Commands
- Package manifests: `package.json` scripts, `pyproject.toml` scripts, `Makefile` targets, `Cargo.toml`, `go.mod`
- Docker/compose files: `Dockerfile`, `docker-compose.yml`
- CI configs: `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`
- Extract: build command, dev command, start command, clean command

### 1.2 Test Commands
- Test frameworks: jest, vitest, pytest, go test, cargo test
- Test config files: `jest.config.*`, `vitest.config.*`, `pyproject.toml [tool.pytest]`
- Extract: test command, test:watch command, coverage command, test file patterns

### 1.3 Lint & Format Commands
- Linters: ESLint, Ruff, clippy, golangci-lint
- Formatters: Prettier, Black, rustfmt, gofmt
- Type checkers: TypeScript tsc, mypy, pyright
- Extract: lint command, format command, type-check command, pre-commit config

### 1.4 Environment Variables
- Scan `.env.example`, `.env.sample`, `.env.template`
- Scan code for `process.env.`, `os.environ`, `os.getenv`, `env::var`
- Extract: required vars, optional vars, which have defaults, which need secrets

### 1.5 Architecture Patterns
- Directory structure analysis (src/, lib/, api/, components/, etc.)
- Import graph patterns (barrel files, absolute imports, path aliases)
- Key abstractions: repositories, services, controllers, handlers, middleware
- Database access patterns (ORM, raw queries, repository pattern)
- State management approach

### 1.6 Coding Conventions
- Naming conventions (camelCase, snake_case, PascalCase for what)
- File naming patterns (kebab-case files, PascalCase components)
- Import ordering (stdlib, third-party, local)
- Error handling patterns (Result types, try/catch, error codes)
- Comment style and documentation patterns

### 1.7 Git Workflow
- Branch naming from git log / branch list
- Commit message style from recent commits
- PR template if present
- Branch protection / CODEOWNERS

## Phase 2: AGENTS.md Generation

Structure the output following this template:

```markdown
# AGENTS.md

Instructions for AI coding agents working in this repository.

## Quick Start

[One-command setup + verification]

## Commands

| Task | Command |
|------|---------|
| Build | `[command]` |
| Dev | `[command]` |
| Test | `[command]` |
| Lint | `[command]` |
| Format | `[command]` |
| Type check | `[command]` |

## Environment

Required environment variables:
- `VAR_NAME` — [purpose] ([how to obtain])

## Architecture

[Brief description of project structure and key patterns]

### Key Rules
- [Convention 1 — e.g., "All DB access through Repository class"]
- [Convention 2 — e.g., "TypeScript imports use .js extensions"]
- [Convention 3 — e.g., "Never import from internal modules directly"]

### Directory Structure
```
src/
  components/  — [purpose]
  lib/         — [purpose]
  api/         — [purpose]
```

## Testing

- Test files go in: `[location]`
- Naming convention: `[pattern]`
- Run single test: `[command]`
- [Any special test setup needed]

## Git Workflow

- Branch from: `[branch]`
- Branch naming: `[pattern]`
- Commit style: `[description]`
- [PR process if applicable]

## Common Pitfalls

- [Things agents commonly get wrong in this codebase]
- [Patterns that look right but are wrong here]
```

## Phase 3: Lint Mode (for existing AGENTS.md)

Check the existing file against this completeness checklist:

| Section | Required | Present | Accurate |
|---------|----------|---------|----------|
| Quick Start | Yes | ? | ? |
| Build/Dev/Test commands | Yes | ? | ? |
| Environment variables | Yes | ? | ? |
| Architecture overview | Yes | ? | ? |
| Key rules/conventions | Yes | ? | ? |
| Directory structure | Recommended | ? | ? |
| Testing instructions | Yes | ? | ? |
| Git workflow | Recommended | ? | ? |
| Common pitfalls | Recommended | ? | ? |

For each section:
1. **Present**: Does it exist in the file?
2. **Accurate**: Does it match what the repo analysis found? Flag stale commands, missing env vars, outdated patterns.
3. **Complete**: Are there significant gaps within the section?

Output a lint report with specific fix suggestions.

## Phase 4: Review & Write

1. Present the generated/linted AGENTS.md to the user.
2. Ask if any sections need adjustment.
3. Write to the project root as `AGENTS.md`.
4. If the project also has a `CLAUDE.md`, note any duplication and suggest consolidation.

## Verification

- [ ] All commands verified by checking package manifests (not guessed)
- [ ] Environment variables cross-referenced with actual code usage
- [ ] Architecture section reflects actual directory structure
- [ ] No placeholder text left in output
- [ ] File is concise (agents work better with focused instructions, not novels)

## Relationship to CLAUDE.md

- **CLAUDE.md** = instructions for Claude specifically (may include personality, learned mistakes, user preferences)
- **AGENTS.md** = universal agent instructions (any AI coding agent should understand these)
- If a project has both, AGENTS.md covers the universal stuff, CLAUDE.md adds Claude-specific context
- This skill generates AGENTS.md; it does not modify existing CLAUDE.md files

## Source Attribution

Based on the insight that a well-organized AGENTS.md + lint rules solve 80% of agent environment problems.
Via Nate's Newsletter (2026-03-24): "Accenture booked $2.2 billion in AI consulting last quarter."
Alvin Sng's research on lint-as-architecture referenced for complementary approach.
