---
name: gh-review
description: "Review 1-3 GitHub repos against the current project and generate an HTML report with plain-speak summaries, relevance analysis, and integration examples. Use this skill whenever the user shares a GitHub repo link and wants to understand how it fits their project, asks 'what is this repo?', 'how would I use this?', 'is this relevant to my project?', or says 'review this repo'. Also trigger when the user pastes GitHub URLs and asks for a comparison or breakdown."
---

# gh-review

You are generating a project-specific review of GitHub repositories. The user has shared 1-3 repo URLs and wants to understand what each repo does and how it applies to what they're building -- in plain language, not marketing copy.

## Inputs

The user provides 1-3 GitHub repo URLs. These can be:
- Full URLs: `https://github.com/owner/repo`
- Shorthand: `owner/repo`

Extract the `owner/repo` from whatever format they give you. If they provide more than 3, tell them this skill handles up to 3 at a time and ask which 3 to start with.

## Step 1: Gather project context

Read the current project to understand what the user is building. Check these in order (stop once you have enough context -- you don't need all of them):

1. `CLAUDE.md` in the current directory (best source of project intent)
2. `package.json` or `pyproject.toml` (tech stack + dependencies)
3. Top-level directory listing (project structure)

If the cwd has no project context (e.g., home directory), note this and write the report with general analysis instead of project-specific relevance. Mention in the report that rerunning from inside a project directory would give more targeted results.

## Step 2: Fetch repo data

For each repo, run these two commands:

```bash
gh repo view owner/repo --json name,description,url,stargazerCount,forkCount,licenseInfo,primaryLanguage,repositoryTopics,createdAt,updatedAt,latestRelease --template '{{.name}}|||{{.description}}|||{{.url}}|||{{.stargazerCount}}|||{{.forkCount}}|||{{.licenseInfo.name}}|||{{.primaryLanguage.name}}|||{{range .repositoryTopics}}{{.name}},{{end}}|||{{.createdAt}}|||{{.updatedAt}}|||{{if .latestRelease}}{{.latestRelease.tagName}}{{end}}'
```

```bash
gh api repos/owner/repo/readme --jq '.content' | base64 -d
```

```bash
gh api repos/owner/repo/git/trees/HEAD?recursive=1 --jq '.tree[] | select(.type=="blob") | .path' 2>/dev/null | head -100
```

If a repo is inaccessible (404, private, etc.), don't fail. Record the error and include it in the report as a graceful "Could not access this repo" card.

## Step 3: Analyze and synthesize

For each repo, produce three sections:

### A. Plain-speak summary
Write like you're explaining to a smart colleague who hasn't seen this repo before:
- What it actually does (not the marketing pitch -- what does it *do*?)
- Who it's for (what kind of developer/project benefits)
- Maturity signal: star count, last update, latest release, license
- Tech stack (primary language, key dependencies if visible in the tree)

### B. Relevance to your project
This is the most valuable part. Based on the project context from Step 1:
- Bullet points explaining specifically how this repo connects to what the user is building
- Call out which parts of their project would use it
- Be honest -- if the repo is only tangentially relevant, say so. Don't stretch connections.
- If no project context was found, give general use-case analysis instead

### C. Integration examples
2-3 concrete examples of how the user could integrate this repo:
- Install commands
- Import/usage snippets in the project's language
- A brief workflow description (e.g., "You'd add this as middleware in your FastAPI app")

Keep examples grounded in the user's actual tech stack when project context is available.

## Step 4: Generate the HTML report

Write a single self-contained HTML file. The styling should be:
- Dark mode by default (dark background, light text)
- Clean, readable typography (system fonts, good line height)
- Each repo gets a card-style section
- Code snippets in styled `<pre><code>` blocks
- Responsive layout that works on tablets and desktops

Use this structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>gh-review: Repo Analysis</title>
  <style>
    /* Dark mode, card layout, good typography */
  </style>
</head>
<body>
  <header>
    <h1>GitHub Repo Review</h1>
    <p class="subtitle">Project context: {project name or "General analysis"}</p>
    <p class="meta">Generated {date} -- {N} repos analyzed</p>
  </header>

  <!-- One card per repo -->
  <section class="repo-card">
    <h2>{repo name} <span class="badge">{stars} stars</span></h2>
    <div class="summary">...</div>
    <div class="relevance">...</div>
    <div class="examples">...</div>
  </section>

  <!-- Repeat for each repo -->
</body>
</html>
```

Write the file to `/tmp/gh-review/{timestamp}-report.html` where timestamp is `YYYYMMDD-HHMMSS`.

```bash
mkdir -p /tmp/gh-review
```

## Step 5: Serve and share

Start a simple HTTP server in the background to serve the report:

```bash
# Pick a port in the 8900-8999 range to avoid conflicts
python3 -m http.server 8901 --directory /tmp/gh-review &
```

Then tell the user the URL. The URL format is important -- the user browses from a different device on the LAN:

**ALWAYS use `<host>:<port>/<filename>` -- NEVER use `localhost`.**

Example output to the user:
> Report ready: `http://<host>:8901/20260410-143022-report.html`

If the user wants deeper analysis of a specific repo (reading source files, analyzing specific modules), they can ask as a follow-up. This first pass intentionally stays at README + file-tree level to keep things fast.

## Edge cases

- **Repo not found**: Include an error card in the HTML: "Could not access `owner/repo` -- it may be private or the URL may be incorrect."
- **No README**: Use the repo description and file tree to write the summary. Note that no README was available.
- **No project context**: Write general-purpose analysis. Mention at the top of the report that running from inside a project directory gives more targeted results.
- **gh CLI not authenticated**: If `gh` commands fail with auth errors, tell the user to run `gh auth login` and try again.
