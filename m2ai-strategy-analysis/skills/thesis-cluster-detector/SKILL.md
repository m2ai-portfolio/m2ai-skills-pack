---
name: thesis-cluster-detector
description: Ingests a batch of enterprise AI or technology news items (from RSS, Substack previews, or pasted headlines) and clusters them by underlying investment thesis using embedding similarity or keyword co-occurrence, then emits a "what is the underlying bet" briefing when a cluster reaches a configurable threshold. Use when the user says "thesis cluster", "what's the underlying bet here", "cluster these stories", "detect the pattern", "what do these announcements have in common", or pastes multiple news items and wants to know if they are separate events or a single coordinated bet.
---

# Thesis Cluster Detector

Identifies when multiple apparently unrelated news items are actually one coordinated bet. Surfaces the hidden thesis connecting them before it becomes widely recognized.

## Trigger

Use when the user:
- Says "thesis cluster", "what's the underlying bet", "cluster these stories", "what pattern do I see here"
- Pastes 3+ news headlines, Substack summaries, or press release titles and asks what they have in common
- Wants to run a scheduled scan of news sources to detect emerging thesis clusters

## Input Modes

### Mode A: Interactive (user pastes items)

Ask the user to paste 3 or more news items (headlines, summaries, or URLs). Accept mixed formats. Each item needs at minimum: source name, date, one-line description of what was announced.

### Mode B: Batch scan (file or feed)

Accept a file path to a list of recent news items (one per line, CSV, or markdown list). Process all items at once and emit a cluster report.

### Mode C: Scheduled feed integration

If invoked from a scheduled task, accept items via stdin or a configured file path. Write cluster report to a configurable output path.

## Phase 1: Extract Items

For each news item, extract:
- **Actor**: who announced / who invested
- **Action**: what they did (acquired, partnered, launched, funded)
- **Object**: what product, technology, or company is involved
- **Capital signal**: dollar amount if mentioned
- **Category tags**: pick 1-3 from: [data-access, vector-storage, governed-action, action-fabric, model-provider, forward-deployed-engineering, agent-infrastructure, compliance-tooling, enterprise-workflow]

If category tags are ambiguous, assign the most specific applicable tag.

## Phase 2: Cluster by Thesis

Group items that share at least 2 category tags OR share a common Actor/Object relationship.

For each cluster of 2+ items, generate a one-sentence thesis:

> "These N announcements collectively bet that [WHAT WILL HAPPEN] -- specifically that [MECHANISM] will determine [WHO WINS]."

The thesis must name:
1. What the collective bet is (the claim about the future)
2. The mechanism (what changes)
3. The winner/loser structure (who benefits if the thesis is right)

A cluster of 1 item has no detectable thesis -- report it as a singleton.

## Phase 3: Threshold Check

Default threshold: emit a briefing when a cluster has 3+ items.

Configurable thresholds:
- `min_cluster_size`: minimum items to trigger a briefing (default 3)
- `min_capital`: only surface clusters where total named capital exceeds a threshold (optional)
- `recency_window`: only cluster items from the last N days (default 7)

If no cluster meets the threshold, report: "No thesis cluster detected above threshold. Largest cluster: [N items] around [category]."

## Phase 4: Briefing Output

For each qualifying cluster, output:

```
THESIS CLUSTER DETECTED
========================
Cluster size:     [N announcements]
Date range:       [earliest] to [latest]
Total capital:    ~$[X]B (if named)

Items:
  - [Actor] [Action] [Object] ([date])
  - [Actor] [Action] [Object] ([date])
  ...

Underlying Bet:
"[One-sentence thesis]"

What this means if the thesis is right:
- [First-order consequence]
- [Second-order consequence]
- [Who is most exposed / most positioned]

Confidence: [HIGH / MEDIUM / LOW]
  [One sentence justifying the confidence level]

Questions to ask next:
1. [Question that would confirm or refute the thesis]
2. [Question that would reveal the timeline]
```

Confidence scoring:
- HIGH: 4+ items, cross-actor (multiple independent parties making the same bet), capital named
- MEDIUM: 3+ items, same-sector, some capital named
- LOW: 2-3 items, single actor, or category overlap is weak

## Phase 5: Singleton Report

For items that did not cluster, list them briefly:

```
Singletons (no cluster):
- [Item description] — [category tag]
```

## Integration Notes

- Output pairs with `executive-briefing` for a deeper analysis of whichever cluster has the highest confidence
- Can be piped through `geopolitical-signal-enricher` to add supply chain / regional context to a detected cluster
- For ongoing monitoring, wrap in a scheduled task that ingests from an RSS feed or saved search and writes cluster reports to a daily briefing folder
- The "six announcements as one bet" frame from Nate's newsletter is the canonical worked example: Anthropic/Blackstone/H&F/GS venture, OpenAI enterprise vehicle, SAP/Dremio/Prior Labs, Pinecone Nexus, ServiceNow Action Fabric+MCP all clustering around "buy-the-build" rather than "buy-the-model"

## Source Attribution

Technique derived from Nate's Newsletter (2026-05-10): "Executive Briefing: Six announcements in 48 hours just changed how enterprise AI gets bought" -- the observation that six separate-seeming stories were one coordinated capital reallocation ($5.5B) away from model procurement toward deployment infrastructure.
