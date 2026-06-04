---
name: self-healing-pipeline
description: >
  Self-healing build pipeline with Planner/Builder/Judge loop. Planner writes test
  contracts, Builder implements and runs tests, Judge evaluates and auto-retries up to
  3 times before escalating to the user. File-based state tracking survives session
  interrupts. Use when the user says "self-healing pipeline", "healing build",
  "auto-fix pipeline", "build with retries", or wants a resilient implementation
  workflow that self-corrects on test failures.
user_invocable: true
context: fork
---

# Self-Healing Pipeline

Three-agent pipeline (Planner -> Builder -> Judge) that auto-corrects test failures
up to 3 times before escalating. File-based state persists across session interrupts.

## Trigger

User says:
- "self-healing pipeline" / "healing pipeline"
- "build with auto-fix" / "auto-fix pipeline"
- "build and self-heal"
- Or invokes `/self-healing-pipeline <task description>`

## Inputs

**Required**: A task description -- what to build, fix, or implement.
**Optional**: Target directory (defaults to current working directory).

Parse from user message. If the task is ambiguous, ask ONE clarifying question.

## State Directory

All state lives in `.self-healing-pipeline/` inside the target project directory.
This directory is gitignored. Structure:

```
.self-healing-pipeline/
  state.json           # Current pipeline state
  spec-claims.md       # Planner's spec-claim extraction (Stage 1A — written BEFORE plan.md)
  plan.md              # Planner's implementation plan (Stage 1B)
  test-contract.md     # Planner's test contract (Stage 1B — every test cites a spec-claims.md entry)
  builder-log-N.md     # Builder's output for attempt N (1-3)
  judge-brief-N.md     # Judge's diagnostic for attempt N (1-3)
  retry-report.md      # Final summary (generated on completion or escalation)
```

### state.json Schema

```json
{
  "task": "string -- the original task description",
  "target_dir": "string -- absolute path to project directory",
  "status": "planning | building | judging | passed | escalated",
  "attempt": 1,
  "max_attempts": 3,
  "started_at": "ISO timestamp",
  "updated_at": "ISO timestamp",
  "planner_done": false,
  "builder_done": false,
  "judge_verdict": null,
  "escalation_reason": null,
  "feature_branch": "string or null -- e.g. feature/self-heal-add-user-auth",
  "red_commit_sha": "string or null -- SHA of the failing-tests commit",
  "history": [
    {
      "attempt": 1,
      "builder_result": "pass | fail",
      "judge_verdict": "pass | retry | escalate",
      "failure_summary": "string or null",
      "timestamp": "ISO timestamp"
    }
  ]
}
```

## Step 0a: Heartbeat callback (optional, daemon-driven)

Before any phase transition in this pipeline, check for a file named
`.heartbeat-callback` at the root of `target_dir`. If it exists, read its
first line as an absolute path and touch that path via Bash. This is how
the the build pipeline self-healing daemon keeps its liveness signal fresh during
long Builder runs -- without this callback, the daemon's adapter sees
heartbeat age past 120s while the pipeline is healthily working and
flags the daemon as stale.

Call this "touch the callback" operation from these points in the loop:
- Once at the start of Step 1 (before spawning Planner)
- Once at the start of Step 2 for each attempt N (before spawning Builder)
- Once at the start of Step 3 for each attempt N (before spawning Judge)
- Once when reaching a terminal state in Step 4 (before writing retry-report)

The callback is opt-in. If `.heartbeat-callback` is missing or unreadable,
skip the touch and continue -- standalone invocations of
`/self-healing-pipeline` outside the daemon context do not need it and
should not fail for its absence.

Example callback read + touch (run via Bash with absolute paths):

```bash
callback=$(head -n1 {target_dir}/.heartbeat-callback 2>/dev/null)
if [ -n "$callback" ] && [ -w "$(dirname "$callback")" ]; then touch "$callback"; fi
```

The daemon writes this file when it claims a job, containing the absolute
path to `heartbeat-worker-1.txt` in its queue root. Do not write back to
the callback file from this pipeline.

## Step 0: Initialize State

Before anything else, check if `.self-healing-pipeline/state.json` exists in the
target directory:

- **If it exists and status is not "passed" or "escalated"**: Resume from where it
  left off. Tell the user: "Resuming self-healing pipeline from attempt {N}, status: {status}."
  Skip to the appropriate step.
- **If it doesn't exist**: Create the directory and initialize `state.json` with
  status "planning", attempt 1.

```bash
mkdir -p .self-healing-pipeline
```

Add `.self-healing-pipeline/` to `.gitignore` if not already present.

Write initial `state.json`:
```json
{
  "task": "<parsed task>",
  "target_dir": "<absolute path>",
  "status": "planning",
  "attempt": 1,
  "max_attempts": 3,
  "started_at": "<now ISO>",
  "updated_at": "<now ISO>",
  "planner_done": false,
  "builder_done": false,
  "judge_verdict": null,
  "escalation_reason": null,
  "history": []
}
```

## Step 1: Planner Agent

First, touch the heartbeat callback (see Step 0a) if `.heartbeat-callback`
exists in `target_dir`. Then spawn a Planner agent (via Agent tool) with
this prompt template.

The Planner runs in two ordered stages: **1A Spec Extraction** (produces
`spec-claims.md`) MUST complete before **1B Implementation Design + Test
Contract** begins. The single most common failure mode of this pipeline is
the Planner designing an implementation and then writing tests against that
implementation — a tautology that lets safety-critical bugs ship green. The
two-stage split exists to break that loop: extract spec claims BEFORE
thinking about implementation, then prove the implementation against the
claims rather than against itself. See the "#427 worked anti-example"
appendix at the bottom of this skill for what happens when this discipline
is skipped.

