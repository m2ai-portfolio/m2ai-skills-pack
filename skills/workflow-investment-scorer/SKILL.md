---
name: workflow-investment-scorer
description: Score each workflow on six dimensions (frequency, mistake cost, judgment, model-improvement trajectory, market maturity, company specificity) and emit a capital-allocation recommendation — automate / build / buy / hire / wait. Trigger on "score this workflow", "investment motion", "should I automate or buy", "build buy hire wait".
---

# Workflow Investment Scorer

Scores each workflow on six dimensions and routes it to the right capital allocation motion: automate internally, build a custom tool, buy a vendor solution, hire a human, or wait for the market to mature.

## When to trigger

- User says "workflow-investment-scorer", "score this workflow", "investment motion", "should I automate or buy", "build buy hire wait"
- After decomposing workflows into an annotated list
- Before any AI project kickoff as a go/no-go gate
- During quarterly AI portfolio reviews

## The Six Scoring Dimensions

| Dimension | What to assess | Weight |
|-----------|---------------|--------|
| **Frequency** | How often does the workflow run? | High |
| **Mistake cost** | What's the cost of an AI error here (reversible vs. catastrophic)? | High |
| **Judgment required** | Does this require nuanced human judgment, or is it rule-following? | High |
| **Model-improvement trajectory** | Is AI capability in this domain improving fast enough to justify waiting? | Medium |
| **Market maturity** | Are there proven vendors for this workflow already? | Medium |
| **Company specificity** | Does this workflow require deep company-specific context AI can't learn from generic training? | Medium |

## Phase 1: Accept workflow list

Accept a list of workflows. Each needs at minimum:
- Workflow name
- Frequency
- Brief description

If inputs are incomplete, ask for the missing fields — do not assume. Frequency and mistake cost are the two most load-bearing dimensions; never skip them.

## Phase 2: Score each workflow

For each workflow, score each dimension 1–5:

**Frequency**
- 5 = Runs >50x per day
- 3 = Runs daily/weekly
- 1 = Ad-hoc or rare

**Mistake cost** (inverse — higher score = lower mistake cost = safer to automate)
- 5 = Fully reversible, end user never sees errors
- 3 = Costly but recoverable (manual review catches errors)
- 1 = Irreversible or public-facing catastrophe risk

**Judgment required** (inverse — higher score = less judgment = easier to automate)
- 5 = Pure rule-following, no context-dependence
- 3 = Mostly rule-following with edge-case escalation
- 1 = Requires contextual human judgment on most instances

**Model-improvement trajectory**
- 5 = AI capability in this domain is advancing rapidly (within 12 months, current gaps will close)
- 3 = Steady improvement, gaps close in 2–3 years
- 1 = Domain is difficult or underserved; AI progress is slow

**Market maturity**
- 5 = Multiple proven vendors, commodity pricing, clear integrations
- 3 = Emerging vendors, some proven case studies
- 1 = No credible off-the-shelf solution exists

**Company specificity**
- 5 = Generic workflow, any org runs it the same way
- 3 = Some company-specific context required
- 1 = Deeply org-specific — requires institutional knowledge or proprietary data

## Phase 3: Route to motion

Calculate composite score (sum of all six dimensions, 6–30 range) and apply motion logic:

| Motion | Primary trigger |
|--------|----------------|
| **Automate** | Frequency ≥4, mistake cost ≥3, judgment ≥3. Build or buy the automation now. |
| **Build** | High company specificity (≤2) + moderate automation signal. Off-the-shelf won't cover your context. |
| **Buy** | Market maturity ≥4. A vendor solution already exists — evaluate before building. |
| **Hire** | Judgment ≤2. Workflow requires human judgment; AI cannot reliably substitute yet. |
| **Wait** | Model-improvement trajectory ≥4 but current capability low. AI will close the gap — avoid premature build. |

Tiebreaker rules (apply in order when dimensions conflict):
1. Mistake cost = 1 always routes to Hire or Wait regardless of other scores
2. Company specificity ≤ 2 with market maturity ≥ 4 → Buy first, then customize
3. Frequency ≥ 4 + judgment ≤ 2 → Hire (do not automate judgment-heavy high-frequency work)

## Phase 4: Output the budget memo

```
## Workflow Investment Memo

| Workflow | Freq | Mistake | Judgment | Trajectory | Market | Specificity | Score | Motion |
|----------|------|---------|----------|------------|--------|-------------|-------|--------|
| [name]   | N    | N       | N        | N          | N      | N           | N/30  | [MOTION] |
...

### Routing Rationale

**[Workflow name] → [MOTION]**
[Two sentences: why this motion, and what specifically to do next]

...

### Top 3 Highest-ROI Actions
1. [workflow + motion + concrete next step]
2. ...
3. ...

### Borderline Cases
[Any workflows where the routing decision is within one point of a different motion — flag for human review]
```

## Rules

- Never route a workflow to Automate if mistake cost = 1
- Never skip the tiebreaker check — most real workflows have conflicting signals
- Output the full table, not a summary — every workflow must appear with its scores
- Do not recommend specific vendors — routing to Buy is enough; vendor evaluation is a separate step
- When frequency is marked `unknown`, score it as 1 until confirmed — conservative default

## Source

Nate's Newsletter, 2026-05-17 — "Executive Briefing: Stop asking if AI can do this. Start asking what shape the work is."
Six-dimension classification framework for capital allocation decisions. Per Gartner's >40% agentic-AI cancellation forecast by EOY 2027: skipping this classification step is the primary cause of premature builds and failed deployments.
