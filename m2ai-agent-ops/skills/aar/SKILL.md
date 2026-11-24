---
name: aar
description: Run an After-Action Review on any multi-step operation, such as a build, an agent dispatch run, a debug session, a deploy, a failed experiment or a video production run. Gathers forensics from logs, git history, test output, state files and running processes; classifies failure modes; captures benchmarks; produces a structured AAR with durable lessons and at most three judge-checked follow-up proposals. Use when the user says "aar", "after action review", "let's review what happened", "review this run", or after any operation that produced mixed results worth learning from.
context: fork
---

# After-Action Review (AAR)

Structured review for any operation that produced data worth learning from: a build, a deploy, a debug session, an agent dispatch run, a failed experiment, a media production run. Project-agnostic. Two appendices cover orchestrated agent dispatch runs and video production runs.

## When to invoke

- After any multi-step operation the user wants to understand.
- When the user says: "aar", "after-action review", "let's review", "what went wrong", "review this run".
- Proactively after: a run that failed partway, a git reset used to recover, more than 30% of a batch failing, an incident that needed manual intervention, a paid stage that had to be paid twice.

## Input

Ask once which scope applies. Default to "this session" if unclear:

- A specific run id or task id (a build id, PR number, commit range, work folder, video slug).
- A time window ("last 2 hours", "today").
- "This session": everything touched since session start.
- A specific file, feature or subsystem.

## Phase 1: Gather forensics

Never skip a source: missing data is the most common cause of a shallow AAR. Adapt the list to the project. If a source does not apply, note it and move on. Run in parallel where possible. Read-only throughout: an AAR never changes the system it reviews.

### 1. User-reported symptom

Start here. Record what the user said broke, in their words. Capture any error message or timestamp verbatim before anything else.

### 2. Logs

- Application logs (stdout/stderr, `logs/`, `/var/log/`, `journalctl -u <service>`).
- Process manager logs (`pm2 logs <name> --nostream`, `systemctl status`, `docker logs <container>`).
- Build and CI logs, local build output, test runner output.
- Framework logs (Next.js `.next/`, Vite, Unity `Editor.log`, render logs).

Grep for the failure timestamp, task id or error string. Capture 50 lines either side of the failure window.

### 3. Git history

```bash
git -C <repo> log --oneline -20
git -C <repo> status --short -b
git -C <repo> log --since="<window>" --all --oneline
```

Flag: automatic snapshot commits in the window (a periodic auto-commit job often means interrupted work), uncommitted changes, commits ahead of the remote, interleaved authorship on the same files (a possible race).

### 4. Test and build output

- Failing test names, assertion messages, stack traces (first and last 10 failures).
- Exit codes, runtime, memory use if captured.
- Typecheck and lint output if the failure was caught there.

### 5. State files and config

- Database records for the run (read-only queries: status, error, runtime fields).
- Queue or job files, per-stage status files, spend ledgers.
- Config files that changed in the window.
- Lock files (`/tmp/*.lock`, `*.pid`) that may be stale.

### 6. Running processes (if "still running" or the runtime looks stuck)

```bash
pgrep -af "<pattern>"
ps auxf | grep -v grep | grep <name>
```

Subprocess gone but status still "running" in a state file means a stuck executor: diagnose the state machine.

### 7. External forensics (when relevant)

- API response logs, rate-limit headers, provider status pages, billing or credit balances.
- Cloud resource state (hosting dashboards, CI artifacts, container state).

### 8. Self-reports versus artifacts

Where an agent or tool reported success, check the artifact it claims to have produced: the file exists, has the expected size, hash or duration, and contains what the report says. A report is a claim, not evidence.

## Phase 2: Classify failures

Every failed step maps to at least one mode. Several can apply. Check specific modes first, then fall back to generic ones.

| Mode | Signature |
|---|---|
| `timeout` | Runtime exceeded its wall-clock budget (usually more than 0.9x the configured limit). |
| `resource_exhaustion` | OOM, disk full, file descriptor exhaustion, rate limit hit, credit balance hit. |
| `subprocess_crash` | Non-zero exit, signal (SIGTERM, SIGKILL, SIGSEGV), core dump. |
| `dependency_failure` | Missing binary, broken `node_modules`, package resolve failure, missing env var. |
| `config_mismatch` | Wrong model name, endpoint, credential or path. |
| `race_condition` | Several writers to the same file or resource within seconds; interleaved git authorship. |
| `scope_mismatch` | Task scope exceeded the executor's budget (turns, time, context, tokens). |
| `skipped_step` | Result text claims steps that did not run (verify through side effects). |
| `silent_fallback` | An error was caught and suppressed; the operation "succeeded" with degraded output. |
| `environmental` | External service down, network flap, DNS issue, expired auth token. |
| `user_input_invalid` | Wrong args, malformed data, missing flag: the human-side mistake. |
| `unknown` | Not enough forensics; note what would be needed to classify it next time. |

