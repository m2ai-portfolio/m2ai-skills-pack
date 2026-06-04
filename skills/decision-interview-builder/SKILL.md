---
name: decision-interview-builder
description: Conduct a structured multi-turn interview through one real past decision the user made — walking situation, decision, risk, and change — and produce a sanitized, shareable judgment artifact that documents the reasoning without leaking confidential details. Use when the user says "interview me about a decision", "build my judgment artifact", "extract my reasoning", "decision interview", "show my thinking", or wants to generate career evidence from a real work decision.
---

# Decision Interview Builder

Turns one real past decision into a portable, sanitized judgment artifact. The output travels with the person — surviving job changes, badge swipes, and resume rewrites — because it proves *how* they thought, not just *what* they shipped.

## Trigger

Use when the user says "decision interview", "interview me about a decision", "build my judgment artifact", "extract my reasoning", "show my thinking", "prove I understood that call", or wants documented evidence of their reasoning for a career file, promotion packet, or interview prep.

## Phase 1: Decision Selection

Ask the user to name one real decision they have made. Accept any level:
- An IC choosing between two technical approaches
- A team lead deciding whether to ship or delay
- A manager making a hiring call under uncertainty
- An executive choosing between two market bets

If the user gives a vague situation rather than a decision (e.g., "we had a big project"), redirect: "Tell me the specific choice point — what were the two or more options on the table?"

Do not proceed until there is a clear decision with at least two alternatives.

## Phase 2: Four-Question Interview

Walk the user through the four questions in sequence. One question at a time — do not batch them. After each answer, probe once for specificity if the answer is vague (see below).

### Q1: Situation

"Describe the situation you were in when this decision needed to be made. What was at stake? Who was affected?"

Probe if vague: "What would have broken or gone wrong if no decision had been made at all?"

### Q2: Decision

"What did you actually decide? Walk me through the moment of choosing — what were the real options, and what tipped you toward this one?"

Probe if vague: "What was the option you *didn't* choose, and what would have happened if you had?"

### Q3: Risk

"What was the biggest risk you accepted by making this call? What did you know you might lose or break?"

Probe if vague: "If this decision had backfired completely, what would that have looked like three months later?"

### Q4: Change

"What changed as a result of this decision — in the outcome, in how you would approach the same situation again, or in what you now know you were wrong about?"

Probe if vague: "What is the one thing you would tell yourself before this decision that you only know now?"

## Phase 3: Sanitization Pass

Before drafting the artifact, ask:

"Before I write this up, are there any details in your answers — company names, product names, client names, colleague names, specific numbers — that you'd like me to replace or generalize?"

Replace any flagged details with generic labels: [company], [client], [Product X], [Q3], [team lead], etc. Keep the reasoning structure intact.

## Phase 4: Artifact Output

Produce a clean, portable judgment artifact in the following format:

```
# Judgment Artifact — [Decision Title, e.g., "Build vs. Buy: Auth System"]

## Situation
[2–4 sentences: the context, what was at stake, who was affected]

## Decision
[2–3 sentences: what was chosen, the real alternatives, what tipped the call]

## Risk Accepted
[2–3 sentences: the known downside, what could have broken]

## What Changed
[2–3 sentences: the actual outcome or ongoing result, what the decision-maker now carries forward]

## Judgment Signal
[1 sentence: the non-obvious insight this decision demonstrates about how the person thinks — written in third person, suitable for a promotion packet or interview answer]
```

The **Judgment Signal** line is the most important. It is not a summary — it is the distillation of the decision-making quality embedded in the story. Examples:

- "Shows ability to ship under resource constraint without compounding technical debt downstream."
- "Demonstrates willingness to reverse a sunk-cost position when new information changed the risk calculus."
- "Identifies when stakeholder alignment is the bottleneck, not the technical solution."

## Phase 5: Storage Prompt

After delivering the artifact, ask:

"Where would you like to store this? Options: paste into your own document, save to a local file, or add to a decision log you're building."

Do not hardcode any path. Offer to write to `./decision-artifacts/[slug].md` if the user is in a project directory; otherwise default to displaying for copy-paste.

## Verification

- [ ] The decision has at least two named alternatives (not just "we did X")
- [ ] The Risk section names a real downside that was accepted, not just "it could have failed"
- [ ] The What Changed section includes something the decision-maker *learned* or would do differently
- [ ] The Judgment Signal is in third person and is specific enough to stand alone in a promotion packet
- [ ] No confidential detail survived to the artifact without the user's explicit approval

## Source

Derived from Nate's Newsletter 2026-05-31, "Executive Briefing: Your career evidence is thinner than you think + 3 prompts that rebuild it." Nate's "builder that interviews you through one real decision" is the core concept; this skill operationalizes it as a structured four-question interviewer with a sanitization pass and a portable artifact output.
