---
name: context-layer-generator
description: Generate three structured context artifacts for any module or service -- a structural manifest (what it does, dependencies, dependents), behavioral contracts (idempotency, retry semantics, failure modes, performance expectations), and a decision log pre-filled from git history explaining why architectural choices were made. Use when the user says "generate context layer", "context layer", "module context", "behavioral contracts", "decision log", "document this module", "why was this built this way", or wants structured understanding artifacts for a codebase component.
---

# Context Layer Generator

For a given module, service, or codebase component, generate three structured artifacts that capture the full context a human or AI agent needs to understand and safely modify it.

## Prerequisites

- Target module/service must be in a git repository (git history required for decision log)
- Read access to the codebase
- GitNexus index available (optional, enhances dependency analysis)

## Phase 1: Identify the Target

Ask the user:
1. Which module, service, or directory should be documented?
2. What is the intended audience? (new engineer onboarding, AI agent, audit)
3. Should this cover a single module or a service boundary?

Validate the target exists. If GitNexus is indexed for this repo, run `gitnexus_context({name: "<module>"})` to get a 360-degree view first.

## Phase 2: Structural Manifest

Generate a manifest covering:

```markdown
# Structural Manifest: <module_name>

## Purpose
One-sentence description of what this module does and why it exists.

## Entry Points
- List of public functions/classes/endpoints with one-line descriptions

## Dependencies (What This Needs)
- Internal: modules/services this imports or calls
- External: third-party packages, APIs, databases

## Dependents (What Needs This)
- Internal: modules/services that import or call this
- External: consumers, cron jobs, webhooks that depend on this

## Data Flow
- Inputs: what data enters, from where, in what format
- Outputs: what data leaves, to where, in what format
- Side Effects: state changes, file writes, external API calls

## Configuration
- Environment variables consumed
- Config files read
- Feature flags checked
```

**How to populate:**
- Parse imports/requires to find dependencies
- Use `Grep` to find all references to the module's exports (dependents)
- If GitNexus is available, use `gitnexus_impact({target: "<symbol>", direction: "upstream"})` for accurate dependency graphs
- Read the module's code to identify entry points and data flow

## Phase 3: Behavioral Contracts

Generate contracts covering the runtime behavior:

```markdown
# Behavioral Contracts: <module_name>

## Idempotency
- Which operations are idempotent? Which are not?
- What happens on retry? (safe / duplicate side effects / errors)

## Failure Modes
- What exceptions/errors can this raise?
- How does it handle upstream failures? (retry, fallback, propagate)
- What is the blast radius if this module fails entirely?

## Performance Expectations
- Expected latency range (p50, p99 if known)
- Resource consumption (memory, CPU, connections)
- Rate limits or throttling (internal or external)

## Concurrency
- Thread-safe? Process-safe?
- Uses locks, queues, or atomic operations?
- Known race conditions or ordering dependencies

## State Management
- Stateless or stateful?
- If stateful: where is state stored, how is it recovered after crash?
- Cache behavior: TTL, invalidation strategy, shared vs local

## Security Boundaries
- Authentication/authorization checks performed
- Data sensitivity (PII, credentials, tokens)
- Token TTL and rotation expectations
```

**How to populate:**
- Read error handling patterns (try/catch, error returns)
- Check for retry logic, circuit breakers, fallback paths
- Look for lock/mutex usage, async patterns
- Identify database transactions, cache operations
- Scan for credential/token handling

## Phase 4: Decision Log

Pre-fill a decision log from git history and code:

```markdown
# Decision Log: <module_name>

## Architecture Decisions

### ADR-001: [Decision Title]
- **Date**: YYYY-MM-DD (from git blame/log)
- **Author**: (from git blame)
- **Context**: What problem was being solved?
- **Decision**: What was chosen?
- **Evidence**: git commit hash, PR link, code comment
- **Alternatives Considered**: (inferred from code comments, PR descriptions)
- **Status**: Active / Superseded by ADR-XXX
```

**How to populate:**
1. Run `git log --follow --oneline <module_path>` to get the full history
2. Identify significant commits (initial creation, major refactors, bug fixes that changed behavior)
3. Run `git blame <key_files>` to find authorship of critical sections
4. Read code comments, especially those starting with "NOTE:", "HACK:", "TODO:", "WHY:", "DECISION:"
5. Check for linked PR numbers in commit messages and fetch PR descriptions if available
6. Synthesize each significant change into an ADR entry

Focus on the "why" -- not "changed function X" but "switched from polling to webhooks because latency was unacceptable for real-time use case."

## Phase 5: Output and Storage

Combine all three artifacts into a single file: `<module_name>.context.md`

Suggested storage locations (ask user preference):
- In-repo: `docs/context/<module_name>.context.md`
- Obsidian vault: `vault/projects/<project>/context/<module_name>.context.md`
- Alongside module: `<module_path>/CONTEXT.md`

## Verification

After generation, verify:
- [ ] All listed dependencies actually exist and are importable
- [ ] All listed dependents actually reference this module (spot-check 3)
- [ ] Decision log entries link to real git commits
- [ ] Behavioral contracts match observable code patterns (not aspirational)

## Source Attribution

Extracted from Nate Kadlac's newsletter digest (2026-04-13) -- "Dark Code" essay on recoupling comprehension with authorship. Idea #2: Context Layer Generator for structured module understanding artifacts.