The appendices add mode tables for agent dispatch and video runs.

## Phase 3: Capture benchmarks

Optional but valuable. Record numbers when the run produced ones worth remembering; skip for a one-off with nothing generalizable.

- Build or test runtime at a given codebase size.
- Cost per routine operation (tokens, API calls, credits, characters).
- Success rate of an operation across N attempts.
- The "sweet spot" task size that consistently completes under budget.
- Cold-start versus warm-start latency; cache hit rate.

Durable benchmarks go to memory (Phase 5). Ephemeral numbers stay in the AAR file. Derive every number from a command run in this review, never from memory or an earlier report.

## Phase 4: Write the AAR

Stick to this structure:

1. **What happened**: one paragraph, facts only, no interpretation.
2. **What worked**: 3 to 5 concrete items, each with evidence.
3. **What didn't work**: 3 to 5 concrete items, each classified by a Phase 2 mode.
4. **Root cause**: the one or two system or process gaps that explain the failures. If the gap was on the user's side, say so plainly.
5. **Benchmark data**: a table of the metrics captured (omit when there are none).
6. **What the user could have done differently**: honest. "Nothing, the gap was in the system" is a valid answer when true.
7. **Tools, skills or fixes needed**: ranked by payoff, with S/M/L complexity and estimated time.
8. **Action items**: concrete next steps. The top 1 to 3 that deserve to become work go through Phase 6; everything else stays in this document as reference.

## Phase 5: Persist

1. **Save the AAR** to `$AAR_DIR/<project-or-topic>-aar-YYYY-MM-DD.md`. If `$AAR_DIR` is unset, save to `./aar-YYYY-MM-DD.md` and say where it went.
2. **Durable lessons**: if the user keeps a memory system, write at most 2 or 3 lesson entries, each with a **Why:** line and a **How to apply:** line. Update an existing entry instead of duplicating it. If there is no memory system, keep the lessons in the AAR.
3. **Proposals**: run Phase 6 for the strongest action items.

## Phase 6: Judge-gated proposals

The author of an AAR shares the blind spots of the work it reviews, so follow-up work is proposed, never started, and every proposal faces an adversary first.

1. **At most 3 candidates per AAR.** An AAR proposing ten items is summarizing, not prioritizing. Draft each candidate with: title, goal, done-when (an observable test), owner, where the output goes, how to stop it, and scope.
2. **Adversarial judge, mandatory.** One fresh-context reviewer (a subagent, or a second model if available) whose job is to kill each candidate, not grade it. Per candidate, with quoted evidence:
   - **Premise**: does it trace to a confirmed Phase 1 or 2 finding (quote it), or is it speculation?
   - **Class versus instance**: does it fix the failure class or only today's instance?
   - **Duplicate**: does an existing skill, rule, script or open task already own this?
   - **Guards**: are owner, output and stop real values, not placeholders?
   - **Blast radius**: is the stated scope honest about what it touches?
   Verdicts: `PROMOTE`, `PARK` (premise plausible, evidence thin) or `REJECT`. One judge is enough: author plus one adversary is the useful ceiling; stacking more same-model judges adds agreement, not independence. A judge from a different model family is stronger than a same-model one.
3. **REJECT** candidates are not filed. List them with the judge's reason under "Declined proposals" in the AAR so the reasoning survives.
4. **PROMOTE and PARK** candidates go to wherever the user keeps proposed work (a backlog, an issue tracker, a notes file), marked as proposals with the verdict and the judge's reason. Ask before adding them. Do not start, assign or dispatch them.
5. **Aging check.** On the next AAR, list earlier proposals older than seven days with no human decision. A proposal list nobody decides on is not a work queue.

## Anti-patterns

- **An AAR from memory alone.** Gather forensics first. A shallow AAR is worse than none.
- **"The agent or tool was dumb."** The failure mode is usually in the system (budget caps, missing isolation, missing gates), not the executor's reasoning.
- **Unranked action items.** If everything is high priority, nothing is.
- **Duplicate lessons.** Extend the lesson that already exists.
- **Auto-dispatching action items.** AARs often show that the dispatch system itself is the problem; pushing more work through it amplifies the bug.
- **Skipping the judge because a proposal obviously passes.** The obvious ones carry the author's blind spots.
- **Forcing benchmarks** when there is nothing generalizable.