```
You are the PLANNER for a self-healing pipeline. Your job has two stages.
Do NOT skip ahead — Stage 1A must complete and be written to disk before
Stage 1B begins.

----- STAGE 1A: SPEC EXTRACTION (no implementation thinking yet) -----

Read the spec / task description for: "{task_description}"
Also read any spec.md, SKILL.md, README.md, or attached doc that defines the
contract this work is supposed to satisfy. Treat these as the source of
truth, not your own intuitions about what the system should do.

DO NOT YET:
- Decide which files to create
- Sketch any data structures, function signatures, or rule sets
- Think about how you would implement the work

DO:
- Extract every verifiable claim the spec makes. A claim is anything the
  spec promises about runtime behavior, failure handling, user experience,
  inputs, outputs, safety, scope, or out-of-scope refusals.
- Categorize each claim into one of:
    [BEHAVIOR]    — what the system does in the normal happy path
    [FAILURE]     — what the system does when something goes wrong, is
                    ambiguous, missing, malformed, or unrecognized
    [SAFETY]      — invariants that must hold for the system to be safe
                    (medical, financial, legal, security, life-impact
                    domains have these even when not labeled)
    [USER-VOICE]  — claims about how real users will phrase / shape input
                    (e.g. "substring matching", "natural language",
                    "case-insensitive", "free text", "parents at 2 AM")
    [OUT-OF-SCOPE]— things the spec explicitly says the system will not do
    [TONE / UX]   — claims about how the system communicates (calm,
                    directive, etc.)

- Cite the source for every claim with a file:line or section reference so
  the Judge can verify it independently.

- **Prior-review-derived claims (retry attempts only)**: If the spec
  contains a section titled `## Prior-review-derived claims`, this is
  auto-extracted feedback from a prior failed build's reviewer (the review agent),
  produced by the the build pipeline orchestrator at retry time. Treat its table
  as pre-populated claim rows: for EACH row, copy it into spec-claims.md
  with a fresh `C-NN` id, preserving the category and citation verbatim
  (the citation already carries the `derived from prior-review F-NN`
  trail). These are not your inferred claims — they have already been
  triaged by a hostile reviewer. Stage 1A's job for this section is
  mechanical copy, not re-derivation. After copying, treat them as
  first-class spec claims for the rest of the Planner stages (so they
  get USER-VOICE-style mutations in Stage 1A.5 if applicable, and tests
  in Stage 1B). If the appendix is missing (first attempt), this rule
  is a no-op.

- Apply the SAFETY-DOMAIN trigger: if the spec mentions OR clearly implies
  any of {medical, health, child, infant, newborn, triage, diagnosis,
  symptom, drug, dosage, financial, money, payment, transfer, legal,
  contract, compliance, security, auth, password, credential, PII, PHI,
  identity, life-safety, emergency, 911, evacuation}, you MUST in addition
  list these claims even if the spec didn't write them out:
    [SAFETY] Unrecognized / malformed / ambiguous input must NOT silently
             route to the lowest-severity outcome. Fail-safe direction is
             toward the human (escalate, ask, refuse), not toward
             "everything's fine."
    [SAFETY] Default branches must not assert "nothing matches a problem"
             when the underlying truth is "the system didn't understand
             the input."
    [SAFETY] Each invariant the spec implies but doesn't state must be
             written down explicitly here so it can be tested.

- Write `{target_dir}/.self-healing-pipeline/spec-claims.md` with one row
  per claim:

    ```
    | id   | category    | claim                                        | spec source           |
    |------|-------------|----------------------------------------------|-----------------------|
    | C-01 | BEHAVIOR    | Symptoms match by case-insensitive substring | SKILL.md line 59      |
    | C-02 | SAFETY      | Unrecognized symptoms must escalate, not     | inferred from         |
    |      |             | default to home-care                         | safety-domain trigger |
    | C-03 | USER-VOICE  | Parents type free-text phrases like "really  | spec.md line 5;       |
    |      |             | lethargic, lips look blue"                   | user-voice trigger    |
    | ...  | ...         | ...                                          | ...                   |
    ```

After writing `spec-claims.md`, STOP and re-read it once. Ask yourself:
  - If I were a hostile reviewer, what ORIGINAL spec claim did I miss?
  - For safety-domain work, did I write at least one [SAFETY] claim
    covering "input the system did not understand"?
  - Did I import every [USER-VOICE] claim implied by phrases like
    "natural language", "free text", "what parents type", "exhausted
    user at 2 AM" — not just claims that name input shape explicitly?

Add any ORIGINAL claim you missed before continuing.

Do NOT add derivative mutation claims here (smart-apostrophe variants,
negations, word-boundary collisions, register shifts). Those are the
output of Stage 1A.5 below. Pre-empting 1A.5's mechanical discipline at
this stage produces uneven coverage.

----- STAGE 1A.5: ADVERSARIAL-INPUT SYNTHESIS -----

You now have a list of named claims. The named claims are the *minimum*
input surface — they are everything the spec explicitly enumerated. Real
users will produce input shapes the spec did NOT enumerate but a reviewer
will catch. Stage 1A.5 closes that gap proactively by mutating every
[USER-VOICE] claim into derived [SAFETY] / [FAILURE] mutation claims.

The single most common failure of a passed-then-rejected build under
this skill (as of 2026-05-12) is: every named input was tested correctly,
but the external reviewer caught a class of input the spec never named.
The #427 r2 build is the worked anti-example — see the Appendix
postscript at the bottom of this skill.

For EVERY [USER-VOICE] claim, generate mutations across these axes. Skip
an axis only if it is structurally inapplicable to the claim's input type
(numeric range has no apostrophes; file existence has no negation).

1. **Unicode-normalization mutations**: smart apostrophe (U+2019 vs ASCII
   `'`), smart double-quote (U+201C / U+201D vs `"`), em-dash (U+2014 vs
   `--`), en-dash (U+2013 vs `-`), non-breaking space (U+00A0 vs space),
   combining diacritics, full-width punctuation. iOS, Android, macOS, and
   Word auto-correct default to these. ASCII-only pattern tables are the
   #1 silent-fallback failure mode in user-typed input.

2. **Negation mutations**: `"not X"` / `"no X"` / `"isn't X"` / `"without X"`
   / `"didn't X"` / `"never X"`. A pattern for the *presence* of a symptom,
   state, or value must NOT match an assertion of its *absence*. Naive
   substring matching is the #1 cry-wolf failure mode.

