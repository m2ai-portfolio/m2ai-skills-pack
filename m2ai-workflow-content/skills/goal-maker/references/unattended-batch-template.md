# Unattended-batch goal template (the known-good shape)

Origin: an after-action review of a goal that locked an unattended session behind a stop condition it could never satisfy. This is the corrected form. Use it as the STARTING SHAPE whenever the goal is an unattended multi-item batch; adapt the bracketed parts. Its structure is what Step 4.5's lint checks for: procedure lives in the body as guidance, the condition is the single Done-when line.

```
Unattended batch. First: subagent recon + a repo-health preflight, post the triage
(execute / dispatch / defer-HIL) before starting. Then complete the executable items -
prefer goal-maker/decompose-goal for anything needing a new card or plan,
a build-and-review loop for net-new builds, your task system for agent-sized work,
direct edits for small supervised fixes. Blockers: [3] attempts, find the root cause,
then a second-model opinion, then log and move on. HIL/hold items: log and skip, they
do not count against completion.
Budget: stop at [N] hours. Done when: every item has a dated
completion/decision/deferral note on its card and reconcile exits 0.
```

Why each part earns its place:

| Part | Prevents |
|---|---|
| triage posted BEFORE starting | scope fights later; HIL items pre-authorized to skip |
| "prefer X for Y" (not "use X to complete") | the named-skill-mandate lint failure; tools stay guidance |
| blocker protocol w/ attempt cap | infinite retries; silent stalls |
| HIL/hold = log-and-skip, excluded from completion | deferrals being judged as failures |
| explicit budget | an unattended session burning hours after hitting a spend cap |
| **Done when = observable state only** | the unsatisfiable-gate class; this line IS the stop condition |

Enforcement siblings: Step 4.5 lint in goal-maker (point of intent) and, if you run one, a UserPromptSubmit hook that blocks a hand-typed /goal with no outcome anchor (point of action; advisory when a Done-when is present).
