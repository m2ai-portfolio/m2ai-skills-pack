---
name: agent-doctor
description: Run a comprehensive health check on all connected services, API credentials, MCP servers, tools, and external dependencies. Validates that everything the agent needs is reachable and authenticated before the user hits a failure. Use as a startup diagnostic or on-demand when things feel broken.
---

# Agent /doctor Health Check

Validates every external dependency, API credential, MCP server, and tool the current agent relies on. Catches failures before the user hits them.

## Trigger

Use when the user says "/doctor", "health check", "check my connections", "is everything working", "diagnose my setup", "why isn't X working", "validate my environment", or at the start of a session when reliability matters.

## Phase 1: Discover Dependencies

Scan the current environment to build a dependency manifest:

### 1. API Credentials
Check `~/.env.shared` (and any local `.env`) for known API key patterns:

| Key Pattern | Service |
|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic / Claude API |
| `GOOGLE_API_KEY` or `GEMINI_API_KEY` | Google / Gemini |
| `OPENAI_API_KEY` | OpenAI |
| `OPENROUTER_API_KEY` | OpenRouter |
| `GITHUB_TOKEN` | GitHub |
| `PORTAINER_USER` / `PORTAINER_PASS` | the container manager |
| `RAILWAY_TOKEN` | Railway |
| `RESEND_API_KEY` | Resend (email) |
| `SLACK_*` | Slack |
| `NOTION_*` | Notion |
| `FIRECRAWL_API_KEY` | Firecrawl |
| `SUPABASE_*` | Supabase |
| `LATE_API_KEY` | Late (social media) |

For each found key: verify it's non-empty and not a placeholder.

### 2. MCP Servers
Check Claude Code's MCP configuration for registered servers. For each:
- Is the server process running?
- Can we list tools from it?

### 3. SSH Connections
Check configured SSH hosts from `~/.ssh/config`:
- `gaming-pc` (AlienPC)
- `nas` (Asustor NAS)
- `surface` (Surface tablet)

For each: attempt a quick connection test (`ssh <host> echo ok` or equivalent).

### 4. External Services
Check reachability of known service URLs:
- the container manager: `https://<host>:19943`
- n8n: `http://<host>:5678`
- Any project-specific endpoints

### 5. Local Tools
Verify key CLI tools are installed and accessible:
- `git`, `gh` (GitHub CLI)
- `node`, `npm`
- `python3`, `pip`
- `rclone` (Google Drive)
- `yt-dlp` (YouTube)
- `ffmpeg`
- `sqlite3`

## Phase 2: Run Health Checks

For each dependency, run a lightweight validation:

**API Keys** -- make a minimal API call (list models, get profile, etc.) to confirm auth works. Do NOT make billable calls -- use free/info endpoints only.

**SSH Hosts** -- `ssh -o ConnectTimeout=5 <host> echo ok 2>&1`. Interpret: success, timeout (host off), refused (host up but SSH down), or key failure.

**HTTP Services** -- `curl -sk -o /dev/null -w '%{http_code}' <url>`. Interpret: 200/302 = healthy, 401 = auth issue, timeout = unreachable.

**CLI Tools** -- `which <tool> && <tool> --version 2>&1 | head -1`. Interpret: found + version = healthy, not found = missing.

**MCP Servers** -- check if server process is running and responsive.

## Phase 3: Report

Output a single compact diagnostic:

```
Agent Health Check
==================
Date: YYYY-MM-DD HH:MM

API Credentials
  Anthropic       [OK] claude-sonnet-4-20250514 accessible
  Google/Gemini   [OK] key valid
  GitHub          [OK] authenticated as <user>
  the container manager       [OK] token acquired
  OpenRouter      [WARN] key present but untested
  Firecrawl       [FAIL] key empty or missing

SSH Connections
  gaming-pc       [OK] Windows cmd.exe responding
  nas             [OK] BusyBox Linux responding
  surface         [FAIL] timeout -- likely asleep

HTTP Services
  the container manager API   [OK] https://<host>:19943 (200)
  n8n             [OK] http://<host>:5678 (200)

MCP Servers
  google-calendar [OK] 5 tools registered
  Gmail           [OK] 8 tools registered
  Notion          [OK] 12 tools registered
  Perceptor       [WARN] server not running

CLI Tools
  git 2.43.0      [OK]
  gh 2.45.0       [OK]
  node 20.11.0    [OK]
  python3 3.12.3  [OK]
  rclone 1.65.0   [OK]
  ffmpeg          [FAIL] not installed

Summary: 15/18 healthy | 2 warnings | 1 failure
```

## Phase 4: Remediation Suggestions

For each FAIL or WARN, provide a one-line fix:

```
Fixes needed:
  - Firecrawl: Add FIRECRAWL_API_KEY to ~/.env.shared
  - surface: Machine likely asleep -- wake via network or ignore
  - ffmpeg: sudo apt install ffmpeg
```

## Phase 5: Store Results (Optional)

If the user wants to track health over time:
```bash
echo "$(date -I),$(echo $RESULT_SUMMARY)" >> ~/.claude/doctor-log.csv
```

## Scope Control

This skill checks what's available in the current environment. It does NOT:
- Make paid API calls to verify credits/billing
- Modify any configuration
- Install missing dependencies (only suggests how)
- Store credentials or tokens

## Source Attribution

Technique derived from Nate's Newsletter (2026-04-03): "Your Agent Is 80% Plumbing" -- the /doctor health check as one of 12 core infrastructure primitives, validating API credentials, external connections, config integrity, tool availability, and resource health at startup and on demand.
