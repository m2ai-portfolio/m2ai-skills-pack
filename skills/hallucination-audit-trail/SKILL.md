---
name: hallucination-audit-trail
description: Cross-checks an agent's self-reported processing log against filesystem evidence (file modification timestamps, existence, size) to detect hallucinated audit trails before they propagate downstream.
---

# Hallucination Audit Trail Validator

Agents sometimes report processing files they never actually touched — a "hallucinated audit trail." This skill cross-checks an agent's self-reported action log against filesystem evidence, catching fabricated claims before downstream steps act on them.

## Trigger

Use when the user says "verify the agent actually did X", "check the audit trail", "did the agent really process these files", "validate the output log", when a pipeline Judge step needs to verify Builder claims, or after any agent run handling consequential data.

## Phase 1: Collect the Agent's Self-Report

Ask for:
1. **Agent's processing log** — the list of actions the agent claims to have taken (paste directly or provide file path)
2. **Expected action type** — what should the agent have done? (read, written, modified, created, deleted)
3. **Target directory** — where should the evidence be? (default: `.`)
4. **Time window** — when did the agent run? Start and end timestamps (used to scope modification checks)

## Phase 2: Evidence Mapping

For each claimed action in the agent's report, map to expected filesystem evidence:

| Claimed Action | Expected Evidence |
|----------------|-------------------|
| "Read file X" | File X exists |
| "Wrote file X" | File X exists, mtime within run window |
| "Modified file X" | File X exists, mtime within run window |
| "Created file X" | File X exists, ctime within run window |
| "Processed N records from file X" | File X exists; size/line count consistent with N records |
| "Deleted file X" | File X does NOT exist |
| "Appended to file X" | File X exists, mtime within run window, size > pre-run size |

## Phase 3: Filesystem Verification

For each claimed action, check the evidence using file inspection tools:
- Verify file existence (Read or Glob)
- Check modification timestamp falls within the agent's run window
- For writes/creates: confirm file is non-empty
- For claimed content processing: spot-check that file content is consistent with what the agent claims to have seen (sample lines, record count)

Flag every claim where evidence is absent or contradicts the report.

## Phase 4: Discrepancy Report

```
## Audit Trail Verification

**Agent run window**: [start timestamp] – [end timestamp]
**Claims checked**: N
**Verified**: N
**Discrepancies**: N
**Inconclusive**: N

---

### Verified Claims
- ✓ `outputs/report.md` — exists, modified [timestamp], 4.2KB (within run window)
- ✓ `outputs/summary.json` — exists, created [timestamp], 1.1KB

### Discrepancies (Unsubstantiated Claims)
- ✗ `data/records.csv` — claimed "parsed 847 records" but file mtime predates run window by 3 hours (last modified: [timestamp])
- ✗ `outputs/analysis.md` — claimed "wrote analysis" but file does not exist

### Inconclusive (cannot verify)
- ? `logs/agent.log` — claimed "appended log entry" but log has no per-line timestamps; modification time is within window but append cannot be confirmed

---

### Verdict: PASS / FAIL / PARTIAL

**PASS**: All claims verified against filesystem evidence. Safe to proceed.

**FAIL**: N claims could not be substantiated. Do not treat the agent's report as ground truth. Re-run or escalate before downstream steps consume this output.

**PARTIAL**: Most claims verified; inconclusive items noted. Manual inspection recommended for flagged files before proceeding.
```

## Phase 5: Escalation Path

On FAIL or PARTIAL verdict:
1. Do not pass the agent's output to downstream pipeline steps
2. Re-run the agent with explicit file-write instructions (force concrete output artifacts at known paths)
3. Add a mandatory verification step to the pipeline before downstream consumption
4. If re-run also fails verification, escalate to human review — do not retry indefinitely

## Notes

- Read verification is weaker than write verification: an agent can read a file without modifying it, so absence of a modified timestamp is not proof a read didn't happen.
- Timestamps can be unreliable with misconfigured clocks or timezone offsets; use relative checks (file modified after agent started) rather than absolute timestamps where possible.
- This skill is most powerful as a Judge step in multi-agent pipelines, not as a one-off tool.
- A hallucinated audit trail is especially dangerous in data migration, ETL, and financial processing contexts — where downstream systems trust the log without re-verifying the data.

## Source

Extracted from Nate Kadlac newsletter (2026-04-21) — Opus 4.7 evaluation: agent claimed to have parsed a file it never actually processed; the hallucinated audit trail was only caught by cross-model peer review. Filesystem verification closes this gap without requiring a second model.
