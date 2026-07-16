---
name: completion-vs-acceptance
description: Analyze the gap between an agent's self-reported completion rate and the actual acceptance rate (tasks the user or downstream validator kept without correction). Produces a 2x2 quadrant — Trusted, Overconfident, Conservative, Failing — for each workflow type. Use when the user says "completion rate", "acceptance rate", "how trusted is my agent", "agent done vs actually accepted", "completion-vs-acceptance", or wants to understand which agent workflows have earned autonomy.
---

# Completion vs Acceptance Analyzer

An agent marking a task "done" is not the same as the output being accepted. Measuring only completion rate hides the failure mode where agents confidently produce work that gets corrected or discarded. This skill computes both rates per workflow type and places each in a 2x2 trust quadrant.

## When to Invoke

- You want to know which agent workflows are actually trusted, not just finished
- Completion rate is green but users are silently correcting output downstream
- Preparing to grant an agent more autonomy and need data to justify it
- Building a dashboard that shows agent health beyond pass/fail counts

## Inputs

- **Event source** — a SQLite table, JSON log file, or structured event stream containing task records with at minimum:
  - `task_id`
  - `workflow_type` (e.g. "code-review", "email-draft", "db-migration")
  - `status` — the agent-reported final state (`completed`, `failed`, etc.)
  - `accepted` — boolean or null; true when the output was kept without correction
- **Time window** — default: last 30 days
- **Minimum sample size** — default: 10 tasks per workflow type (suppress quadrant placement below this)

If `accepted` is not available in the data source, the skill asks the user to identify the proxy signal (e.g., "no follow-up correction task filed within 48h", "downstream stage consumed the output without retry", "approval_granted event emitted").

## Phase 1: Compute Rates

For each `workflow_type` with sufficient samples:

```
completion_rate = tasks where status == "completed" / total tasks
acceptance_rate = tasks where accepted == true / tasks where status == "completed"
```

If `accepted` data is sparse or absent, flag it and offer to use a proxy column the user identifies.

## Phase 2: Quadrant Placement

Plot each workflow type on a 2x2 grid:

|                            | High Acceptance (>=80%) | Low Acceptance (<80%)  |
|----------------------------|-------------------------|------------------------|
| **High Completion (>=80%)** | **Trusted** — safe to grant more autonomy | **Overconfident** — agent ships work users silently fix |
| **Low Completion (<80%)**  | **Conservative** — agent under-reports; check false failure signals | **Failing** — both metrics red; investigate root cause |

Thresholds are configurable. Default: 80% for both axes.

## Phase 3: Produce the Report

```
COMPLETION VS ACCEPTANCE REPORT
================================
Window: <start> — <end>
Workflow types analyzed: N

TRUSTED (high completion + high acceptance)
  code-review       completion: 94%  acceptance: 91%  (n=47)

OVERCONFIDENT (high completion + low acceptance)
  email-draft       completion: 88%  acceptance: 61%  (n=34)
  db-migration      completion: 82%  acceptance: 58%  (n=12)

CONSERVATIVE (low completion + high acceptance)
  security-scan     completion: 71%  acceptance: 86%  (n=29)

FAILING (low completion + low acceptance)
  (none in this window)

RECOMMENDATIONS
  email-draft: HIGH PRIORITY — acceptance gap is 27pp. Review agent output samples
    for the most recent 10 corrections. Likely cause: tone or format mismatch.
  db-migration: Review whether agent is skipping schema validation steps.
  security-scan: False-failure rate may be high — check if "failed" tasks succeed
    on immediate retry without human intervention.
```

## Phase 4: Autonomy Signal

Summarize which workflow types have earned expanded autonomy based on trust quadrant:

```
AUTONOMY SIGNAL
  OK  code-review: Trusted for N consecutive periods. Safe to reduce HIL review frequency.
  NO  email-draft: Do not expand autonomy until acceptance rate exceeds 80%.
  NO  db-migration: Hold at current autonomy tier pending root-cause investigation.
```

## Verification

- [ ] Rates sum correctly: `completion_rate + (1 - completion_rate) == 1.0`
- [ ] Acceptance rate is computed only over completed tasks, not total tasks
- [ ] Workflow types below the minimum sample threshold are listed but not placed in a quadrant
- [ ] The report clearly states the data source and time window
- [ ] Proxy signals used instead of a native `accepted` field are disclosed inline

## Notes

The completion-vs-acceptance gap is caused by agents treating "I finished the task" as equivalent to "the task was correct." Closing the gap requires either a native acceptance signal in the event schema or a reliable proxy. If neither exists, suggest that the user instrument one as a first step.

## Source

Nate's Newsletter (natesnewsletter@substack.com), 2026-05-28:
*"Your agent dashboard is green. The run underneath it is where the work actually broke."*

Idea #4 — `completion-vs-acceptance` quadrant analyzer. Nate's framing: "completion rate becomes acceptance rate and workflows earn more autonomy only when trust data justifies it."
