---
name: agent-readiness-audit
description: Audit a codebase for agent-readiness across 8 pillars (style/validation, build systems, testing, docs, dev environment, code quality, observability, security governance). Generates a scored report with a prioritized fix list measured in estimated days. Use when the user says "audit readiness", "agent readiness", "codebase audit", "is this repo ready for agents", "readiness score", or wants to assess how well a project supports autonomous AI coding agents.
---

# Agent-Readiness Audit — Codebase Fitness for Autonomous Agents

Score any repository across the 8 pillars that determine whether AI coding agents can operate effectively. Produces a prioritized remediation plan with effort estimates.

## Prerequisites

- Target repository must be locally cloned and accessible
- Works with any language/framework (polyglot detection)
- No external API calls required (pure static analysis)

## Phase 1: Repository Discovery

1. Identify the repo root (`git rev-parse --show-toplevel` or user-provided path).
2. Detect primary languages and frameworks via file extensions, package manifests (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, etc.).
3. Identify monorepo structure if present (workspaces, multiple package manifests).

## Phase 2: 8-Pillar Assessment

Score each pillar 1-5 (1 = absent, 5 = production-grade). Use the following checklist per pillar:

### Pillar 1: Style & Validation
- [ ] Linter configured (ESLint, Ruff, clippy, etc.)
- [ ] Formatter configured (Prettier, Black, rustfmt, etc.)
- [ ] Pre-commit hooks enforce style
- [ ] CI runs lint checks
- **Score criteria**: 1 = no linter; 3 = linter exists but not enforced; 5 = enforced in CI + pre-commit

### Pillar 2: Build Systems
- [ ] Build command documented or discoverable
- [ ] Build succeeds from clean checkout
- [ ] Build artifacts are gitignored
- [ ] Reproducible builds (lockfiles present)
- **Score criteria**: 1 = no build config; 3 = builds but undocumented; 5 = one-command build, lockfiles, CI-verified

### Pillar 3: Testing
- [ ] Test framework configured
- [ ] Tests exist and pass
- [ ] Coverage reporting available
- [ ] CI runs tests on PR
- **Score criteria**: 1 = no tests; 3 = tests exist but sparse/flaky; 5 = >70% coverage, CI-enforced, fast suite

### Pillar 4: Documentation
- [ ] README with setup instructions
- [ ] CLAUDE.md or AGENTS.md present
- [ ] Architecture decision records or docs/
- [ ] API documentation (if applicable)
- **Score criteria**: 1 = no docs; 3 = README exists but stale; 5 = comprehensive docs + agent instructions

### Pillar 5: Dev Environment
- [ ] Environment setup is scripted or documented
- [ ] Dependencies install cleanly
- [ ] .env.example or equivalent exists
- [ ] Docker/devcontainer available (bonus)
- **Score criteria**: 1 = tribal knowledge only; 3 = partially documented; 5 = zero-to-running in one command

### Pillar 6: Code Quality
- [ ] Type checking configured (TypeScript strict, mypy, etc.)
- [ ] No dead code / unused imports flagged
- [ ] Consistent project structure
- [ ] Dependency freshness (no critical CVEs)
- **Score criteria**: 1 = no type checking, inconsistent structure; 3 = types exist but partial; 5 = strict types, clean structure, maintained deps

### Pillar 7: Observability
- [ ] Logging framework configured
- [ ] Error tracking (Sentry, etc.) or structured error handling
- [ ] Health check endpoints (if service)
- [ ] Metrics/tracing (bonus)
- **Score criteria**: 1 = print statements only; 3 = logging exists but unstructured; 5 = structured logging + error tracking + metrics

### Pillar 8: Security Governance
- [ ] Secrets management (no hardcoded secrets)
- [ ] .gitignore covers sensitive files
- [ ] Dependency audit configured (npm audit, pip-audit, etc.)
- [ ] CODEOWNERS or branch protection
- **Score criteria**: 1 = secrets in code; 3 = gitignore exists but no audit; 5 = secrets externalized, audit in CI, branch protection

## Phase 3: Score Calculation

1. Calculate per-pillar scores (1-5).
2. Calculate overall readiness score: average of all 8 pillars, scaled to 0-100.
3. Classify overall readiness:
   - **0-30**: Not Ready — agents will struggle significantly
   - **31-50**: Partially Ready — agents can help but will hit frequent blockers
   - **51-70**: Mostly Ready — agents effective with minor friction
   - **71-100**: Agent-Ready — agents can operate with minimal supervision

## Phase 4: Remediation Plan

For each pillar scoring below 4, generate a fix item:

```
### [Pillar Name] (Score: X/5)
**Gap**: What's missing
**Fix**: Specific action to take
**Effort**: Estimated days (0.5, 1, 2, 3, 5)
**Impact**: How much this improves agent effectiveness
**Priority**: P1 (do first) / P2 (do soon) / P3 (nice to have)
```

Sort fixes by priority, then by effort (quick wins first).

## Phase 5: Report Output

Present the full report:

```
# Agent-Readiness Audit: [repo-name]
Date: [date]
Overall Score: XX/100 ([classification])

## Pillar Scores
| Pillar | Score | Status |
|--------|-------|--------|
| Style & Validation | X/5 | [emoji] |
| Build Systems | X/5 | [emoji] |
| ... | | |

## Top 3 Quick Wins
1. ...
2. ...
3. ...

## Full Remediation Plan
[sorted fix items]

## Estimated Total Effort: X days
```

## Verification

- [ ] All 8 pillars scored with evidence
- [ ] No pillar scored without checking at least 2 indicators
- [ ] Remediation items have concrete, actionable fixes (not vague advice)
- [ ] Effort estimates are realistic (not aspirational)

## Source Attribution

Technique derived from Factory.ai's 8-pillar codebase assessment methodology.
Via Nate's Newsletter (2026-03-24): "Accenture booked $2.2 billion in AI consulting last quarter."
