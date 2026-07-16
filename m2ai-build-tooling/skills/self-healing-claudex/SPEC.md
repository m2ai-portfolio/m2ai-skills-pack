# self-healing-claudex — single-page spec

## What it is

A Claude Code skill that drives an autonomous build-and-review loop: Planner writes a test contract, Builder implements until tests pass, Codex pressure-tests the implementation with a different reviewer persona each round, Builder revises, repeat until Codex agrees or max rounds reached. Then a closing summary lands in chat.

Borrows the Planner/Builder/Judge spine from `self-healing-pipeline` (PBJ) and replaces the Judge with a real second-vendor adversarial reviewer (`codex exec`), borrowing Claudex's persona rotation, findings-file extraction, atomic state, CAS phase transitions, and summarizing phase.

## Hard guarantees

- **Fail open in all error paths.** Any unhandled error logs and surfaces a clear "loop errored, see <log>" message rather than trapping the user in a broken state.
- **No code edits outside its own state directory and the implementation files Builder is allowed to touch.**
- **Phase-based concurrency check.** Two loops at once is refused with a clear message.
- **Atomic state writes.** Every mutation goes through `tmp + rename`.
- **Stale loops auto-swept** after 15 minutes (configurable via `SHC_STALE_MINUTES`).

## Lifecycle

```
planning → building → reviewing → revising → building → reviewing → ... → summarizing → done
                                       ↓
                                   (if no findings or max rounds)
                                       ↓
                                  summarizing → done
```

| Phase | Who acts | Skill body does |
|---|---|---|
| `planning` | Planner agent (Claude) | Three-stage discipline: 2A extracts verifiable claims into `spec-claims.md` (hostile reader); 2A.5 mutates [USER-VOICE] claims into adversarial derivations across 5 axes; 2B writes `PLAN.md` with a test contract where every test cites a claim id. See SKILL.md Step 2 for the full procedure. CAS to `building` |
| `building` | Builder agent (Claude) | Implements per PLAN.md, runs tests; on green CAS to `reviewing`; on red, retry up to `SHC_BUILDER_RETRIES` (default 3) before erroring |
| `reviewing` | Codex (`codex exec`) | Adversarial review with persona for current round; reads `spec-claims.md` + `PLAN.md` + target dir; writes `findings-round-N.md` with a mandatory `## Coverage gaps` section + severity bullets; if Coverage gaps non-empty → CAS to `errored`; else if "No substantive findings" → CAS to `summarizing`; else CAS to `revising` |
| `revising` | Builder agent (Claude) | Reads `findings-round-N.md` (NOT the transcript), applies fixes; CAS to `building` for retest; increments round counter |
| `summarizing` | Skill body | Builds rounds table (severity counts per round), elapsed time, files touched; emits visible landing message; CAS to `done` |
| `done` | Terminal | Cleanup runner/lock; exit clean |
| `cancelled` / `errored` | Terminal | No further action; state file kept on disk for audit |

Round overflow: when round + 1 > `max_rounds` and Codex still has findings, set `decision_signal=max-reached`, CAS to `summarizing`, surface a "stopped at max rounds, three options: revise manually, re-run with --rounds N, or accept as known-incomplete."

## State file

`.self-healing-claudex/<review_id>.state` — YAML-ish key/value, one per line. Per-loop file (NOT a single shared file).

| Field | Type | Notes |
|---|---|---|
| `phase` | enum (above) | |
| `topic` | quoted string | user-supplied; multi-line collapsed at write time |
| `round` | int | 1..max_rounds |
| `max_rounds` | int | default 3 (env: `SHC_MAX_ROUNDS`); `--rounds N` overrides |
| `builder_retries_used` | int | reset to 0 on entering `building` for a new round |
| `review_id` | string | `^[0-9]{8}-[0-9]{6}-[0-9a-f]{6}$` |
| `repo_root` | absolute path | written at start; skill fails open if cwd diverges |
| `target_dir` | relative path | scope of allowed Builder edits |
| `started_at` | ISO 8601 UTC | |
| `started_at_epoch` | int | for elapsed calc |
| `last_updated_at` | ISO 8601 UTC | refreshed on every mutation |
| `decision_signal` | `none` \| `no-material-findings` \| `max-reached` \| `coverage-gap` | `coverage-gap` set when Codex emits a non-"None." Coverage gaps section; routes to errored (test contract is immutable post-planning) |

