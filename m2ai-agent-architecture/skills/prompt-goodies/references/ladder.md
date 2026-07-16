# The Prompt Goodies Ladder

Eight rungs. Each one is a copy-paste asset. Paste the block, run your task, notice the
friction it removes, climb when ready. Rungs 1-5 work on any task you hand to an AI.
Rungs 6-8 are for when multiple workers share a workspace.

Provenance: extracted from delegation prompts a frontier model wrote for itself while
orchestrating subagents in a measured experiment (subagent-ab, 2026-06-11). Quotes are
from real spawn prompts.

---

## Rung 1 — Show me the receipt

**The one new idea:** "done" is a claim. A pasted command and its output is evidence.
Ask for evidence and you never have to take the claim on faith.

### Copy-paste asset (add to the END of any task prompt)

```
When you finish, paste the exact command you ran to verify your work and its
full output. "It works" without the paste does not count as done.
```

### What you will notice
The agent starts actually running the verification instead of describing it. And when
something fails, you see the real error instead of a soft "mostly working" summary.

**The upgrade to Rung 2:** receipts prove the work happened. They do not stop the agent
from doing work you never asked for. That is a fencing problem.

---

## Rung 2 — Stay in your lane

**The one new idea:** agents wander. Telling them what to do is half the job; telling
them what NOT to touch, and who owns it, is the other half.

### Copy-paste asset (adapt the two lists)

```
You own: src/feature-x/ and its tests.
Do NOT create or modify ANY files outside that. Specifically:
- docs/ is owned by someone else
- package.json and CI config are owned by me; if you need a change there,
  STOP and ask instead of editing
```

Real version from the experiment, written by the model for its own worker:

> do NOT touch agents/ and do NOT write DELIVERABLES.md; the orchestrator handles that

### What you will notice
The "helpful" side edits stop. No more surprise README rewrites or dependency bumps you
have to review and revert.

**The upgrade to Rung 3:** the agent now stays in its lane and shows receipts. But it
still gives up too early on failures, or finishes "done" with a red test suite.

---

## Rung 3 — Iterate until green

**The one new idea:** give the exact verification command, make passing it the
definition of done, and require cleanup so verification leaves no residue.

### Copy-paste asset

```
Before you finish:
1. Run: npm install && npm test   (use the real command for your stack)
2. If anything fails, fix it and run again. Iterate until green. A failing
   check means keep working, not report back.
3. Delete any scratch files / test databases your verification created.
   The workspace ships clean.
```

Real version from the experiment:

> Run `(cd <workspace> && npm install && npm test)` and iterate until green. ... Make
> sure the smoke-test crm.db is deleted afterwards so the workspace ships clean.

### What you will notice
"Done" starts meaning done. The retry loop happens inside the agent's turn instead of
across three rounds of you re-prompting.

**The upgrade to Rung 4:** your agent now verifies and cleans up, but it keeps tripping
over the quirks of YOUR machine: the blocked command, the proxy, the slow directory.

---

## Rung 4 — Warn them about your house

**The one new idea:** workers do not inherit your scars. Anything your environment
punishes goes in the prompt, WITH the approved workaround, not just the prohibition.

### Copy-paste asset (template; fill with your environment's real quirks)

```
Environment constraints (these are real, you will hit them):
- <command X> is blocked here. Use <approved alternative> instead.
- No network calls at runtime (package install is fine).
- <path or service quirk and its workaround>
```

Real version from the experiment. The orchestrating model relayed a shell hook it had
never been told to mention, workaround included:

> `cd` as a standalone Bash command is BLOCKED by a hook. Use absolute paths,
> `npm --prefix <dir> ...`, or the subshell pattern `(cd /path && cmd)`.

### What you will notice
A whole class of wasted turns disappears: the agent stops discovering your environment
by colliding with it.

**The upgrade to Rung 5:** the mechanics are now solid. The remaining failures are
quality failures, and "please make it high quality" does nothing.

---

## Rung 5 — Name the slop

**The one new idea:** models steer away from a named failure far more reliably than
they steer toward an adjective. Quote the bad output you do not want.

### Copy-paste asset (adapt the quoted examples to your domain)

```
Quality bar: concrete, step-numbered procedures. Every step names the exact
command or file it touches. No vague steps like "update the database" or
"handle errors appropriately". This is a runbook, not marketing copy.
```

Real version from the experiment:

> No vague steps like "update the CRM". ... Keep it tight and operational, a runbook,
> not marketing copy.

### What you will notice
The fluff drains out. When the model knows what slop looks like in YOUR domain, it
stops producing it. This is the last rung for solo tasks; everything below is for
multiple workers.

**The upgrade to Rung 6:** the moment two workers build against the same interface, a
new failure appears that none of the rungs above prevent: they each invent their own
version of it.

---

## Rung 6 — Pin the contract

**The one new idea:** when two workers share an interface, the interface goes in BOTH
prompts, verbatim, before it exists. Never let two agents independently imagine the
same contract.

### Copy-paste asset (put the same block in every worker's prompt)

```
## Interface contract (implement EXACTLY this surface. Another worker is
## building against it; any deviation breaks them.)
<paste the full API signature / CLI grammar / schema here, even though no
code exists yet>
```

Real version from the experiment. The model pinned a complete 24-command CLI grammar
into every spawn prompt before a single line of code existed:

> CLI command grammar (implement EXACTLY this surface, other agents are writing docs
> against it)

Measured result: zero drift. Across every run, every command and flag the doc-writing
agents referenced matched what the builder actually built.

### What you will notice
Integration stops being a debugging phase. The pieces meet in the middle because they
were built from the same sentence.

**The upgrade to Rung 7:** your workers now build to contract. But each one still has
more power than its job needs, and you cannot tell at a glance.

---

## Rung 7 — Least privilege you can grep

**The one new idea:** a permission list is only real if it is mechanically checkable
against behavior, in both directions.

### Copy-paste asset

```
The allowed_commands list must be the minimal set your own procedures
actually use. Two-direction rule: every command cited in a procedure appears
in the list, and nothing appears in the list that no procedure cites. A
reviewer will grep both directions.
```

Real version from the experiment:

> `allowed_commands` must be the minimal set that the agent's own workflows actually
> use ... every command cited in a workflow appears in the list, nothing extra.

### What you will notice
Privilege creep becomes visible as a diff. Audits go from judgment calls to grep.

**The upgrade to Rung 8:** each worker is now scoped and checkable. The last failure
mode is two agents who both believe they own the same decision.

---

## Rung 8 — The never list

**The one new idea:** multi-agent role design is boundary design. Define each role by
what it refuses to do, and point every "never" at the neighbor who owns that action.

### Copy-paste asset (one block per agent)

```
Boundaries for <AgentName>:
- NEVER <action> — that belongs to <OtherAgent>; hand off by <mechanism>
- NEVER <irreversible action> — escalate to the human instead
- Owns: <the one stage/domain this agent fully controls>
```

Real version from the experiment, three roles sharing one CRM:

> Scout never moves an engagement past `proposal`, hands off to Concierge at `active`.
> Concierge never creates new leads, escalates closed_won/closed_lost to the human.
> Ledger is read-mostly, never changes stages, proposes merges for human approval.

### What you will notice
Handoffs happen on purpose. No two agents fight over the same record, and the
irreversible decisions keep landing on a human desk.

**Top of the ladder.** You now write delegation prompts with receipts, fences, green
loops, house rules, named slop, pinned contracts, greppable privilege, and never lists.
That is more delegation discipline than most engineering teams write for humans.