## Example invocation

User: "Let's AAR this run."
1. Ask: "Which scope: a run id, a time window, or this session?"
2. Gather forensics from every applicable Phase 1 source.
3. Classify every failure by a Phase 2 mode.
4. Capture benchmarks if the run produced durable numbers.
5. Write the AAR in the 8-section structure and save it.
6. Write durable lessons if a memory system exists.
7. Draft at most 3 proposals, run the judge, keep the survivors as proposals.
8. Report: the saved AAR path, lessons written, and each candidate's verdict.

## Configuration

| Variable | Purpose | Example |
|---|---|---|
| `$AAR_DIR` | Where AAR markdown is saved | `~/notes/aar` |
| `$ORCHESTRATOR_DB` | Optional: SQLite DB holding agent task state (Appendix A) | `~/projects/your-orchestrator/store/tasks.db` |

---

## Appendix A: Orchestrated agent dispatch runs

When the run is a batch of tasks dispatched to agents by an orchestrator, add these sources to Phase 1.

### Task state (primary source)

```bash
node -e "
const Database = require('better-sqlite3');
const db = new Database(process.env.ORCHESTRATOR_DB, { readonly: true });
// Query by parent task id, or WHERE created_at > <unix_ts>.
// Capture: status, error, result (first 500 chars), runtime (completed_at - claimed_at), agent_id, title.
"
```

### Per-agent task logs and process logs

Whatever task endpoint or log your agents expose (`curl -s http://localhost:<agent_port>/task/<task_id>`, `pm2 logs <agent> --lines 40 --nostream`). Logs often expire after completion; if empty, move on.

### Queue cross-reference

Check that dispatched tasks map back to their queue items and that statuses agree (pending, dispatched, in progress, done).

### Dispatch-specific modes

| Mode | Signature |
|---|---|
| `max_turns` | Error contains "Reached max turns": the turn cap is too low for the task scope. |
| `snapshot_collision` | An automatic snapshot commit landed mid-task, mixing several agents' edits. |
| `dispatch_ok_exec_failed` | The dispatcher succeeded and the executor failed: separates dispatch health from execution health. |
| `no_worktree_isolation` | Parallel tasks shared a working tree and collided. |
| `lost_report` | The agent did the work but its report never arrived; recover from its transcript or its output file. |

### Dispatch benchmarks

Per agent: typical runtime for a single-file task, turn-to-wall-clock ratio, max turns used against the cap, queue-to-claim latency, and the sweet-spot task size.

---

## Appendix B: Video production runs

When the run produced a video (script, voice, avatar, capture, render, mix, upload), add these sources to Phase 1.

### Sources

- **Per-stage records**: whatever the pipeline writes per stage (start, end, exit code, reruns). Order them on one timeline.
- **Spend ledger**: credits and characters per provider, per attempt. Note anything paid twice.
- **Media facts**, measured, never taken from a report:

```bash
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact <file>
ffmpeg -i <final.mp4> -af ebur128 -f null - 2>&1 | tail -12   # integrated loudness
ffmpeg -ss <t> -i <final.mp4> -frames:v 1 frame-<t>.png       # 3 frames: start, middle, end
```

- **Script versus final**: the spoken script against a transcript of the final (local speech-to-text). Dropped, swapped or mispronounced lines show here.
- **Review notes**: the human's verdict on the final and the reasons, in their words.

### Video-specific modes

| Mode | Signature |
|---|---|
| `paid_rerun` | A paid stage (voice, avatar, generated footage) ran again because something upstream changed late. Usually the script or hook was not settled before the first paid stage. |
| `short_footage` | A section's footage was shorter than its narration, so the edit padded, looped or froze, or the build stopped. |
| `sync_drift` | Captions, cues or overlays drift from the voice: cues were timed in seconds instead of anchored to words. |
| `frame_leak` | A price, key, email address, IP address, private name or account picture appeared on screen. |
| `generation_identity_drift` | Generated footage or an avatar changed face, outfit or setting between shots. |
| `audio_mix` | Music fights the voice, loudness is off target, or there is clipping or dead air. |
| `slideshow` | Stills or text cards carry the film where real footage should. |
| `render_resource` | The render ran out of memory or froze the machine (parallel renders, no memory cap). |
| `upload_metadata_drift` | The live title, description, tags or thumbnail no longer match what was checked before upload. |

### Video benchmarks

Cost per finished minute by provider, minutes of footage shot per minute used, render time per minute of output, paid attempts per stage, and the hook length that held.
