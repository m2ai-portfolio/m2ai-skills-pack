---
name: transaction-history-builder
description: Aggregate completed projects, commits, PRs, shipped features, and explanation artifacts into a running transaction history -- a living portfolio that shows trajectory, not just a static resume. Auto-pulls from GitHub repos, local project directories, and project manifests. Use when the user says "transaction history", "build my portfolio", "aggregate my work", "show my trajectory", "living resume", "proof of work", "what have I shipped", or wants a consolidated view of everything they've built over time.
---

# Transaction History Builder

Aggregates a developer's shipped work into a single, continuously updated "transaction history" -- a living portfolio that replaces the static resume with verifiable evidence of what was built, when, and why. Each entry is a transaction: a concrete artifact with context, not a credential claim.

## Prerequisites

- GitHub CLI (`gh`) authenticated
- Access to local project directories
- Optional: Obsidian vault for explanation artifacts
- Optional: Project manifests (package.json, pyproject.toml, CLAUDE.md) for metadata

## Phase 1: Source Discovery

Identify all sources of shipped work:

### GitHub Repositories
```bash
# List all repos the user has pushed to in the last N months
gh repo list --limit 100 --json name,pushedAt,description,url | \
  python3 -c "import json,sys; [print(f'{r[\"name\"]} | {r[\"pushedAt\"][:10]} | {r[\"description\"] or \"(no description)\"}') for r in sorted(json.loads(sys.stdin.read()), key=lambda x: x['pushedAt'], reverse=True)]"
```

### Local Project Directories
Scan common project locations:
- `~/projects/`
- Any paths the user specifies

For each directory with a `.git` folder, extract:
- Repo name
- Last commit date
- Commit count by the user
- Languages (from file extensions)

### Explanation Artifacts
Scan for existing comprehension artifacts:
- `**/EXPLANATION.md`
- `**/COMPREHENSION-INTERVIEW.md`
- `**/CONTEXT.md`
- `**/docs/context/*.context.md`

Ask the user: "Are there other locations where your work lives? (Deployed URLs, other machines, private repos)"

## Phase 2: Transaction Extraction

For each discovered source, extract a transaction record:

```markdown
### Transaction: <project_name>

**Type**: <new-project | feature | fix | refactor | tool | skill | deployment>
**Date range**: <first_commit> to <last_commit>
**Status**: <active | shipped | archived | abandoned>
**Repo**: <url or local path>

**What was built**: <one paragraph from README, CLAUDE.md, or commit messages>

**Evidence**:
- Commits: <count> over <duration>
- PRs merged: <count>
- Languages: <list>
- Tests: <yes/no, count if yes>
- Deployed: <url if applicable>

**Comprehension layer**:
- Explanation artifact: <path if exists, "MISSING" if not>
- Decision log: <path if exists>
- Architecture docs: <path if exists>

**Key contributions** (from git log):
- <most significant commit message>
- <second most significant>
- <third most significant>
```

### Extracting "What was built"

Priority order for description:
1. README.md first paragraph
2. CLAUDE.md project description
3. package.json/pyproject.toml description field
4. Most common commit message prefix (feat:, fix:, etc.) to infer purpose

### Filtering Noise

Skip transactions that are:
- Forks with zero original commits
- Repos with only an initial commit and no follow-up
- Config-only repos (dotfiles, etc.) unless the user explicitly wants them
- Repos last touched >12 months ago (archive them in a separate section)

## Phase 3: Trajectory Analysis

After extracting all transactions, produce trajectory insights:

```markdown
## Trajectory Summary

**Active period**: <earliest transaction> to <latest>
**Total transactions**: <count>
**Active projects**: <count currently active>

### Technology trajectory
- <language/framework>: <count> projects, <trend: growing/stable/declining>
- ...

### Complexity trajectory
- Average project duration: <N weeks/months>
- Longest sustained project: <name, duration>
- Multi-contributor projects: <count>

### Comprehension coverage
- Projects with explanation artifacts: <X of Y> (<percentage>%)
- Projects with test suites: <X of Y>
- Projects with architecture docs: <X of Y>
- **Comprehension gap**: <list of active projects missing explanation artifacts>

### Shipping cadence
- Transactions per month (last 6 months): <chart or numbers>
- Average time from first commit to "shipped" status: <duration>
```

## Phase 4: Output Formats

Ask the user which format(s) they want:

### Option A: Markdown Portfolio
Write to `~/vault/career/transaction-history.md` (or user-specified path).
Single file, full detail, suitable for Obsidian or GitHub.

### Option B: JSON Index
Write to `~/.transaction-history.json`.
Machine-readable, suitable for static site generators or dashboards.

```json
{
  "generated": "2026-04-20",
  "transactions": [
    {
      "name": "project-name",
      "type": "new-project",
      "date_range": ["2026-01-15", "2026-03-22"],
      "status": "shipped",
      "repo": "https://github.com/user/repo",
      "languages": ["Python", "TypeScript"],
      "commits": 142,
      "has_explanation_artifact": true,
      "has_tests": true,
      "description": "..."
    }
  ],
  "trajectory": { ... }
}
```

### Option C: GitHub Pages Portfolio
Create a minimal static site using the JSON index:
- Create repo `<user>/portfolio` (or specified name)
- Generate `index.html` with transaction cards, trajectory charts
- Deploy to GitHub Pages
- Return the public URL

## Phase 5: Incremental Updates

The transaction history should be updatable, not rebuilt from scratch each time.

On subsequent runs:
1. Read the existing history file
2. Check for new commits, new repos, new artifacts since the last run
3. Append new transactions and update existing ones
4. Re-calculate trajectory analysis
5. Note what changed: "Added 3 new transactions, updated 2 existing"

Store a `last_updated` timestamp in the output file.

## Verification

A good transaction history has:
- [ ] Every active project represented (no gaps from "I forgot about that repo")
- [ ] Each transaction has a concrete description (not "various improvements")
- [ ] Comprehension coverage calculated and gaps flagged
- [ ] Abandoned projects honestly marked as abandoned (not hidden)
- [ ] Trajectory analysis based on actual data, not narrative ("I'm becoming a backend developer" must be backed by transaction counts)

## Source Attribution

Extracted from Nate Kadlac's newsletter digest (2026-04-20) -- "Transactions over Credentials" principle. A transaction history replaces static resumes with verifiable evidence of shipped work. Nate's TalentBoard is the SaaS version; this skill builds a self-hosted, developer-controlled alternative. Idea #4: Transaction History Builder (Portfolio Aggregator).
