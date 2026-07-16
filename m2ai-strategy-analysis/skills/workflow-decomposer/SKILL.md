---
name: workflow-decomposer
description: Turn a function, role, or process description into a list of discrete, scoreable workflows — the pre-step before any AI investment-motion decision. Trigger on "decompose this role", "break this function into workflows", "workflow decomposer", or before scoring any AI automation opportunity.
---

# Workflow Decomposer

Takes a function, role, or process description and outputs a list of discrete, scoreable workflows — the atomic unit required before any AI build/buy/hire/wait decision can be made.

## When to trigger

- User says "workflow decomposer", "decompose this role", "break this function into workflows", "what are the workflows in X"
- Before scoring workflows for AI investment decisions
- When auditing a team, department, or product for AI opportunity mapping

## Phase 1: Accept input

Accept one of:
- **Function or role description** ("Account Executive", "Invoice Processing", "Customer Onboarding")
- **Process narrative** — a paragraph describing how work gets done
- **Job description or process doc** — paste or file path

If the input covers multiple clearly distinct functions, ask which to decompose first. Keep scope to one function at a time for clean output.

## Phase 2: Decompose into atomic workflows

Break the function into discrete workflows. A workflow is atomic when it:
- Has a clear trigger (what starts it)
- Has a clear output (what it produces)
- Can be evaluated independently (success/failure is observable)
- Would be assigned to a single person or role in a non-AI org

Apply two decomposition rules:
1. **Split on decision type**: Routine execution vs. judgment calls are separate workflows
2. **Split on frequency tier**: Daily/weekly/monthly recurrences are separate workflows even if structurally similar

Aim for 5–15 workflows per function. If the list exceeds 15, group into sub-functions first.

## Phase 3: Annotate each workflow

For each workflow, add:

| Field | Description |
|-------|-------------|
| `name` | Short label (verb + noun, e.g., "Process invoice exceptions") |
| `trigger` | What kicks it off |
| `output` | What it produces |
| `frequency` | How often it runs (daily / weekly / ad-hoc / event-driven) |
| `avg_duration` | Estimated time per instance |
| `data_in` | Key inputs (systems, file types, human context required) |
| `data_out` | Key outputs (reports, records, decisions, messages) |

## Phase 4: Output

```
## Workflow Map: [Function Name]

Total workflows identified: N

| # | Name | Trigger | Output | Frequency | Duration | Data In | Data Out |
|---|------|---------|--------|-----------|----------|---------|---------|
| 1 | ... | ... | ... | ... | ... | ... | ... |
...

### Decomposition Notes
[Any workflows that couldn't be cleanly split — flag for follow-up]
[Sub-functions if the original scope was too broad]

### Suggested next step
Run a six-dimension investment scorer on these workflows to classify each into automate / build / buy / hire / wait.
```

## Rules

- Never merge a judgment-heavy workflow with a routine-execution workflow — they score differently on every investment dimension
- If frequency is unknown, mark as `unknown` — do not assume. Frequency is the single most important scoring input
- Output must be a clean table — no prose paragraphs for individual workflows
- Do not recommend actions yet — this phase is decomposition only

## Source

Nate's Newsletter, 2026-05-17 — "Executive Briefing: Stop asking if AI can do this. Start asking what shape the work is."
Reframes AI investment decisions as workflow classification before capital allocation.
