---
name: self-healing-claudex
description: >
  Self-healing build pipeline with Planner/Builder + Codex adversarial review.
  Planner writes a test contract, Builder implements until tests pass, Codex
  pressure-tests the implementation with a different reviewer persona each round
  (engineer / security / ops), Builder revises, repeat until Codex agrees or max
  rounds reached. File-based state survives session interrupts. Use when the
  user says "self-healing claudex", "claudex build", "PBJ with codex review",
  "two-vendor build loop", or wants Codex (not just Claude) as a second set of
  eyes on a build. Sibling to /self-healing-pipeline (which uses an all-Claude
  Judge); this one swaps the Judge for real second-vendor adversarial review.
context: fork
---

# self-healing-claudex

You are orchestrating a build-and-review loop where Claude builds, Codex
reviews, and the loop converges when Codex agrees the build is sound (or max
rounds reached).

This skill borrows the Planner/Builder spine from `self-healing-pipeline` and
replaces the Judge with a real adversarial reviewer (`codex exec`). Each Codex
round wears a different persona: round 1 senior engineer, round 2 security and
data-integrity, round 3+ ops and SRE.

> **Read `SPEC.md` (alongside this file) for the full architecture, state file
> schema, lifecycle table, and safety primitives.** Treat SPEC.md as the source
> of truth; this file is the procedure.

## Preconditions

Before starting, verify:

1. **Codex CLI is authed.** Run `codex login status`. Must say "Logged in". If
   not: `source ~/.env.shared && printenv OPENAI_API_KEY | codex login --with-api-key`.
2. **You are in the correct repo root.** State is rooted to `pwd`. Confirm with
   the user before starting if cwd is ambiguous.
3. **No active loop already exists.** `start-loop.sh` will refuse on overlap;
   run `bash ${SKILL_DIR}/scripts/status.sh` first to check.

`SKILL_DIR` resolves to `~/.claude/skills/self-healing-claudex/`. All scripts
live under `${SKILL_DIR}/scripts/`.

## Procedure

### Step 0 — Gather inputs

Ask the user for, or extract from their message:

- **Topic** (required): what is being built. One sentence is fine, or a longer
  spec. Multi-line is OK; `start-loop.sh` collapses it to one line in the state
  file.
- **Target directory** (optional, default `.`): the scope Builder is allowed to
  edit. Codex will review files under this directory.
- **Max rounds** (optional, default 3): how many Codex review rounds before
  giving up.

If the user gave a vague topic ("fix the bug", "make it better"), STOP and ask
for clarification. Codex needs a concrete success criterion or its review will
be generic.

### Step 1 — Start the loop

```bash
bash ${SKILL_DIR}/scripts/start-loop.sh \
  --rounds <N> \
  --target-dir <PATH> \
  "<topic string>"
```

Capture the printed `SHC_REVIEW_ID`. Use it for every subsequent step. The
state file is now at `.self-healing-claudex/<REVIEW_ID>.state` with phase
`planning`.

### Step 2 — Planning phase