3. **Word-boundary / substring-collision mutations**: for each token in a
   [USER-VOICE] match pattern, identify at least one real-English word
   that contains that token as a fragment but means something else.
   Examples: `"limp"` in `"limpid"`; `"rash"` in `"rashly"`; `"pale"` in
   `"palette"`; `"pain"` in `"painting"`; `"cold"` in `"coldly"`. These
   must NOT trigger a positive match.

4. **Register / phrasing-shift mutations**: the spec usually names one
   register for an input (clinical: `"cyanotic"`, `"tachypnea"`,
   `"lethargic"`, `"emesis"`). Real users use another (lay: `"blueish
   lips"`, `"breathing fast"`, `"won't wake up"`, `"throwing up"`). For
   each clinical or canonical [USER-VOICE] token, generate 2-3 lay
   synonyms or colloquial paraphrases drawn from the realistic user voice.

5. **Embedded / multi-symptom mutations**: spec [USER-VOICE] examples are
   usually single tokens or fixture phrases. Real inputs are sentences
   that embed multiple tokens (`"she's just not herself, kinda floppy,
   hasn't peed today"`). Each token must match when embedded in a longer
   sentence; the match must not get confused when multiple tokens co-occur.

For each axis where you produce a meaningful mutation, write a new
spec-claims.md row as [SAFETY] or [FAILURE]. Each derived row must cite
both the source [USER-VOICE] claim id and the mutation axis:

```
| C-23 | SAFETY  | Smart apostrophe (U+2019) in user input must not bypass | derived from C-03;        |
|      |         | pattern matching                                        | Unicode axis              |
| C-24 | SAFETY  | Negation ("not lethargic") must NOT match the asserted- | derived from C-03;        |
|      |         | symptom pattern for "lethargic"                         | negation axis             |
| C-25 | SAFETY  | Word-fragment collisions ("limpid", "rashly") must not  | derived from C-02;        |
|      |         | trigger positive symptom matches                        | word-boundary axis        |
| C-26 | SAFETY  | Lay-register equivalents ("blueish lips", "won't wake   | derived from C-03;        |
|      |         | up", "throwing up everything") must match the same      | register-shift axis       |
|      |         | severity tier as clinical-register canonical tokens     |                           |
| C-27 | SAFETY  | Canonical tokens embedded in longer sentences ("she's   | derived from C-03;        |
|      |         | floppy and won't take feeds") must still match          | embedded-symptom axis     |
```

**Calibration — do NOT pad**:
- Skip an axis when it is structurally inapplicable. Quality over count.
- Cap derived mutations at 5 per [USER-VOICE] claim. If you find yourself
  generating more, you are padding. Mutation count is a means, not an end.
- Aim for a total mutation count between 1.5× and 4× the original
  [USER-VOICE] claim count. Below 1.5× signals under-generation; above
  4× signals padding.

**Non-safety domains**: Stage 1A.5 still runs but the bar is lower. If
the work is e.g. a Markdown formatter, only the Unicode and embedded-token
axes typically apply. Skip the rest rather than fabricating mutations
that don't probe real failure surface.

After Stage 1A.5 completes, its [USER-VOICE]-derived mutation rows are
frozen — do not add further mutations (that counts as padding). Stage 1A.6
below may still append `first-pass-safety` rows when the SAFETY-DOMAIN
trigger fired; `spec-claims.md` becomes the FINAL input contract for
Stage 1B only after Stage 1A.6 completes (or immediately, if the
SAFETY-DOMAIN trigger did not fire and 1A.6 is a no-op).

----- STAGE 1A.6: FIRST-PASS SAFETY CONTRACT -----

This stage runs ONLY when the SAFETY-DOMAIN trigger (Stage 1A, ~line 216)
fired. On a first attempt there is no the review agent `## Prior-review-derived
claims` appendix to copy from — yet the most damaging safety gaps (the
#436 elder-care incident: negation acked as "did not happen", substring
false-positives, lost audit writes, silent redaction, fsync parity) are
predictable from the spec's *shape* alone. Stage 1A.6 emits those rows
proactively, BEFORE the contract freezes, so each inherits Stage 1B's
per-claim test obligation and the Judge coverage gate with ZERO Builder
or Judge changes.

Walk the 11-item RISK-KEYED SAFETY CHECKLIST below. For each item whose
**risk-signal predicate** matches the spec, emit one SAFETY (or FAILURE)
row into `spec-claims.md` with a fresh `C-NN` id. Each item names a the review agent
category in brackets; that category goes in the row's `category` cell as
the the review agent-aligned tag.

ANTI-DRIFT: every bracketed category in the checklist MUST be one of the
the review agent category enum values — {input_normalization, negation_handling,
word_boundary, register_shift, log_resilience, error_handling,
narrative_drift, privacy, security, correctness, concurrency}. If you
extend the checklist, the new item's category must come from this enum,
or the row is invalid.

**Row vocabulary (mirror `build.py:_record_build_session` EXACTLY).**
For an input-driven row (the predicate is about an *input class / shape*),
use:
    `Input class "{input_shape}" must {expected}; observed: {observed}`
For a non-input row (durability, redaction, exit-code, data-path), use:
    `{title}: must {expected}`
where `{observed}` for a first-pass row is the predicted failure if the
invariant is omitted (e.g. `observed: negated input acked as occurred`).

**Provenance.** The `spec source` cell MUST carry the tag
`first-pass-safety` (e.g. `first-pass-safety; checklist #3 [#436 F-01]`)
so downstream tooling can distinguish proactively-seeded rows from
[USER-VOICE]-derived mutation rows.

**Dedupe.** Before emitting a row, skip it if a Prior-review-derived row
(Stage 1A) already covers the same key = (the review agent category +
normalized `input_shape`). Normalize `input_shape` by lower-casing and
collapsing whitespace. Prior-review rows win — they are hostile-reviewer
triaged; the first-pass row is the proactive fallback.

