---
name: launch-filter
description: >
  Run any agent or AI product announcement through Nate's 5-question launch filter to get a
  structured verdict and go/wait/skip recommendation. Use when evaluating a new agent platform,
  AI product release, or vendor announcement. Trigger: "/launch-filter", "evaluate this launch",
  "should we adopt X", "filter this agent announcement", paste an announcement or URL.
---

# Agent Launch Filter

Takes any agent announcement — URL, press release, release notes, or pasted text — and runs it
through a sequenced 5-question filter to produce a scored verdict and a go/wait/skip recommendation.

Replaces Matthew's manual weekly evaluation loop with a 30-second invocation.

## The 5-Question Filter

Questions are sequenced: each answer constrains the next. A hard "no" on #1 or #3 is a skip signal
regardless of later scores.

| # | Question | What you're detecting |
|---|---|---|
| 1 | **Tool integration** — Does it plug into existing tools or expect migration? | Migration cost vs. drop-in value |
| 2 | **Openness** — Is it open to other agents building on top? | Platform vs. walled garden |
| 3 | **Data access** — Does it own or access data the team actually cares about? | Native graph advantage |
| 4 | **Ecosystem forming** — Marketplace, SDK, named partners, ship cadence present? | Long-term moat signal |
| 5 | **Stackability** — Can agent A invoke, script, or build on agent B? | Integration ceiling |

## Phases

### Phase 1: Gather the Announcement

If the user provided a URL, fetch the page content (WebFetch). If they pasted text, use it directly.
If neither, ask: "Paste the announcement text or give me a URL."

Extract:
- Product/agent name and vendor
- Key capability claims
- Integration points mentioned
- Data access claims
- Pricing model (if stated)

### Phase 2: Run the Filter

Score each question 0–2:
- **2** = clear yes with evidence
- **1** = partial / ambiguous / "coming soon"
- **0** = no / opposite is true

**Q1 — Tool Integration**
- 2: drops into existing stack (MCP, API, OAuth, no data migration required)
- 1: partial integration, some migration needed or new credentials/onboarding required
- 0: requires platform switch, data export, or proprietary lock-in to access features

**Q2 — Openness**
- 2: open SDK or MCP exposure; other agents can call it programmatically
- 1: API exists but limited (rate limits, no SDK, closed beta)
- 0: closed; no programmatic access for external agents

**Q3 — Data Access** ← hard gate: score 0 = skip unless Q1+Q2 compensate
- 2: natively accesses data graphs the team uses (M365, Google Workspace, Salesforce, existing DBs)
- 1: accesses some relevant data but requires connectors or sync jobs
- 0: no access to team data; operates only on inputs you manually provide

**Q4 — Ecosystem**
- 2: marketplace listed, SDK available, named partners announced, ships regularly
- 1: early marketplace or SDK, few partners, infrequent releases
- 0: no marketplace, no SDK, no visible partner traction

**Q5 — Stackability**
- 2: agent A can invoke agent B via API, MCP, or SDK; deterministic hooks available
- 1: some scripting possible but not first-class; workarounds needed
- 0: silo; no path for other agents to build on top

### Phase 3: Score and Recommend

Total score: 0–10

**Routing buckets:**

| Score | Bucket | Recommendation |
|---|---|---|
| 8–10 | **Go** | Adopt or integrate now. High fit, ecosystem is forming, stackable. |
| 5–7 | **Wait** | Monitor for 60–90 days. Missing 1–2 key signals; revisit when ecosystem matures. |
| 0–4 | **Skip** | Not worth adoption now. Significant integration cost or data gap. |

**Override rules:**
- Q3 = 0 AND (Q1 + Q2) < 3 → hard Skip regardless of total
- Q1 = 0 → bump recommendation one step toward Skip (Go → Wait, Wait → Skip)

### Phase 4: Output

```
## Launch Filter: [Product Name]

**Verdict: [Go / Wait / Skip]**   Score: [N]/10

| Question | Score | Evidence |
|---|---|---|
| Q1 Tool Integration | [0-2] | [one sentence] |
| Q2 Openness | [0-2] | [one sentence] |
| Q3 Data Access | [0-2] | [one sentence] |
| Q4 Ecosystem | [0-2] | [one sentence] |
| Q5 Stackability | [0-2] | [one sentence] |

**Rationale:** [2-3 sentences on why this verdict, what the key signal was]

**If Go:** [Concrete next step — what to integrate, where, how long]
**If Wait:** [What to watch for — specific signals that would move to Go]
**If Skip:** [Alternatives worth evaluating instead, if any]
```

## Verification

- Every question has a score 0–2 with at least one evidence sentence
- Override rules applied if Q3 = 0 or Q1 = 0
- Recommendation matches the score bucket (or override is documented)
- Output is copyable — no raw tool output in the block

## Source

Nate Kadlac, "The 5-question filter I run every agent launch through (so you can stop reading release notes)",
natesnewsletter.substack.com, 2026-04-29.