You are the Planner. Run this in **three ordered stages**: 2A writes
`spec-claims.md`, 2A.5 mutates USER-VOICE claims into adversarial
derivations, 2B writes `PLAN.md` with the test contract. Do NOT skip
ahead — the single most common failure mode of build-and-review loops
is the Planner designing an implementation and then writing tests that
mirror the design (a tautology that lets safety bugs ship through
Codex review as well, because the tests *look* sound). The split forces
"hostile reader of the spec" before "friendly designer of the code."
See the Postscript appendix at the bottom of this skill for the
worked anti-example (#427 r1/r2 from the the orchestrator pipeline).

#### Stage 2A — Spec Extraction (no implementation thinking yet)

Read the topic and any `spec.md`, `SKILL.md`, `README.md`, or attached
doc. Treat these as the source of truth, not your own intuitions.

DO NOT YET:
- Decide which files to create
- Sketch data structures, function signatures, or rule sets
- Think about how you would implement the work

DO:
- Extract every verifiable claim the spec makes, categorized as:
    `[BEHAVIOR]`    — happy-path behavior
    `[FAILURE]`     — wrong/ambiguous/malformed input handling
    `[SAFETY]`      — invariants that must hold (medical, financial,
                       legal, security, life-impact domains)
    `[USER-VOICE]`  — how real users phrase or shape input ("natural
                       language", "free text", "substring matching")
    `[OUT-OF-SCOPE]`— things the spec says will NOT happen
    `[TONE/UX]`     — communication invariants (calm, directive, etc.)

- Cite each claim with a file:line or section reference so Codex can
  verify it independently.

- **Safety-domain trigger**: if the topic mentions OR clearly implies
  any of {medical, health, child, infant, newborn, triage, diagnosis,
  symptom, drug, dosage, financial, money, payment, transfer, legal,
  contract, compliance, security, auth, password, credential, PII, PHI,
  identity, life-safety, emergency, 911, evacuation}, you MUST in
  addition list these claims even if the spec didn't write them out:
    `[SAFETY]` Unrecognized / malformed / ambiguous input must NOT
              silently route to the lowest-severity outcome. Fail-safe
              direction is toward the human (escalate, ask, refuse),
              not toward "everything's fine."
    `[SAFETY]` Default branches must not assert "nothing matches a
              problem" when the underlying truth is "system did not
              understand the input."
    `[SAFETY]` Each invariant the spec implies but doesn't state must
              be written down explicitly here so it can be tested.

- Write `.self-healing-claudex/<REVIEW_ID>/spec-claims.md` with one row
  per claim:

    ```
    | id   | category    | claim                                        | spec source           |
    |------|-------------|----------------------------------------------|-----------------------|
    | C-01 | BEHAVIOR    | Returns one of {LOW, MEDIUM, HIGH, CRITICAL} | topic line 1          |
    | C-02 | SAFETY      | Unrecognized input must escalate, not        | safety-domain trigger |
    |      |             | default to LOW                               |                       |
    | C-03 | USER-VOICE  | Users type free-text phrases, not enum keys  | topic + user-voice    |
    | ...  | ...         | ...                                          | ...                   |
    ```

After writing, STOP and re-read once:
- What ORIGINAL spec claim did I miss?
- For safety-domain work, is there a "system did not understand the
  input" claim?
- Did I import every [USER-VOICE] claim implied by phrases like
  "natural language" / "free text" / "what users type" — not just
  claims that name input shape explicitly?

Add any ORIGINAL claim you missed before continuing.

Do NOT add derivative mutation claims here. Those are the output of
Stage 2A.5. Pre-empting 2A.5 at this stage produces uneven coverage.

#### Stage 2A-bis — Prior-review-derived claims (retry attempts only)

If the topic spec (or any attached file) contains a section titled
`## Prior-review-derived claims`, this is auto-extracted feedback from
a prior failed build (when `self-healing-claudex` is invoked downstream
of `the orchestrator` self-healing daemon, or from a prior errored round).

For EACH row in that section's markdown table, copy it into
`spec-claims.md` with a fresh C-NN id, preserving the category and the
citation verbatim (the citation already carries the "derived from
prior-review F-NN" trail). These are not your inferred claims — they
have already been triaged by a hostile reviewer. Stage 2A's job for
this section is **mechanical copy, not re-derivation**. After copying,
treat them as first-class spec claims (Stage 2A.5 mutates them if
applicable; Stage 2B writes tests against them). If the appendix is
missing (first attempt), this rule is a no-op.

#### Stage 2A.5 — Adversarial-input synthesis

The named claims in `spec-claims.md` are the *minimum* input surface —
everything the spec explicitly enumerated. Real users produce input
shapes the spec did NOT enumerate but a reviewer will catch. Stage 2A.5
closes that gap proactively by mutating every `[USER-VOICE]` claim into
derived `[SAFETY]` / `[FAILURE]` mutation claims.

For EVERY `[USER-VOICE]` claim, generate mutations across these axes.
Skip an axis only when structurally inapplicable (numeric range has no
apostrophes; file existence has no negation):

1. **Unicode-normalization mutations**: smart apostrophe (U+2019 vs
   ASCII `'`), smart double-quote (U+201C / U+201D), em-dash (U+2014),
   en-dash (U+2013), non-breaking space (U+00A0), combining diacritics,
   full-width punctuation. iOS/Android/macOS/Word auto-correct default
   to these. ASCII-only pattern tables are the #1 silent-fallback
   failure mode in user-typed input.
2. **Negation mutations**: `"not X"` / `"no X"` / `"isn't X"` /
   `"without X"` / `"didn't X"` / `"never X"`. A pattern for the
   *presence* of a thing must NOT match an assertion of its *absence*.
   Naive substring matching is the #1 cry-wolf failure mode.
3. **Word-boundary / substring-collision mutations**: for each token in
   a [USER-VOICE] match pattern, identify at least one real-English
   word that contains that token as a fragment but means something
   else. `"limp"` in `"limpid"`; `"rash"` in `"rashly"`; `"pale"` in
   `"palette"`. These must NOT trigger a positive match.
4. **Register / phrasing-shift mutations**: the spec names one register
   for an input (clinical: `"cyanotic"`, `"tachypnea"`); real users use
   another (lay: `"blueish lips"`, `"breathing fast"`). For each
   canonical token, generate 2-3 lay synonyms or colloquial paraphrases.
5. **Embedded / multi-symptom mutations**: canonical tokens embedded
   in longer sentences, multiple tokens co-occurring. Each token must
   match when embedded; matching must not get confused on co-occurrence.

For each axis where you produce a meaningful mutation, write a new
spec-claims.md row as `[SAFETY]` or `[FAILURE]`, citing both the source
[USER-VOICE] claim id and the mutation axis:

```
| C-23 | SAFETY  | Smart apostrophe (U+2019) in user input must not bypass | derived from C-03;        |
|      |         | pattern matching                                        | Unicode axis              |
| C-24 | SAFETY  | Negation ("not lethargic") must NOT match the asserted- | derived from C-03;        |
|      |         | symptom pattern for "lethargic"                         | negation axis             |
```

**Calibration — do NOT pad**:
- Skip an axis when structurally inapplicable. Quality over count.
- Cap derived mutations at 5 per [USER-VOICE] claim.
- Total mutation count should be 1.5× to 4× the original [USER-VOICE]
  claim count. Below 1.5× under-generation; above 4× padding.

**Non-safety domains**: 2A.5 still runs but the bar is lower; typically
only Unicode and embedded-token axes apply.

After 2A.5, `spec-claims.md` is the FINAL input contract for 2B.

#### Stage 2B — Implementation Design + Test Contract

Only now, with `spec-claims.md` final:

1. Read the target directory to understand the current state.
2. Design the implementation (interfaces, data shapes, key decisions).
3. For EVERY claim in `spec-claims.md`, write one or more executable
   tests that would FAIL if that claim were violated. Each test must:
   - Cite its claim id (`C-NN`) in a comment AND in the test-contract row
   - Use REALISTIC inputs for [USER-VOICE] claims — NOT canonical/fixture
     form. For mutations from 2A.5, the test input MUST be the mutation
     itself, not its canonical equivalent.
   - For [SAFETY], include adversarial/boundary/fail-safe probes
   - For [OUT-OF-SCOPE], include a negative test asserting the system
     does NOT do the out-of-scope thing
   - Never test the implementation back to itself

   **FORBIDDEN ANTI-PATTERNS** (Codex will reject in Step 4):
   - Canonical-form-only tests when spec describes natural input
   - Literal-fixture inputs that also appear verbatim in your
     implementation plan
   - Happy-path-only coverage in a safety-domain spec
   - Tests asserting on implementation internals (private rule_id
     strings, internal symptom sets) rather than user-visible promises
   - Zero coverage for any claim in `spec-claims.md`

4. Write `.self-healing-claudex/<REVIEW_ID>/PLAN.md` with:
   - **Test contract** — table of tests with `claim_id | input | expected | assertion`
   - **Spec-claim coverage** — bullet list mapping each `C-NN` to test(s)
   - **Design notes** — interfaces, data structures, key decisions
   - **Files to be touched** — explicit list. Anything outside is out of scope.
   - **Out of scope** — things considered but skipped this round

CAS to `building`:

```bash
bash -c 'source ${SKILL_DIR}/scripts/state-helpers.sh && \
  shc_phase_transition .self-healing-claudex/<REVIEW_ID>.state planning building'
```

### Step 3 — Building phase

You are the Builder. Read PLAN.md. Implement the code. Run the tests defined
in the test contract.

**On test pass:**
- CAS `building` → `reviewing`
- Proceed to Step 4

**On test fail:**
- Increment `builder_retries_used` in state
- If `builder_retries_used` < `SHC_BUILDER_RETRIES` (default 3): debug, fix,
  re-run tests. Stay in `building` phase.
- If `builder_retries_used` reaches the cap: set `phase=errored`, write a
  short error summary to `.self-healing-claudex/<REVIEW_ID>/builder-error.md`,
  STOP and surface to the user. Do NOT proceed to Codex review.

### Step 4 — Reviewing phase (Codex)

Invoke Codex for the current round:

```bash
bash ${SKILL_DIR}/scripts/run-codex-review.sh \
  <REVIEW_ID> <ROUND> <TARGET_DIR> "<topic>"
```

This blocks for ~30-60s while Codex reads the target directory and writes
findings. On exit:

- Findings file: `.self-healing-claudex/<REVIEW_ID>/findings-round-<ROUND>.md`
  (clean bullets, ~1k tokens)
- Transcript: `.self-healing-claudex/<REVIEW_ID>/codex-stdout-<ROUND>.log`
  (full Codex output, debug only — DO NOT read this; read the bullets)

**Read ONLY the findings file.** Reading the transcript burns context for
zero benefit; the bullets are already a faithful summary.

**Branching on findings content:**

- **Coverage gaps escalate immediately.** Codex's review prompt asks it
  to emit a `## Coverage gaps` section listing uncovered claims, orphan
  tests, or fake/tautological coverage. If `## Coverage gaps` in
  `findings-round-<ROUND>.md` is present and non-empty (any bullet
  other than the literal "None."), this is a Planner failure: the
  test contract was wrong, and Builder retries cannot fix it (the
  contract is immutable post-planning, by the same logic that
  `self-healing-pipeline`'s Judge enforces). Set:
  ```bash
  source ${SKILL_DIR}/scripts/state-helpers.sh
  shc_state_set_field .self-healing-claudex/<REVIEW_ID>.state decision_signal coverage-gap
  shc_state_set_field .self-healing-claudex/<REVIEW_ID>.state phase errored
  ```
  Write a brief explanation to
  `.self-healing-claudex/<REVIEW_ID>/coverage-error.md` listing each
  gap precisely and the kind of test that would close it. STOP. The
  user must nuke `.self-healing-claudex/<REVIEW_ID>/` and re-run the
  skill so Stages 2A/2A.5/2B regenerate from scratch. Builder retries
  cannot heal coverage problems.

- If the file's body is **exactly** "No substantive findings." (and
  `## Coverage gaps` is absent or "None."):
  ```bash
  bash ${SKILL_DIR}/scripts/mark-done.sh <REVIEW_ID>
  ```
  Then CAS `reviewing` → `summarizing`. Proceed to Step 6.

- If `ROUND + 1 > MAX_ROUNDS` and findings remain:
  ```bash
  source ${SKILL_DIR}/scripts/state-helpers.sh
  shc_state_set_field .self-healing-claudex/<REVIEW_ID>.state decision_signal max-reached
  shc_phase_transition .self-healing-claudex/<REVIEW_ID>.state reviewing summarizing
  ```
  Proceed to Step 6.

- Otherwise (findings exist, coverage is sound, rounds remain), CAS
  `reviewing` → `revising`. Proceed to Step 5.

### Step 5 — Revising phase

You are the Builder again. Read `findings-round-<ROUND>.md` (NOT the
transcript). For each finding:

- HIGH: must fix. Block on this.
- MEDIUM: fix unless it expands scope significantly; if you skip, document why
  in the next PLAN.md changelog.
- LOW: fix opportunistically.

**Constraint — test contract is immutable.** `spec-claims.md` and the
test contract in PLAN.md cannot be edited by Builder retries. Codex
findings on test coverage (uncovered claim, orphan test, fake
coverage) are handled in Step 4 by routing to `errored`, NOT by Builder
edits to the tests. Builder may add NEW tests that exercise a finding
Codex raised, but may not delete, weaken, or rewrite tests that
already cite a spec-claim id. If a Codex finding implies the test
contract itself is wrong, escalate via Step 4's coverage-gap path
instead of editing the contract.

Apply implementation fixes. Increment `round` field. Reset
`builder_retries_used` to 0. CAS `revising` → `building`. Loop back to Step 3.

### Step 6 — Summarizing phase

Generate the visible landing message:

```bash
bash ${SKILL_DIR}/scripts/summarize.sh <REVIEW_ID>
```

**Print the entire output of this script to chat.** This is the user-visible
landing message. Without it, the loop ends silently and the user does not see
the result.

After printing, CAS `summarizing` → `done`:

```bash
source ${SKILL_DIR}/scripts/state-helpers.sh
shc_phase_transition .self-healing-claudex/<REVIEW_ID>.state summarizing done
rm -f .self-healing-claudex/<REVIEW_ID>.lock
```

End your turn cleanly.

## Error handling

- **Codex returns non-zero exit:** `run-codex-review.sh` will print the
  transcript path. Read the last 30 lines of the transcript. If it's a
  transient network/auth error, retry once. If it's repeated, set
  `phase=errored`, surface the error to the user, STOP.
- **Findings file missing after Codex returns 0:** Codex did not follow the
  output requirement. This is rare. Set `phase=errored`, point user at the
  transcript, STOP. Do NOT silently retry.
- **State file deleted mid-run:** if `find_active_loop` returns empty after
  you started a loop, log "loop state lost" and surface to user. Do not try
  to reconstruct.
- **Builder retry cap reached:** treat the same as Codex review failure —
  surface, STOP, do not advance to Codex (Codex review of broken code wastes
  tokens).

## Cost notes

- Per-round Codex cost: ~25-40k tokens on top of a ~10k boot tax. A default
  3-round run is ~100k Codex tokens.
- Builder/Planner Claude tokens depend on target size and retry count.
- Single-shot smoke (start + 1 review + summary) is ~30k Codex tokens.

If the user is sensitive to cost, recommend `--rounds 2` for routine work and
reserve `--rounds 3+` for production-critical changes.

## When NOT to use this skill

- Trivial one-liners or pure cosmetic changes — Codex review is overhead.
- Code that has no test contract and resists writing one — use
  `/self-healing-pipeline` (PBJ) which is more forgiving on test scaffolding.
- Hot-path debugging where the user needs an answer in seconds — the boot tax
  alone is ~10s.
- Throwaway prototypes — use direct Builder, no review loop.

## Postscript — Why the Stage 2A / 2A.5 / 2B split exists

This appendix mirrors the worked anti-example from the
`self-healing-pipeline` skill. The #427 build (Nighttime Newborn Triage
Copilot, two rounds r1 + r2)
established the failure modes the three-stage discipline is designed
to close. Read this when you are tempted to write tests "while you're
already thinking about the implementation."

**r1 — implementation-coupling failure (single-stage Planner)**

The old single-stage Planner read the spec, invented a 7-rule decision
system in PLAN.md complete with canonical symptom strings (`"lethargic"`,
`"refusing all feeds"`, etc.), then wrote tests using those same
canonical strings as inputs. Builder implemented the rules exactly as
PLAN.md specified. 12/12 tests green. The external reviewer caught 8 critical safety
bugs the pipeline missed:

- `"baby is really lethargic"` → no match → HOME_CARE (silent
  under-triage; canonical-only matching)
- 2-month-old at 35.0°C (hypothermia = sepsis marker per AAP) →
  HOME_CARE (hypothermia rule missing)
- 4-month-old at 39.5°C → HOME_CARE with the message *"Nothing you've
  described matches an emergency pattern"* (moderate fever band
  missing; reassuring wording is actively wrong when the engine simply
  didn't recognize the input)
- `triage(None, None, None)` → crash; Fahrenheit-as-Celsius →
  miscategorized

Every test input was a literal canonical string the Planner had also
written into the implementation rules — a tautology against the
Planner's own design. **Stage 2A's purpose is to force the Planner
to be a hostile reader of the spec BEFORE it is a friendly designer
of the implementation.**

**r2 — review-driven coverage limit (two-stage Planner without 2A.5)**

After 2A landed, r2 fixed all 5 prior critical findings: hypothermia,
substring matching, moderate fever, input validation, silent
fallback. 45/45 tests green. But The external reviewer rejected r2 with 6 NEW
criticals of a different class:

- **Smart apostrophe (U+2019)**: pattern table was ASCII-only;
  iOS/Android default keyboards type smart quotes
- **Negation handling**: `"not lethargic"` matched the `"lethargic"`
  pattern and triggered ER false alarms
- **Word-boundary collisions**: `"limpid"` triggered the `"limp"`
  symptom; `"rashly"` triggered `"rash"`
- **Register shifts**: 28 realistic parent phrasings (`"stopped
  breathing"`, `"wheezing"`, `"throwing up everything"`, `"twitching"`,
  `"floppy"`, `"blueish skin"`) downgraded via the fail-safe rule
  because none matched the clinical-register pattern set

These inputs were NOT named in r1's review report. The Planner is a
high-fidelity reader of named content (spec + prior review). It is
not — and cannot be — a generator of unnamed adversarial inputs. Both
r1 and r2 had the same root pattern (silent under-triage on
parent-realistic phrasings) but r1's specific instances got fixed
while r2's persisted because nobody had named them. **Stage 2A.5
exists to close this gap proactively** by mechanically mutating every
[USER-VOICE] claim across the 5 axes (Unicode, negation, word-boundary,
register-shift, embedded-symptom). What 2A.5 should have produced for
r2:

```
| C-11 | SAFETY  | Smart apostrophe (U+2019) in symptom strings must not   | derived from C-03;       |
|      |         | bypass pattern matching                                 | Unicode axis             |
| C-12 | SAFETY  | Negation ("not lethargic", "no fever", "isn't            | derived from C-03;       |
|      |         | inconsolable") must NOT match the asserted-symptom      | negation axis            |
|      |         | pattern                                                 |                          |
| C-13 | SAFETY  | Word-fragment collisions ("limpid", "rashly") must not  | derived from C-02;       |
|      |         | trigger positive matches for "limp", "rash"             | word-boundary axis       |
| C-14 | SAFETY  | Lay-register equivalents match same severity tier:      | derived from C-03;       |
|      |         | "stopped breathing"=apnea, "wheezing"=respiratory       | register-shift axis      |
|      |         | distress, "floppy"=lethargy, "blueish skin"=cyanosis    |                          |
| C-15 | SAFETY  | Multiple tokens embedded in one sentence must each      | derived from C-03;       |
|      |         | match independently                                     | embedded-symptom axis    |
```

**Implication for safety-domain builds**: do not expect r1→PASS. The
"named issues fixed in r2" pattern is the *minimum* result of the
two-stage Planner alone — Stage 2A.5 is the structural fix that lets
r2 actually pass instead of just exposing the next named layer.

**Implication for claudex's Codex review**: the `run-codex-review.sh`
prompt asks Codex to read `spec-claims.md` and check that every claim
has a non-tautological test. If coverage is broken (uncovered claim,
orphan test, fake coverage), Codex emits a `## Coverage gaps` section
that Step 4 treats as ESCALATE — Builder retries cannot fix it
because the test contract is immutable post-planning. The user must
re-run the loop so 2A/2A.5/2B regenerate.