THE 11-ITEM RISK-KEYED SAFETY CHECKLIST (each maps to a #436 critical):

1. **[privacy/log_resilience]** predicate: spec persists free-text / PII /
   incident logs. row: `.gitignore covers data dir + *.jsonl, no populated
   PII artifact tracked at publish` [#436 #3]
2. **[privacy]** predicate: per-user data via a CLI default path. row:
   `data defaults to $XDG_DATA_HOME/~/.local/share/<app>, never install
   dir; no cross-user comingling` [#436 #4]
3. **[negation_handling]** predicate: spec classifies free-text
   intent/negation AND emits ack text. row: `negated input MUST NOT be
   acked as "did not happen"; negation token must scope trigger; canonical
   affirmative ("there was a <incident>") classifies positive; README
   canonical phrasing round-trips matched=True` [#436 F-01]
4. **[word_boundary]** predicate: risk/severity tier from keyword matching.
   row: `use \bword\b not substring; negative-control set returns LOW/none,
   positive-control HIGH; all detectors share one boundary convention`
   [#436 F-02]
5. **[log_resilience]** predicate: spec makes a durability / audit promise.
   row: `os.fsync after flush + write-then-read verification; silent-drop/
   audit path has SAME durability contract as primary record` [#436 C4]
6. **[error_handling]** predicate: a failure would lose a safety-promised
   audit record. row: `audit/silent-drop writes wrapped in explicit error
   handling; on failure surface DEGRADED ack + non-success return, never
   uncaught traceback, never swallowed` [#436 C1]
7. **[error_handling]** predicate: spec parses its own append-only log /
   external file on a safety path. row: `catch OSError,ValueError/
   JSONDecodeError,UnicodeError,IndexError; corrupt-line tolerance:
   skip+count, return valid rows` [#436 C2/H1]
8. **[error_handling]** predicate: spec surfaces crisis / safety resources.
   row: `resource surfacing last to fail: try/except with hard-coded
   minimum (988/911) fallback` [#436 H3]
9. **[input_normalization]** predicate: spec normalizes free text before
   multiple detectors. row: `single shared normalization helper; Unicode
   apostrophe/quote/NBSP variants yield SAME detection across modules`
   [#436 H4]
10. **[narrative_drift/correctness]** predicate: spec redacts / sanitizes
    output vs a blocklist. row: `log every redaction (phrase+callsite),
    word-boundary not substring, case-insensitive, defense-in-depth; no
    corruption of adjacent legit substrings` [#436 C3]
11. **[correctness]** predicate: spec is invoked by an automation harness
    consuming exit code / stdout. row: `non-zero exit on empty input/
    unhandled exception; structured JSON error envelope; success exit
    implies safety action completed` [#436 H2/M1/M5]

Example rows (input-driven row 3, non-input row 5):

```
| C-30 | negation_handling | Input class "negated incident report" must not be acked as "did not happen"; negation token must scope trigger; canonical affirmative classifies positive; README canonical phrasing round-trips matched=True; observed: negated input acked as occurred | first-pass-safety; checklist #3 [#436 F-01] |
| C-31 | log_resilience    | Durability/audit promise: must os.fsync after flush + write-then-read verification; silent-drop/audit path has SAME durability contract as primary record | first-pass-safety; checklist #5 [#436 C4] |
```

After emitting the first-pass rows, `spec-claims.md` is the FINAL input
contract for Stage 1B. Do not add further rows unless you discover a
missed *original* claim.

----- STAGE 1B: IMPLEMENTATION DESIGN + TEST CONTRACT -----

Only now, with `spec-claims.md` written and saved:

1. Read the codebase in {target_dir} to understand the current state.

2. Design the implementation approach:
   - Identify which files need to change
   - Sketch the structure, data shapes, and key decisions
   - Note risks and edge cases

3. For EVERY claim in `spec-claims.md`, write one or more executable
   tests that would FAIL if that claim were violated. Tests must:
   - Cite their claim id (C-01, C-02, ...) in a comment on the test
     function AND in the test-contract.md row for that test
   - Use realistic inputs for [USER-VOICE] claims — NOT just the
     canonical / fixture form. If the spec says parents type free-text,
     the test must include free-text variants ("really lethargic",
     "lips look kinda blue"), not just the canonical `"lethargic"`
   - For [SAFETY] claims, include adversarial / boundary / fail-safe
     probes (unknown input, malformed input, NaN, empty, None)
   - For [OUT-OF-SCOPE] claims, include a negative test asserting the
     system does NOT do the out-of-scope thing
   - Never test the implementation back to itself — if the test's
     expected output came from "what I'm about to code," rewrite it
     against the spec text instead

   FORBIDDEN ANTI-PATTERNS (you will be rejected for these):
   - Tests that only exercise canonical-form inputs when the spec
     describes natural/realistic user input
   - Tests where every input is a literal hard-coded enum/string that
     also appears verbatim in your implementation plan
   - "Happy path only" coverage in a safety-domain spec
   - Tests that assert on the implementation's INTERNAL structure
     (rule_id strings, internal symptom sets, normalization sentinels)
     rather than on the spec's USER-VISIBLE promises
   - Test contract that has zero coverage for any claim in
     spec-claims.md
   - Negative-existence tests (scanning source files for forbidden
     patterns) that include the test file itself in scope. The test
     file's own list of forbidden strings will appear in its own
     source and the scan will match itself, making the test
     mechanically unpassable. ALWAYS exclude the test file's path
     from the scan scope, e.g.,
     `[p for p in Path('.').rglob('*.py') if p.resolve() != Path(__file__).resolve()]`,
     or skip when `p.parent.name in {'tests', 'test', '__tests__'}`
     and the file IS the scanning test.

4. Write `{target_dir}/.self-healing-pipeline/plan.md` with:
   - Summary of changes needed
   - Files to create/modify (with paths)
   - Implementation steps (numbered, concrete)
   - Risk areas and edge cases
   - A "Spec-claim coverage" section: bullet list mapping each
     spec-claims.md id (C-01, C-02, ...) to the test(s) that exercise it

5. Write `{target_dir}/.self-healing-pipeline/test-contract.md` with:
   - Test file paths and names (must match the real test files you commit)
   - For each test: claim id covered, input, expected output, assertion
   - Pass criteria: "All N tests pass" AND "every spec-claims.md row
     has >=1 test citing it"
   - Any setup/teardown requirements

6. Write the actual test files into the project's test directory.
   These MUST be executable code, not pseudocode. Each test function
   must carry a docstring or comment naming its claim id ("Covers C-02:
   unrecognized symptoms escalate").

7. Run the test suite and confirm the new tests FAIL (red). Capture the
   failure output in plan.md under a "Red confirmation" section. If any
   new test accidentally passes, the test is wrong — fix it before
   handoff.

8. Create a feature branch and commit the red tests:
     git checkout -b feature/self-heal-{short-task-slug}
     git add <test files> .self-healing-pipeline/spec-claims.md \
             .self-healing-pipeline/plan.md \
             .self-healing-pipeline/test-contract.md
     git commit -m "test: add failing tests for {task} [red]"
   Record the branch name and commit SHA in state.json under new fields
   `feature_branch` and `red_commit_sha`.

Do NOT implement anything. Plan, write tests, and commit them red only.
```

After Planner completes:
- Verify `spec-claims.md`, `plan.md` and `test-contract.md` exist and are non-empty
- Verify `spec-claims.md` has at least one row in each of BEHAVIOR, FAILURE
  categories. If the safety-domain trigger fired, verify at least one
  [SAFETY] row exists.
- Verify Stage 1A.5 ran: if `spec-claims.md` contains any [USER-VOICE]
  row, verify at least 1.5× as many derived [SAFETY] / [FAILURE] rows
  exist citing a [USER-VOICE] source ("derived from C-NN"). Zero derived
  rows means Stage 1A.5 was skipped — re-run the Planner with the message
  "Stage 1A.5 was not executed; produce adversarial-input mutations for
  every [USER-VOICE] claim before Stage 1B" appended to the prompt.
  When computing this 1.5×–4× mutation ratio, EXCLUDE rows whose
  `spec source` carries the `first-pass-safety` provenance tag — those are
  Stage 1A.6 proactively-seeded rows, not [USER-VOICE]-derived mutations,
  and counting them would inflate the ratio and mask under-generation.
- Verify Stage 1A.6 ran: if the SAFETY-DOMAIN trigger fired, `spec-claims.md`
  must contain at least one row tagged `first-pass-safety` for EACH
  checklist item whose risk-signal predicate matches the spec (per the
  Stage 1A.6 11-item checklist). If any applicable category has no
  `first-pass-safety` row, re-run the Planner with the message
  "Stage 1A.6 was not executed; emit a first-pass-safety SAFETY row for
  every applicable checklist predicate before Stage 1B" appended to the
  prompt (mirrors the Stage 1A.5 re-run above).
- Verify every claim id in `spec-claims.md` is referenced at least once in
  `test-contract.md`. If not, the Planner failed — re-run it with the gap
  appended to the prompt.
- Update `state.json`: set `planner_done: true`, `status: "building"`
- Show the user a brief summary of the spec claims, plan, and test contract
- Ask: "Plan looks good? Say 'go' to start building, or give feedback."

If user provides feedback, re-run Planner with the feedback appended.

## Step 2: Builder Agent (Attempt N)

First, touch the heartbeat callback (see Step 0a) if `.heartbeat-callback`
exists in `target_dir`. Then spawn a Builder agent with this prompt
template:

```
You are the BUILDER for a self-healing pipeline, attempt {N} of {max_attempts}.

Your task: "{task_description}"

Read these files first:
- {target_dir}/.self-healing-pipeline/plan.md (implementation plan)
- {target_dir}/.self-healing-pipeline/test-contract.md (test contract)
{if N > 1}
- {target_dir}/.self-healing-pipeline/judge-brief-{N-1}.md (what failed last time and why)
{endif}

Instructions:
1. You are on feature branch `{feature_branch}`. The failing tests are already
   committed at SHA `{red_commit_sha}`. Do NOT modify, delete, or weaken those
   tests -- they are the immutable acceptance criteria. `git diff {red_commit_sha}`
   must show only implementation changes, never test changes.
2. Implement the plan. Create/modify source files as specified.
3. Run the tests. Capture full output.
4. Write your results to {target_dir}/.self-healing-pipeline/builder-log-{N}.md:
   - Files created/modified (with paths)
   - Test commands run
   - Full test output (stdout + stderr)
   - Your assessment: PASS (all contract tests green) or FAIL (with specifics)

{if N > 1}
CRITICAL: This is retry attempt {N}. The previous attempt failed.
Read the judge's diagnostic brief carefully. Focus your fixes ONLY on what the
Judge identified as broken. Do not refactor unrelated code. Do not change the
test contract. Fix the specific failures.
{endif}

Output a structured checklist of what you did so the Judge can verify point-by-point.
```

After Builder completes:
- Verify `builder-log-{N}.md` exists
- Update `state.json`: set `builder_done: true`, `status: "judging"`

## Step 3: Judge Agent (Attempt N)

**Must run within 60 seconds of Builder completion** (per CLAUDE.md agent team rules).

First, touch the heartbeat callback (see Step 0a) if `.heartbeat-callback`
exists in `target_dir`. Then spawn a Judge agent with this prompt template:

```
You are the JUDGE for a self-healing pipeline, attempt {N} of {max_attempts}.

Read these files:
- {target_dir}/.self-healing-pipeline/spec-claims.md (the extracted spec claims — the truth the Planner promised to test against)
- {target_dir}/.self-healing-pipeline/test-contract.md (the pass/fail criteria; each row must cite a spec-claims.md id)
- {target_dir}/.self-healing-pipeline/builder-log-{N}.md (what Builder did and test output)
- The actual test files and source files Builder created/modified

Your job:
1. Verify the Builder's checklist point-by-point against the test contract.
2. Run the tests yourself independently. Do not trust Builder's reported output.
3. Compare actual test results against the test contract's pass criteria.
4. Run `git diff {red_commit_sha} -- <test files>`. If this diff is non-empty,
   Builder modified the committed tests -- this is an automatic ESCALATE. The
   red commit is immutable and the tests in it are the acceptance criteria.
5. Spec-claim coverage check (CRITICAL):
   a. For every row in `spec-claims.md`, confirm `test-contract.md` cites
      that claim id at least once. List uncovered claim ids if any.
   b. For every test in `test-contract.md`, confirm it cites a claim id
      that actually exists in `spec-claims.md`. List orphan tests if any.
   c. For each [SAFETY] and [FAILURE] claim, sanity-check the cited test:
      does the test input actually probe the failure mode the claim
      describes, or is it the canonical/happy-path form? If a [USER-VOICE]
      claim is cited only by tests that use literal canonical strings, the
      coverage is fake — flag it.
   d. The Planner is allowed to declare a claim "out of test scope" only
      if `spec-claims.md` explicitly marks the row as [OUT-OF-SCOPE] —
      anything else uncovered is a Planner failure.

Deliver ONE of three verdicts:

**PASS** -- All four must hold:
  - Tests pass independently (your own run, all green)
  - No test-file diff against `red_commit_sha`
  - Every spec-claims.md row is covered by >=1 test that genuinely probes
    the claim (no fake/tautological coverage detected in step 5c)
  - Every test cites a real spec-claims.md id

  Write to {target_dir}/.self-healing-pipeline/judge-brief-{N}.md:
  - Verdict: PASS
  - Evidence: test output showing all green
  - Checklist verification results
  - Spec-claim coverage table (claim id -> test name)

**RETRY** -- Tests fail but the failures are fixable, AND coverage is
sound (no uncovered claims, no orphan tests, no fake coverage), AND
attempt < {max_attempts}. Builder retries can only fix implementation
behavior — they cannot add tests (red commit is immutable) or rewrite
the test contract.

  Write to {target_dir}/.self-healing-pipeline/judge-brief-{N}.md:
  - Verdict: RETRY
  - What specifically failed (test names, error messages, line numbers)
  - Root cause analysis for each failure
  - Concrete fix instructions for Builder (not vague — specific files,
    lines, changes)
  - What NOT to change (prevent scope creep on retries)

**ESCALATE** -- Any of:
  - This is attempt {max_attempts} and tests still fail
  - Spec-claim coverage is broken (uncovered claims, orphan tests, or
    fake/tautological coverage detected in step 5c). Coverage problems
    can only be fixed by re-running Stage 1A/1B from scratch — Builder
    retries cannot heal them because the red commit and test contract
    are immutable after planning.
  - Test files diff against `red_commit_sha`
  - Failures require human judgment (ambiguous requirement, architectural
    issue, spec-claims.md itself looks wrong)

  Write to {target_dir}/.self-healing-pipeline/judge-brief-{N}.md:
  - Verdict: ESCALATE
  - What works and what doesn't
  - For coverage problems: list each gap precisely (uncovered claim id,
    orphan test name, or fake-coverage test+claim pair) and the kind of
    test that would close it. The human can then choose to nuke the
    `.self-healing-pipeline/` directory and re-run the skill, which
    re-runs the Planner from a clean slate.
  - Why auto-fix is insufficient
  - Recommended human actions
```

After Judge completes:
- Read `judge-brief-{N}.md` for the verdict
- Update `state.json` history array with this attempt's results
- Branch on verdict:

### Verdict: PASS
- Update `state.json`: `status: "passed"`, `judge_verdict: "pass"`
- Run the post-PASS dark code audit (Step 3.5) -- advisory only, does not block
- Generate retry report (Step 4)
- Tell user: "Pipeline complete. All tests pass on attempt {N}."

### Verdict: RETRY
- Update `state.json`: increment `attempt`, set `status: "building"`, reset `builder_done: false`
- Tell user: "Attempt {N} failed. Judge identified {summary}. Auto-retrying ({N+1}/{max})..."
- Loop back to Step 2 with N+1

### Verdict: ESCALATE
- Update `state.json`: `status: "escalated"`, `judge_verdict: "escalate"`, `escalation_reason: <from brief>`
- Generate retry report (Step 4)
- Tell user: "Pipeline escalated after {N} attempts. Human intervention needed."
- Show the escalation reason and recommended actions from the judge brief

## Step 3.5: Post-PASS Dark Code Audit (Advisory)

After a PASS verdict and before generating the retry report, run the
`dark-code-audit` skill against `target_dir`. This is advisory and does not
block the pipeline -- it surfaces modules that may have been built without
sufficient comprehension signals (authorship trail, decision rationale,
behavioral contracts, dependency documentation).

Invoke the skill with target `{target_dir}`. The skill will:
- Score each module 0-100 across four dimensions
- Save baseline scores to `{target_dir}/.dark-code-audit/latest.json`
- Produce a heat map and drill-down TODO list

Compare the result to any prior scan:
- If any module's darkness score increased by more than 15 points since the
  last scan, surface it in the retry report under "Comprehension Regressions"
- If any new module scored at or above the darkness threshold (default 80),
  surface it under "New Dark Modules"
- If this is the first scan, note the aggregate score as the baseline

Do NOT fail the pipeline on dark code findings. This is informational only --
the Judge has already validated tests pass. Dark code audit is about whether
a human can maintain the code, not whether it works.

If `dark-code-audit` skill is unavailable (not installed), skip this step
silently and continue to Step 4.

Write `{target_dir}/.self-healing-pipeline/retry-report.md`:

```markdown
# Self-Healing Pipeline Report

**Task**: {task description}
**Result**: {PASSED on attempt N | ESCALATED after N attempts}
**Duration**: {started_at} to {now}

## Attempt Summary

| Attempt | Builder Result | Judge Verdict | Key Issue |
|---------|---------------|---------------|-----------|
| 1       | pass/fail     | pass/retry/escalate | one-line summary |
| ...     | ...           | ...           | ...       |

## What Broke
{For each failed attempt: what test(s) failed and root cause}

## What Was Auto-Fixed
{For each retry that improved things: what the Judge diagnosed and Builder fixed}

## What Escalated (if applicable)
{Why auto-fix was insufficient, what human action is needed}

## Files Changed
{List of all files created or modified across all attempts}

## Test Results (Final)
{Full test output from the final attempt}
```

Update `state.json`: set `updated_at` to now.

## /retry-report Command

When the user says `/retry-report` or "show retry report" or "what happened in the pipeline":

1. Find the nearest `.self-healing-pipeline/` directory (current dir, then parent dirs)
2. If `retry-report.md` exists, read and display it
3. If it doesn't exist but `state.json` does, generate the report from current state
4. If no state directory found, say: "No self-healing pipeline state found in this project."

## Session Recovery

If a session is interrupted mid-pipeline:

1. On next invocation, detect `state.json` with non-terminal status
2. Read the state and determine where execution stopped:
   - `planning` + `planner_done: false` -> Re-run Planner
   - `building` + `builder_done: false` -> Re-run Builder for current attempt
   - `judging` -> Re-run Judge for current attempt
   - `building` + `builder_done: true` -> Judge was interrupted, re-run Judge
3. Resume from that point. Do not restart from scratch.
4. Tell the user: "Recovered pipeline state. Resuming from {status}, attempt {N}."

## Guardrails

- **3-attempt cap is hard**: Never exceed `max_attempts`. On attempt 3, Judge must
  either PASS or ESCALATE -- RETRY is not an option.
- **No silent failures**: Every attempt must produce a builder-log and judge-brief.
  If an agent fails to write its file, that counts as a failed attempt.
- **No scope creep on retries**: Judge's RETRY brief must include a "do NOT change"
  section. Builder on retry must not refactor, add features, or change the test
  contract.
- **Spec claims and test contract are immutable after planning**: Builder and
  Judge cannot modify `spec-claims.md` or `test-contract.md`. If either is
  wrong, that's an ESCALATE — the human re-runs Stage 1A/1B from a clean
  state directory.
- **Committed red tests are immutable**: The failing tests committed at
  `red_commit_sha` are the acceptance criteria. Builder must not edit, delete,
  or weaken them. Judge enforces this via `git diff {red_commit_sha} -- <tests>`
  (see Step 3, item 4). Any diff against the tests = auto-ESCALATE. The red
  commit is also the rollback anchor: `git reset --hard {red_commit_sha}`
  returns to a known-good starting point if Builder goes off the rails.
- **Human gate on plan approval**: The plan is always shown to the user before
  building starts. This is the one mandatory human checkpoint.

## Cleanup

After a PASS or ESCALATE, the `.self-healing-pipeline/` directory is kept for
reference. The user can delete it manually or run:
```bash
rm -rf .self-healing-pipeline/
```

Do NOT auto-delete -- the state is useful for `/retry-report` and post-mortems.

## Appendix — Worked anti-example: idea #427 Nighttime Newborn Triage Copilot

This appendix exists because the two-stage Planner split (Stage 1A spec
extraction before Stage 1B implementation design) was added in response to a
specific failure: the the build pipeline-the idea backlog-427-r2 build (2026-05-12). Read this
when you're tempted to write tests "while you're already thinking about the
implementation."

**What the spec promised** (`spec.md`, summarized):
- A nighttime newborn distress copilot for exhausted parents like "Sarah at 2 AM"
- Three triage outcomes: ER, CALL_PEDIATRICIAN, HOME_CARE
- Calm, reassuring tone — "calm voice in the room, not adding urgency on top of urgency"
- Spec sub-document `skills/triage/SKILL.md` promised "case-insensitive
  substring matching against the symptom set"
- Domain: newborn medical triage — implicit fail-safe = escalate, not soothe

**What the old single-stage Planner did**:
1. Read the spec
2. Invented a concrete 7-rule decision system in `plan.md` (Rules 1-7), including
   the exact canonical symptom strings (`"lethargic"`, `"refusing all feeds"`,
   `"inconsolable crying >2h"`, etc.)
3. Wrote `test-contract.md` using those same canonical strings as inputs
4. Committed the tests red

**What the Builder did**: implemented the rules exactly as `plan.md` specified,
using exact-set membership (`sx_set & _ER_SYMPTOMS`) instead of the
substring matching that `SKILL.md` documented.

**Result**: 12/12 tests green. Judge passed it. the review agent (external reviewer)
caught 8 critical safety bugs the pipeline missed:
- Parent saying "baby is really lethargic" -> no match -> HOME_CARE
- 2-month-old at 35.0°C (hypothermia = sepsis marker per AAP) -> HOME_CARE
- 4-month-old at 39.5°C -> HOME_CARE with the message "Nothing you've
  described matches an emergency pattern"
- `triage(None, None, None)` -> crash; Fahrenheit-as-Celsius -> miscategorized

**Why the tests didn't catch any of this**: every test input was a literal
canonical string the Planner had also written into the implementation rules.
The tests were a tautology against the Planner's own design, not a probe of
the spec's safety promises. The Planner's brain wrote both sides of the
contract in one pass.

**What Stage 1A should have produced** (`spec-claims.md`):

```
| id   | category    | claim                                                  | spec source                |
|------|-------------|--------------------------------------------------------|----------------------------|
| C-01 | BEHAVIOR    | Returns one of {ER, CALL_PEDIATRICIAN, HOME_CARE}      | spec.md "structured triage"|
| C-02 | USER-VOICE  | Symptoms match by case-insensitive substring           | SKILL.md line 59           |
| C-03 | USER-VOICE  | Parents type free-text phrases ("really lethargic",    | spec.md "exhausted parent",|
|      |             | "lips look kinda blue"), not canonical fixtures        | user-voice trigger         |
| C-04 | SAFETY      | Unrecognized symptoms must NOT default to HOME_CARE    | safety-domain trigger      |
|      |             | with "nothing matches an emergency pattern" wording    |                            |
| C-05 | SAFETY      | Hypothermia (temp < 36.0°C) in <3mo is sepsis-equiv    | safety-domain trigger      |
|      |             | to fever — must escalate, not home-care                | (newborn medical)          |
| C-06 | SAFETY      | Moderate fever (39.0-39.9°C) in older infants must     | safety-domain trigger;     |
|      |             | route to pediatrician, not "nothing's wrong"           | "when in doubt, escalate"  |
| C-07 | FAILURE     | Malformed input (None, NaN, negative age, string age)  | safety-domain trigger      |
|      |             | must not silently route to HOME_CARE                   |                            |
| C-08 | FAILURE     | Empty symptoms list when extraction failed upstream    | safety-domain trigger      |
|      |             | must be distinguishable from "no symptoms reported"    |                            |
| C-09 | TONE        | Advice opens with "You're doing the right thing        | SKILL.md line 47           |
|      |             | checking in" — calming opener BEFORE the directive     |                            |
| C-10 | OUT-OF-SCOPE| No diagnostic claims ("your baby has X disease")       | SKILL.md "not a diagnosis" |
```

**What the tests should have looked like**:
- C-02 / C-03 tests use realistic phrasings: `triage(2, 37, ["baby is really lethargic, lips look kinda blue"])` MUST return ER
- C-04 tests pass garbage symptoms: `triage(2, 37, ["she's just not herself"])` MUST NOT return HOME_CARE with "nothing matches"
- C-05 tests hypothermia: `triage(2, 35.0, [])` MUST escalate
- C-06 tests the missing fever band: `triage(4, 39.5, [])` MUST route to CALL_PEDIATRICIAN
- C-07 tests pass `triage(None, None, None)` and expect a safe failure mode, not a crash
- C-10 tests pass a symptom and assert the response string does NOT contain "diagnose" or disease names

Each of these would have failed the canonical implementation immediately and
forced Builder to widen the engine before Judge would pass it.

**The discipline this enforces**: the Planner's first job is to be a hostile
reader of the spec, not a friendly designer of the implementation. The
spec-extraction stage exists to make that ordering structural rather than
optional. The Judge's claim-coverage check in Step 3, item 5 is the backstop
that catches Planners who skip ahead anyway.

## Postscript — r2, the review-driven coverage limit, and Stage 1A.5

The two-stage split above (Stage 1A spec extraction → Stage 1B test
contract) shipped 2026-05-12 and was validated end-to-end on the same
#427 build. **It closed every named issue from r1**: hypothermia, substring
matching, moderate fever, input validation, silent fail-back on unknown
symptoms — all five r1 critical findings were verified FIXED in r2.

Then the review agent rejected r2 with 6 NEW critical findings of a different class:

- **Smart apostrophe (U+2019)** in symptom strings: iOS/Android default
  keyboards type `they're` not `they're`. The pattern table was ASCII-only.
- **Negation handling**: `"not lethargic"` matched the `"lethargic"`
  pattern and triggered ER false alarms.
- **Word-boundary collisions**: bare-token matching let `"limpid"`
  trigger the `"limp"` symptom; `"rashly"` triggered `"rash"`.
- **Register shifts**: 28 realistic parent phrasings (`"stopped
  breathing"`, `"wheezing"`, `"throwing up everything"`, `"twitching"`,
  `"floppy"`, `"blueish skin"`) downgraded to CALL_PEDIATRICIAN via the
  fail-safe rule because none matched the clinical-register pattern set.

**Why the two-stage Planner missed these**: every input shape that
failed in r2 was *not named* in r1's the review agent report. The two-stage Planner
is a high-fidelity reader of named content (spec + prior review). It is
not — and cannot be — a generator of unnamed adversarial inputs. Both r1
and r2 had the same root pattern (silent under-triage on parent-realistic
phrasings), but r1's specific instances got fixed while r2's specific
instances persisted because nobody had named them yet.

Stage 1A.5 exists to close this gap proactively. What Stage 1A.5 should
have produced for #427 r2 (continuing the numbering from Stage 1A's
C-01..C-10):

```
| C-11 | SAFETY  | Smart apostrophe (U+2019) in symptom strings must not   | derived from C-03;       |
|      |         | bypass pattern matching                                 | Unicode axis             |
| C-12 | SAFETY  | Negation ("not lethargic", "no fever", "isn't            | derived from C-03;       |
|      |         | inconsolable") must NOT match the asserted-symptom      | negation axis            |
|      |         | pattern                                                 |                          |
| C-13 | SAFETY  | Word-fragment collisions ("limpid", "rashly",           | derived from C-02;       |
|      |         | "paleness", "painting") must not trigger positive       | word-boundary axis       |
|      |         | matches for "limp", "rash", "pale", "pain"              |                          |
| C-14 | SAFETY  | Lay-register equivalents of clinical tokens must match  | derived from C-03;       |
|      |         | the same severity: "stopped breathing"=apnea,           | register-shift axis      |
|      |         | "wheezing"=respiratory distress, "throwing up           |                          |
|      |         | everything"=projectile vomiting, "twitching"=seizure,   |                          |
|      |         | "floppy"=lethargy, "blueish skin"=cyanosis              |                          |
| C-15 | SAFETY  | Multiple tokens embedded in one sentence ("she's        | derived from C-03;       |
|      |         | floppy and won't take feeds and her lips look blue")    | embedded-symptom axis    |
|      |         | must match every token, not just the first              |                          |
```

Each of these would have forced corresponding tests in the test contract,
which would have failed Builder's r2 implementation, which would have
forced Builder to widen the matcher (Unicode-NFC normalization, negation-
aware matching, word-boundary anchoring, lay-synonym table, multi-token
tokenizer) BEFORE Judge would pass it.

**Implication for safety-domain builds**: do not expect r1→PASS. The
"named issues fixed in r2" pattern is the *minimum* result of the
two-stage Planner alone — Stage 1A.5 is the architectural fix that lets
r2 actually pass instead of just exposing the next named layer. Without
Stage 1A.5, three-cycle convergence on safety builds is the floor, not
the ceiling, and the retry budget is exhausted before convergence.
