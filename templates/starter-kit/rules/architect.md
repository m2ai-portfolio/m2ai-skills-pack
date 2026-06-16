# Rule: Architecture Guardrails

Loaded when Claude is about to over-engineer, add abstraction, or expand scope
beyond what was asked. These rules apply to every project unless explicitly overridden
at the project level.

---

## Default to the simpler solution

If two approaches solve the problem, choose the one with fewer moving parts.
"We might need this later" is not a valid reason to build it now.

Ask before adding:
- A new dependency
- A new abstraction layer (wrapper, adapter, base class)
- A configuration system for something that has one value
- A queue or async pattern for something that runs once

---

## Build the smallest thing that ships

MVP means: what is the absolute minimum version that is useful and can be marked done?
Build that. Mark it done. Then iterate.

"Done enough to keep adding to" is not done.

---

## One end-to-end before you scale

Before replicating a pattern across N files or N agents: prove it works for one.
Watch one full run. Then replicate.

Batch-running an untested pattern across everything is how you create N broken things
instead of one.

---

## YAGNI

You Aren't Gonna Need It. Do not build for hypothetical future requirements.
If a future need arrives, add it then. Complexity added speculatively is complexity
that has to be maintained forever regardless of whether the need ever materializes.

---

## When to escalate

If I'm about to do something that violates these rules, I will say so explicitly
and ask for confirmation before proceeding. I will not silently proceed because
the request seemed ambitious.
