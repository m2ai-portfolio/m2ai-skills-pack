# Routing Lessons (learned judgment)

Read before classifying. Lessons here OVERRIDE the decision matrix in SKILL.md.
Format: one bullet per lesson: rule, evidence count, last-seen date.
Cap: 20 entries. When full, prune the weakest-evidence entry.
A lesson with 1 incident is a hypothesis (mark `[H]`); 3+ incidents makes it a rule.
Written by the Phase 3.5 review pass or the Phase 4 retro only; do not hand-edit mid-dispatch.

The seed lessons below come from the author's own route log. They are starting judgment, not your evidence: their predictions do NOT count toward graduation in `review-state.json`. Replace or retire them as your own outcomes accumulate.

## Lessons

- **[RULE, seed] A dispatched subagent's self-report is not evidence, at any tier.** Subagents at every tier return confident output describing what they did instead of the work itself, or assert a state they never checked. Verify the artifact directly before accepting any completion claim. Answer trivial conversational lookups INLINE; reserve dispatch for work whose product is a checkable artifact. (4 incidents across 3 tiers in the seed log.)
  *Prediction (seed, does not count):* a dispatch whose deliverable is a claim about shared state, rather than a file or diff that can be read back, will produce a non-clean outcome.

- **[RULE, seed] A dispatch often does not surface its deliverable on the first return.** It goes idle, or answers about the work, and needs a nudge before the artifact appears. Put an explicit contract in the dispatch prompt: "your final message must BE the deliverable, not a description of it." This is invisible in the stats if you grade the eventual return, so grade the FIRST return (Phase 3). Seen on the top tier first, then on Opus without the contract. (5 incidents in the seed log.)
  *Prediction (seed, does not count):* a subagent route whose deliverable is the return text, dispatched without the deliverable contract, will need a nudge.

- [H, seed] **A dispatched reviewer or AAR agent gets READ-ONLY authority over shared state.** It proposes deletions and edits; the main loop executes them after verifying. The one severe failure in the seed log was a write-authority error: an unverified "process is dead" claim became data loss only because the agent could delete.
  *Prediction (seed, does not count):* a review route with write or delete authority over state other processes touch will produce a non-clean outcome; propose-only equivalents will not.

- [H, seed] **Verify negative claims about remote hosts or processes before acting.** Both remote-state failures in the seed log were absence claims ("X absent", "peer process dead"). Positives can be spot-checked.

- [H, seed] **Recon, verification, and smoke fan-out defaults to Sonnet regardless of stakes.** Up-tier recon bought nothing measurable in the seed log (23 of 24 Sonnet recon routes clean; Opus and top-tier recon also clean, at about twice the latency).

- [H, seed] **Restate hard style rules in the dispatch prompt.** Subagents do not reliably inherit house-style rules from the parent session; an otherwise-correct authoring route shipped 9 violations of a style rule that was not restated.

## Pruned / retired

(move stale or disproven lessons here with a one-line reason, so they aren't relearned)
