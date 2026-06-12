---
name: prompt-goodies
description: An escalating ladder of copy-paste delegation-prompt patterns, extracted from prompts a frontier model wrote for itself when orchestrating subagents. Use this skill whenever the user asks for "prompt goodies", wants to write or improve a prompt that delegates work (to a subagent, an agent team, a worker, a contractor-style task, a CMD mission, or any AI doing a job unsupervised), asks "how do I write better agent prompts", complains that an agent ignored instructions / touched the wrong files / claimed success without proof, or wants prompt patterns to share with a community. Also use it to upgrade a specific delegation prompt the user pastes in, even if they never say the word "prompt".
---

# Prompt Goodies

Eight delegation-prompt patterns arranged as a ladder. Rung 1 works on day one with zero
prior experience, and every rung after it earns the next. Every rung is a copy-paste
asset, not an explanation. The patterns come from spawn prompts the
model itself wrote during a measured subagent experiment, so they are what the model
already responds to, not folklore.

The full ladder lives in [references/ladder.md](references/ladder.md). Read it whenever
you serve or apply rungs; do not improvise replacement wording from memory, because the
rung assets are tuned to be paste-ready.

## Two modes

**Mode 1 — Serve the ladder.** The user wants the patterns themselves (to learn, to post,
to teach). Ask one question only if needed: "have you written a prompt that delegates
work to an agent before?" Map the answer to a starting rung (never → Rung 1; sometimes →
Rung 3; runs multi-agent stuff → Rung 6). Then hand them the starting rung VERBATIM from
the ladder file: the one new idea, the copy-paste block, what they will notice, and the
hook to the next rung. Serve one or two rungs at a time, never the whole ladder in one
dump. The pedagogy is escalation: each rung creates the friction the next rung resolves.

**Mode 2 — The easy button.** The user pastes a prompt (or describes a task they are
about to delegate) and wants it upgraded. Diagnose it against the checklist below, then
return their prompt rewritten with ONLY the missing rungs that the situation actually
needs. A single-worker task never needs Rungs 6-8. Show the rewritten prompt first, then
a short list of which rungs you applied and why, one line each.

## Diagnostic checklist (Mode 2)

Walk the user's prompt against these eight questions, in order:

1. **Receipt** — does it demand pasted evidence of completion (exact command + output),
   not just a claim of success?
2. **Fence** — does it say what the worker must NOT touch, with the owner of that
   territory named?
3. **Green loop** — does it give the exact verification command and say "iterate until
   green", plus cleanup of test residue?
4. **House rules** — does it relay environment constraints (blocked commands, network
   rules, quirks) WITH the approved workaround?
5. **Named slop** — does it name the specific failure mode to avoid, in quotes, rather
   than asking for "high quality"?
6. **Pinned contract** — if two or more workers share an interface, is the interface
   pasted verbatim into every prompt with "implement EXACTLY this"?
7. **Greppable privilege** — if the worker gets a permission/tool list, is it derivable
   from its own tasks in both directions (everything used is listed, nothing extra)?
8. **Never list** — if multiple agents share a domain, does each role have explicit
   "never" boundaries that point at the neighbor who owns that action?

Rungs 1-5 apply to ANY delegated task, including a single Claude Code session given a
big job. Rungs 6-8 only apply when multiple workers coexist.

## Tone rules for serving this content

- Hand assets, not lectures. The copy-paste block is the teaching.
- Never serve a rung without its "what you will notice" line; the friction it predicts
  is what makes the user trust the next rung.
- When upgrading a prompt (Mode 2), preserve the user's own wording and structure
  wherever possible. The rungs are additions and fences, not a rewrite of their voice.
- Provenance, once, briefly: these patterns were extracted from prompts the model wrote
  for itself; that is why they work. Do not repeat the experiment's full story unless
  the user asks.