## Sidecar files (per loop)

```
.self-healing-claudex/<review_id>.lock              PID of the orchestrator (liveness debug only)
.self-healing-claudex/<review_id>/spec-claims.md    Planner Stage 2A output: extracted spec claims + 2A.5 mutations + 2A-bis prior-review-derived rows
.self-healing-claudex/<review_id>/PLAN.md           Planner Stage 2B output: test contract (each test cites a claim id) + design + files + scope
.self-healing-claudex/<review_id>/findings-round-N.md   Codex's clean per-round bullet summary (includes a ## Coverage gaps section)
.self-healing-claudex/<review_id>/codex-stdout-N.log    Full Codex transcript (debug; Builder does NOT read this)
.self-healing-claudex/<review_id>/coverage-error.md     Written on coverage-gap escalation; lists each gap precisely so the user can re-run with a corrected spec
.self-healing-claudex/log                                Append-only operational log
```

## Communication channels

| From | To | Channel |
|---|---|---|
| Skill body | Codex | `scripts/run-codex-review.sh` heredoc'd prompt piped to `codex exec --dangerously-bypass-approvals-and-sandbox` |
| Codex | Builder | `findings-round-N.md` (bullet summary, ~1k tokens) — Builder reads ONLY this, never the transcript |
| Skill body | User | Visible landing summary when phase enters `summarizing` |
| Skill body | itself | state file mutations via `state-helpers.sh` (atomic + CAS) |

## Personas (per round)

- **Round 1 — senior engineer.** Design flaws, broken assumptions, ambiguous specs, missed edge cases.
- **Round 2 — security and data-integrity reviewer.** Auth, validation, race conditions, partial-failure recovery, secrets, audit trails, data loss.
- **Round 3+ — ops and SRE reviewer.** Rollback safety, observability, gradual rollout, version skew, on-call ergonomics. Round 4+ "deepens previous angles" rather than going generic.

Persona stanzas live in `scripts/personas.sh` and are prepended to the Codex prompt by `run-codex-review.sh` each round.

## Six safety primitives

1. **ERR trap fail-open** in every shell helper. Catches anything not explicitly handled and surfaces a clear error path rather than partial state.
2. **Atomic state writes.** Every write goes through `tmp + rename` (atomic on the same filesystem).
3. **CAS phase transitions.** `shc_phase_transition` only writes if current phase matches the expected `from`. Prevents two paths racing to advance the same loop.
4. **Lockfile + PID liveness.** Stored PID can be tested with `kill -0` for diagnostics.
5. **Stale loop sweeper.** `find -mmin +15` on every `start-loop.sh` invocation removes abandoned loops.
6. **cwd validation.** State stores `repo_root`; orchestrator fails open if `pwd != repo_root`.

## Environment variables

| Variable | Default |
|---|---|
| `SHC_MAX_ROUNDS` | 3 |
| `SHC_STALE_MINUTES` | 15 |
| `SHC_BUILDER_RETRIES` | 3 |
| `SHC_STATE_DIR` | `.self-healing-claudex` |
| `SHC_CODEX_MODEL` | unset (uses Codex default) |

## Cost expectations

- Codex `exec` boot tax: ~10k tokens per invocation (measured 2026-05-06)
- Per-round review (boot + adversarial reasoning): ~25-40k Codex tokens
- Default 3-round loop: ~75-120k Codex tokens plus Builder/Planner Claude tokens
- Single-shot smoke test (no loop): ~10k tokens

## File tree

```
self-healing-claudex/
├── SKILL.md                          # Orchestration body
├── SPEC.md                           # This file
├── scripts/
│   ├── state-helpers.sh              # Atomic, CAS, sweeper, findings counts
│   ├── personas.sh                   # Round 1/2/3+ personas
│   ├── start-loop.sh                 # Initialize state file, sweep stale, refuse on overlap
│   ├── run-codex-review.sh           # Codex wrapper with quoted heredoc
│   ├── mark-done.sh                  # decision_signal=no-material-findings
│   ├── summarize.sh                  # Build rounds table + elapsed
│   ├── status.sh                     # Read-only inspector
│   ├── doctor.sh                     # Health check
│   └── cancel-loop.sh                # Force phase=cancelled
└── tests/
    └── smoke.sh                      # End-to-end with real Codex (costs ~30k tokens)
```
