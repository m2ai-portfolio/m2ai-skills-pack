---
name: adversarial-dual-model-workflow
description: Set up and run a two-AI coding workflow where a primary assistant handles planning and code generation while an adversarial auditor stress-tests the plan, catches edge cases, and reviews output before shipping. Use when the user wants complementary AI tool pairing, a structured code review gate, an adversarial planning loop, or a background audit running in parallel with active development.
---

# Adversarial Dual-Model Workflow

Structures a two-role AI workflow: one model acts as the creative pair-programmer (planning, writing, iterating), the other as the ruthless auditor (catching edge cases, stress-testing assumptions, reviewing before ship). Neither role is "better" — they have different superpowers. The reference implementation uses Claude Code as primary and the Codex CLI plugin as auditor, but the pattern applies to any pair of complementary AI tools.

## When to Invoke

Trigger on: "codex plugin", "claude and codex together", "adversarial code review", "second opinion from another AI", "dual model workflow", "review gate", "SWAT team audit", "stress-test my plan", "audit in parallel", "two AI tools", "complementary AI", or when the user wants a structured adversarial loop before shipping.

## Phase 1: Identify Roles

Ask the user to assign each tool to a role. If they are using Claude Code + Codex, defaults are already set.

| Role | Strengths | Default tool |
|------|-----------|-------------|
| **Primary (Builder)** | Planning, creative problem-solving, writing code, iterating | Claude Code |
| **Auditor (Reviewer)** | Edge-case detection, adversarial questioning, pre-ship validation | Codex / second model |

Key distinction to clarify upfront:
- **Adviser mode** — the auditor produces a report; the user decides what to fix. Lower cost, higher control.
- **Executor mode** — the auditor directly modifies code. Faster but requires careful scoping.

Recommend adviser mode for planning loops; executor mode only for targeted, well-scoped repairs.

## Phase 2: Select the Pattern

Present the five patterns and ask which situation applies. More than one may apply in a single session.

### Pattern 1 — Everyday Code Review
**When**: After writing a feature or fixing a bug. Low ceremony, high frequency.

Steps:
1. Stage or describe the change.
2. Invoke the auditor: "Review the current diff for logic errors, edge cases, and anything that would fail under load."
3. Triage the findings: fix criticals, log non-criticals in a follow-up task.

Cost: low (single audit pass). Recommended default before every commit.

### Pattern 2 — Adversarial Planning Loop
**When**: Before writing any code on a non-trivial feature. Invest 30–90 minutes here to save hours later.

Steps:
1. Write the plan in plain text: what you will build, key decisions, expected edge cases.
2. Send to auditor: "Grill this plan. What assumptions are wrong? What did I miss? What will break?"
3. Address every objection.
4. Repeat until the auditor has nothing left to say.

Signal the loop is done when the auditor's response is shorter than your plan.

### Pattern 3 — Background Rescue (SWAT Team)
**When**: You are actively building and feel stuck, or want an independent audit without pausing flow.

Steps:
1. Launch the auditor in background mode on the full codebase or a described problem.
2. Keep building with the primary tool.
3. When the audit completes, triage the report — expect a dense findings list (15–30 minutes of reading for a large codebase).
4. Prioritize: P0 (ship-blockers) → P1 (must-fix soon) → P2 (polish).

Caution: background audits on large codebases can be expensive. Set a token or time budget before launching.

### Pattern 4 — Pre-Ship Stress Test ("Pessimist Gate")
**When**: Before merging or deploying. Deliberately adversarial.

Steps:
1. Describe what you are about to ship.
2. Prompt the auditor as a pessimist: "Assume this will fail. What breaks first? What did the builder miss? What would make a senior reviewer reject this?"
3. Address every finding that would produce a production incident.
4. Only ship once the pessimist has been satisfied.

### Pattern 5 — Full Feature Cycle
**When**: Building a non-trivial feature end-to-end.

Sequence:
1. **Plan adversarially** (Pattern 2) until the auditor is silent.
2. **Build with the primary** tool — write the bulk of the code.
3. **Audit in background** (Pattern 3) while adding tests or documentation.
4. **Stress-test before ship** (Pattern 4) as the final gate.

## Phase 3: Configure the Audit Invocation

For the reference implementation (Claude Code + Codex plugin):

```bash
# Install the Codex Claude Code plugin once
# See: https://github.com/openai/codex-plugin-cc

# Adviser mode — Codex produces a report, you act on it
/codex review the current diff for edge cases and logic errors

# Background mode — audit runs while you keep building
/codex --background audit the full src/ directory for security issues

# Model selection (background flag)
/codex --background --model o3 review the authentication module
```

For other tool pairings, document the equivalent invocation here before running.

## Phase 4: Triage the Audit Report

When the audit completes, process findings in priority order:

| Priority | Definition | Action |
|----------|-----------|--------|
| P0 | Would cause a production incident or data loss | Fix before any further work |
| P1 | Logic error or edge case likely to surface in testing | Fix in this session |
| P2 | Style, optimization, or future-risk | Log as a follow-up task |
| Ignore | False positive or out of scope | Document why you rejected it |

Do not batch all findings into a later PR. P0 items ship with the feature or block it.

## Verification

- [ ] Roles assigned: primary builder and adversarial auditor are distinct tools or models
- [ ] Adviser vs executor mode explicitly chosen before the auditor touches any files
- [ ] At least one pattern selected and run before declaring the feature done
- [ ] Audit report triaged: every P0 finding addressed or explicitly rejected with a reason
- [ ] No finding silently dropped — rejections are logged
- [ ] Token/time budget set if using background mode on a large codebase

## Source

Mark Kashef — "You Can Run Claude AND Codex Together. Here's How." (YouTube, 2026-04-26). Video ID: `Fu5KIG2Jm1g`. Core insight: stop picking a winning AI tool; assign complementary roles (creative builder + ruthless auditor) and wire them together. The five patterns generalize beyond Claude+Codex to any two-model pairing. Codex plugin: `https://github.com/openai/codex-plugin-cc`.
