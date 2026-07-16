---
name: comprehension-gate
description: Pre-merge review that checks a PR diff not for syntax or test coverage, but for human understanding of implications -- plain-text credentials, cross-service data leaks, tokens without TTL, blast radius of failures, caching in shared locations. Outputs a comprehension artifact (not pass/fail) that ensures someone understood implications before merge. Use when the user says "comprehension gate", "comprehension check", "understanding review", "implication review", "pre-merge comprehension", "dark code check", or wants to verify that a PR's implications are understood before merging.
---

# Comprehension Gate

A pre-merge review layer that reads a PR diff not for syntax correctness or test coverage, but for *understanding*: does the author (human or AI) understand the implications of what they wrote? Produces a comprehension artifact that documents what was checked and what needs human attention.

This is NOT a linter. It does not pass or fail. It produces a document that says "here is what this change implies, and here is what you should confirm you understand before merging."

## Prerequisites

- A PR diff or set of changed files to analyze
- Access to the repository for cross-referencing
- Works standalone or as an addition to the `pr-review-toolkit` agent suite

## Phase 1: Gather the Diff

Get the changes to analyze:

```bash
# For a PR number:
gh pr diff <PR_NUMBER>

# For unstaged changes:
git diff

# For staged changes:
git diff --cached

# For a branch vs main:
git diff main...HEAD
```

Parse the diff into a list of changed files with their hunks.

## Phase 2: Credential and Secret Scan

Check every added/modified line for:

- [ ] **Plain-text credentials**: API keys, passwords, tokens, connection strings
- [ ] **Hardcoded secrets**: strings matching patterns like `sk-`, `ghp_`, `Bearer `, base64-encoded blocks
- [ ] **Credential file references**: paths to `.env`, `credentials.json`, `keyfile.pem` that are newly added
- [ ] **Token handling without TTL**: tokens stored without expiry, refresh logic, or rotation
- [ ] **Secrets in logs**: any `console.log`, `print()`, `logger.` that outputs variables containing credential-like names

Report format:
```markdown
### Credential Scan
- **ATTENTION**: [file:line] Token stored in variable `api_key` with no TTL or rotation logic
- **OK**: No plain-text secrets detected in diff
```

## Phase 3: Cross-Service Data Flow

For each change that touches data flowing between services or modules:

- [ ] **Data boundary crossings**: Does this change send data to a different service, API, or storage system?
- [ ] **PII in transit**: Does personally identifiable information cross a service boundary without encryption/masking?
- [ ] **Tenant isolation**: In multi-tenant systems, does this change risk leaking data between tenants?
- [ ] **Cache scope**: Are values cached in a shared location (Redis, module-level dict) that could serve stale or wrong-tenant data?
- [ ] **Logging sensitive data**: Do new log statements include user data, request bodies, or response payloads?

Report format:
```markdown
### Cross-Service Data Flow
- **ATTENTION**: [file:line] User email is passed to external analytics API without masking
- **ATTENTION**: [file:line] Cache key `user_prefs_{id}` uses shared Redis -- verify tenant isolation
- **OK**: No cross-service data boundary changes detected
```

## Phase 4: Failure Blast Radius

For each change that modifies error handling, control flow, or service calls:

- [ ] **Silent failures**: New `try/except` or `catch` blocks that swallow errors (empty catch, log-only)
- [ ] **Fallback behavior**: New fallback/default paths -- what happens when the fallback fires? Is it safe?
- [ ] **Retry without backoff**: Retry loops without exponential backoff or max attempts
- [ ] **Missing circuit breakers**: New external service calls without timeout or circuit breaker
- [ ] **Cascade risk**: If this function fails, what downstream services/users are affected?
- [ ] **Partial state**: Operations that write to multiple stores without transactions -- what happens if step 2 fails after step 1 succeeds?

Report format:
```markdown
### Failure Blast Radius
- **ATTENTION**: [file:line] `catch (e) { return null }` silently swallows database errors -- callers assume success
- **ATTENTION**: [file:line] HTTP call to payment API has no timeout -- could hang indefinitely
- **OK**: Error handling changes look intentional and well-bounded
```

## Phase 5: Architectural Implications

For structural changes (new files, new dependencies, interface changes):

- [ ] **New dependency**: Is a new package/service introduced? What is its maintenance status, security posture?
- [ ] **Interface changes**: Are public API signatures, database schemas, or message formats modified? Who else consumes them?
- [ ] **State machine violations**: Do state transitions follow documented valid paths?
- [ ] **Concurrency changes**: New async operations, threads, workers -- are there ordering dependencies?

Report format:
```markdown
### Architectural Implications
- **ATTENTION**: New dependency `fast-xml-parser` added -- last published 8 months ago, check for known CVEs
- **ATTENTION**: Database column `status` changed from VARCHAR to ENUM -- requires migration for existing rows
- **OK**: No structural changes detected
```

## Phase 6: Comprehension Artifact

Combine all phases into a single artifact:

```markdown
# Comprehension Gate Report

**PR**: #<number> | **Branch**: <branch> | **Date**: <date>
**Files changed**: <count> | **Lines added**: <count> | **Lines removed**: <count>

## Items Requiring Human Confirmation

1. [CREDENTIAL] <description> -- Confirm: is this intentional?
2. [DATA FLOW] <description> -- Confirm: is tenant isolation maintained?
3. [BLAST RADIUS] <description> -- Confirm: is silent failure acceptable here?

## Items Reviewed (No Issues)

- Credential scan: clean
- Cross-service data: no boundary crossings
- ...

## Comprehension Checklist

Before merging, confirm you understand:
- [ ] Why each ATTENTION item is acceptable (or fix it)
- [ ] The blast radius if the primary change fails
- [ ] Which downstream consumers are affected
- [ ] Whether this change is safely reversible
```

This artifact is NOT a gate that blocks merge. It is a document that the merger signs off on. The value is in forcing the question "do I understand what this does?" before clicking merge.

## Integration with pr-review-toolkit

This skill complements existing `pr-review-toolkit` agents:
- `code-reviewer`: checks style and patterns
- `silent-failure-hunter`: checks error handling (Phase 4 overlaps -- comprehension-gate adds the broader context)
- `comprehension-gate` (this skill): checks for understanding of implications across all dimensions

When used together, run `comprehension-gate` last, as it benefits from issues already surfaced by other agents.

## Source Attribution

Extracted from Nate Kadlac's newsletter digest (2026-04-13) -- "Dark Code" essay on comprehension gates as the third layer of defense against code no one understands. Idea #3: PR review layer focused on understanding, not syntax.
