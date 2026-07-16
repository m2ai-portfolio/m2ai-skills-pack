---
name: diagnose
description: Strict 4-gate diagnostic protocol for bugs, failures, and broken pipelines. Forces stating the error, gathering logs/env/recent-changes, listing 3 ranked hypotheses, and getting explicit user approval BEFORE any code edit. Use when the user reports a bug, something is broken, a test is failing, a service is down, or says "diagnose X", "what's wrong with X", "why is X failing", "/diagnose".
---

# /diagnose — Strict Diagnostic Protocol

**No code edits until Gate 4 passes.** No "try this and see." No speculative fixes. If you catch yourself reaching for Edit/Write before the user approves a hypothesis, stop.

## Gate 1 — State the Error

Write one sentence: **what is actually broken, and how do we know?**

- Exact error message (copy-paste, not paraphrase)
- Command that triggered it, or symptom observed
- Expected vs actual behavior

If any of the above is missing, ASK the user. Do not guess.

## Gate 2 — Gather Evidence

Pull all three before forming hypotheses:

1. **Logs** — relevant log file, stderr, stack trace, recent entries
2. **Environment** — relevant env vars, service state, versions, ports, locks
3. **Recent changes** — `git log --oneline -20`, `git diff HEAD~1`, recently modified files

Cite the evidence inline. If a source is unavailable, say so explicitly.

## Gate 3 — Three Ranked Hypotheses

List exactly **three** hypotheses, ranked by likelihood. For each:

- **Hypothesis** — one sentence
- **Supporting evidence** — which Gate 2 finding points here
- **Disproving evidence** — what would rule it out
- **Proposed fix** — one or two lines, no code yet

Rank them #1, #2, #3. State your confidence in #1 (low/medium/high).

## Gate 4 — Get Approval

End with: **"Which hypothesis do you want me to act on? I will not edit code until you confirm."**

Then STOP. Wait for the user. Do not proceed to Edit/Write/Bash-that-modifies-state on speculation.

## Hard Rules

- No fixes in Gates 1-3. Read-only tools only (Read, Grep, Glob, Bash for logs/git/status).
- No "let me just try X" — that's a hypothesis, put it in Gate 3.
- If the user pushes for speed, remind them: this protocol exists because skipping it wastes more time than it saves.
- If evidence contradicts all three hypotheses, loop back to Gate 2 — do not invent a fourth to save face.
