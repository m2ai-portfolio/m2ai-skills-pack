---
name: promotion-packet-auditor
description: Adversarial reviewer that scores a promotion packet or performance self-review for real judgment signal versus AI-generated polish. Surfaces unproven claims, impact assertions without decision context, and output descriptions that lack the reasoning a skeptical reviewer would demand. Use when the user says "audit my promo packet", "signal check", "promotion review", "does this show real impact", "what will a reviewer challenge", "stress test my self-review", or wants adversarial pressure-testing before submitting.
---

# Promotion Packet Auditor

A hostile-reviewer pass on a promotion packet or performance self-review. Its job is to find the claims a skeptical promotion committee will challenge — and surface them before the user submits. It does not rewrite; it produces a ranked issue list.

## Trigger

Use when the user says "audit my promo packet", "promotion review", "signal check", "stress test my self-review", "what will a reviewer push back on", "does this show real judgment", or submits a self-review or brag document for pressure-testing.

Related: `pretty-but-wrong` audits factual accuracy of AI-generated content. This skill audits *judgment signal quality* in career documents — a different failure mode.

## Input

Accept any of:

- A pasted promotion packet or self-review
- A brag document or "list of accomplishments"
- A performance review self-assessment
- A FAANG-style promotion write-up

If the input is a link or file path, ask the user to paste the content directly.

## The Three Failure Modes

This skill looks for three distinct failure modes, ranked by severity:

### CRITICAL — Claims with no decision context
Statements that describe an output ("I led the migration", "I shipped the feature", "I drove 40% growth") with no evidence that the person understood the work. A skeptical reviewer asks: "What did *you* decide, and why?" If the packet cannot answer that, the claim is decoration.

**Pattern:** Impact claim + no alternative considered + no risk acknowledged = AI-polish, not judgment signal.

### MAJOR — Impact numbers without mechanism
Quantified results ("reduced latency by 200ms", "saved $2M", "increased retention by 15%") with no explanation of *what change caused the result*. Numbers are easy to generate; the mechanism is the signal.

**Pattern:** Metric present + no causal explanation + no counter-evidence addressed = unverifiable claim.

### MINOR — Language that signals polish, not authorship
Hedged language, passive constructions, and generic verbs that suggest an AI draft was accepted without personalizing: "collaborated cross-functionally", "leveraged synergies", "ensured alignment", "drove outcomes." These are not wrong, but they are low-signal and will be discounted.

**Pattern:** Compound noun phrases + passive voice + no named stakeholder or specific constraint = commodity language.

## Audit Procedure

For each paragraph or bullet in the input, classify the claim(s) and tag any issues. After scanning the full document:

1. Produce a ranked issue list: CRITICAL issues first, then MAJOR, then MINOR.
2. For each issue, include:
   - **Location:** quote the exact phrase that triggered the flag
   - **Failure mode:** CRITICAL / MAJOR / MINOR
   - **Why it will be challenged:** one sentence from the skeptical reviewer's perspective
   - **What would fix it:** one sentence describing what evidence or detail would resolve it (do NOT rewrite — just describe what's needed)

## Output Format

```
# Promotion Packet Audit

## Verdict
[PASS / CONDITIONAL / FAIL]
- PASS: ≤2 MAJOR issues, 0 CRITICAL issues
- CONDITIONAL: 1–3 MAJOR issues or 1 CRITICAL issue
- FAIL: 2+ CRITICAL issues or a majority of claims are unverifiable

## Issue List

### CRITICAL

**[C1]** "[exact quoted phrase]"
- **Why it will be challenged:** [one sentence]
- **What would fix it:** [one sentence — describe the evidence needed, do not rewrite]

[repeat for each CRITICAL issue]

### MAJOR

**[M1]** "[exact quoted phrase]"
- **Why it will be challenged:** [one sentence]
- **What would fix it:** [one sentence]

[repeat for each MAJOR issue]

### MINOR

**[mn1]** "[exact quoted phrase]"
- **Why it will be challenged:** [one sentence]
- **What would fix it:** [one sentence]

[repeat for each MINOR issue]

## Signal Summary
[2–3 sentences: what the strongest judgment signal in the packet is, and what the biggest gap is between what the user clearly did and what the packet actually demonstrates]
```

## Verification

- [ ] Every issue includes an exact quoted phrase — no paraphrasing
- [ ] The failure mode is correctly assigned (not every vague sentence is CRITICAL)
- [ ] The "what would fix it" line describes evidence, never rewrites the user's text
- [ ] The Signal Summary names at least one genuine strength, not only weaknesses
- [ ] No internal agent names or platform-specific paths appear in the output

## Source

Derived from Nate's Newsletter 2026-05-31, "Executive Briefing: Your career evidence is thinner than you think + 3 prompts that rebuild it." Nate's thesis: AI destroyed the artifacts that used to *signal* judgment, because everyone can now produce polished output regardless of whether they understood the work. This skill operationalizes the adversarial side: scoring signal vs. polish so the user can close the gap before a real reviewer does.
