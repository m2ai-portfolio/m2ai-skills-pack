---
name: decomposition-scorer
description: >
  Score whether a set of coding tasks are properly decomposed on boundaries of isolation.
  Detects conflicts where parallel agents would touch the same files, share state, or have
  ordering dependencies. Use before launching parallel agent workers, when planning task
  breakdown for yce-harness or similar, or when someone says "will these tasks conflict?",
  "score my decomposition", or "/decomposition-scorer".
---

# Decomposition Quality Scorer

Evaluates whether planned agent tasks are decomposed on proper "boundaries of isolation" -- the governing principle for coding harness architectures. Catches conflicts before they waste tokens and time.

## Conflict Dimensions

| Dimension | What It Checks | Risk Level |
|---|---|---|
| **File overlap** | Do two tasks modify the same file? | HIGH -- guaranteed merge conflicts |
| **Shared state** | Do tasks read/write the same DB tables, config, or global state? | HIGH -- race conditions |
| **Import chains** | Does task A create something task B imports? | MEDIUM -- ordering dependency |
| **Test coupling** | Do tasks share test fixtures or test databases? | MEDIUM -- flaky parallel tests |
| **Schema drift** | Do tasks independently modify schemas, APIs, or contracts? | HIGH -- silent breakage |

## Phases

### Phase 1: Gather Task List
Accept a list of planned tasks. Each task needs:
- **Label**: Short name (e.g., "Add auth middleware")
- **Files touched**: Which files will be created or modified
- **Inputs**: What the task reads (APIs, DB tables, config, other module exports)
- **Outputs**: What the task produces (new files, DB changes, API endpoints, exports)

If the user provides rough descriptions without file lists, infer likely files from the codebase context.

### Phase 2: Build Conflict Matrix
For each pair of tasks, check all five conflict dimensions. Build an N x N matrix where each cell contains:
- GREEN: No conflicts detected
- YELLOW: Potential indirect conflict (shared dependency, adjacent files)
- RED: Direct conflict (same file, same state, hard ordering dependency)

### Phase 3: Score
Calculate an overall decomposition score:

| Score | Meaning | Action |
|---|---|---|
| **9-10** | Clean isolation. Safe for parallel execution. | Ship it |
| **7-8** | Minor overlaps. Parallel is fine with careful ordering. | Note the ordering constraints |
| **4-6** | Significant conflicts. Parallel will cause merge pain. | Re-decompose before launching |
| **1-3** | Tasks are deeply entangled. Not decomposed at all. | Rethink the task breakdown entirely |

### Phase 4: Output Report
```
DECOMPOSITION SCORE: X/10

TASK PAIRS WITH CONFLICTS:
- [Task A] x [Task B]: [dimension] -- [specific conflict]
- ...

RECOMMENDED EXECUTION ORDER:
1. [Tasks that can run in parallel] (group 1)
2. [Tasks that depend on group 1] (group 2)
...

RE-DECOMPOSITION SUGGESTIONS:
- [If score < 7, suggest how to split/merge tasks to improve isolation]
```

## Verification
- Every task pair is checked (no pairs skipped)
- Score reflects the worst conflict, not the average
- Execution order respects all identified ordering dependencies
- Re-decomposition suggestions are concrete (name which tasks to split/merge and how)

## Integration with yce-harness
When used in the context of yce-harness parallel mode:
- Map tasks to git worktree branches
- Flag any task that modifies `package.json`, `pyproject.toml`, or migration files -- these always conflict in parallel
- Suggest worktree-safe decomposition patterns (feature slices over layer slices)

## Source
Nate Kadlac, "There are 4 kinds of agents and you're probably using the wrong one", natesnewsletter.substack.com, 2026-03-25. Governing principle: decomposition boundaries for coding harness architectures.
