# Review pass (Phase 3.5) and retro (Phase 4)

## Phase 3.5: Adversarial review pass

Runs when Phase 0.5 prints `REVIEW DUE` (2+ new non-clean outcomes, 10+ routes, or 3+ dispatches missing an outcome since the last review; floor of 5 logged outcomes).

**Reviewer is orthogonal to the routes under review.** The dominant failure in the log is confident-but-empty subagent self-reporting, across all tiers, so a reviewer from the tier that produced most routes grades its own weakest axis.

- Default reviewer tier is Sonnet (cost).
- Window is majority Sonnet/Haiku/Local: reviewer on Fable.
- Window is mostly Fable: reviewer on Sonnet.
- The main loop does not review its own Fable-inline decisions unassisted.

Prefix the review dispatch's `--task` with `review:` so it is excluded from route counts and cannot trigger the next review.

Prompt the reviewer to find the miss:
- Routes that should have gone to a different tier, with evidence from the log.
- Routes that should not have been dispatched (inline would have been cheaper and more reliable).
- Non-clean outcomes sharing a root cause.
- Every claim cites route IDs.
- Say explicitly that finding nothing is an acceptable answer (invention pressure caused several logged failures).

Every proposed lesson carries a falsifiable prediction: "routes matching X on tier Y will produce non-clean outcomes." No prediction, not eligible.

Record the pass, then surface findings to the user:

```bash
node $SKILL_DIR/scripts/log-route.mjs review \
  --routes-since N --findings N --proposed N [--accepted N]
```

### Write authority ladder

Current rung lives in `references/review-state.json` (not the log, so a truncated log cannot reset it).

| Rung | Authority | Graduates when |
|---|---|---|
| **1 (current)** | Propose only. Every lessons edit needs the user. | 5 lessons whose prediction was later CONFIRMED by a route outcome. |
| **2** | May auto-write mechanical ops only: promote an `[H]` to a rule at 3+ incidents, prune already-retired entries. New lessons still need approval. | 10 further confirmed predictions, zero reverted auto-edits. |
| **3** | May auto-write new lessons. Every edit logged and reversible. | Terminal. |

Approval alone never advances the rung; a confirmed prediction does. Any reverted auto-edit or REFUTED prediction drops a rung and resets the counter.

At every rung, `references/routing-lessons.md` is written only by a review pass or the Phase 4 retro, never hand-edited mid-dispatch.

## Phase 4: Retro (manual, on "model-router retro" only)

1. Read `~/logs/model-router/routes.jsonl`. Join `dispatch` and `outcome` events by `id`; for duplicate outcome ids the LAST wins. Ignore routes with no outcome.
2. Find patterns in `needed-rework` / `escalated-tier`: which tier failed at which task shape. Look for downgrade evidence (a higher tier repeatedly `clean` on work the matrix could have sent lower). Read `wanted`: an override that came back clean on a cheaper tier than wanted is downgrade evidence; a non-clean one says the router was right.
3. Propose 2-3 edits to `references/routing-lessons.md` (new lessons, `[H]` promoted at 3+ incidents, prunes to the retired section), citing incident counts and dates.
4. Wait for explicit approval, then apply.
5. Resolve open predictions in `review-state.json` (`status: open`): confirmed advances the graduation counter; refuted revokes the lesson and drops a rung. Neither after 30 days stays open and counts for nothing.

Do not schedule the retro as a cron unless the user explicitly graduates it (owner/sink/kill required then). The Phase 3.5 review is session-scoped and fires only on invocation, so no scheduling gate applies to it.
