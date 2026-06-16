# Rule: Shell and Command Safety

Loaded when a shell command, curl call, or file operation fails or is about to
run in a way that could cause data loss or silent corruption.

---

## curl and HTTP calls

- Special characters in payloads (brackets, pipes, $, >, #) break shell interpolation silently.
  Always use `--data-raw` or pass the payload via heredoc.
- Multi-step API calls that depend on a token from a prior call: re-authenticate in
  the same subshell. Do not store tokens in variables across separate commands.
- Always check the HTTP status code, not just whether the command exited 0.

---

## crontab edits

NEVER pipe a transform directly into `crontab -`.
If the transform errors, it emits empty stdout and `crontab -` silently wipes every job.

Safe pattern:
1. `crontab -l > /tmp/crontab.edit`
2. Edit `/tmp/crontab.edit` (use Python for anything non-trivial)
3. Verify line count and active job count
4. `crontab /tmp/crontab.edit`

Always snapshot first: `crontab -l > /tmp/crontab.backup.$(date +%Y%m%d-%H%M%S)`

---

## Destructive operations

Before `rm -rf` of any directory, check three things:
1. Untracked on-disk data — gitignored files (databases, stores, workspace/) are not
   in git and vanish with the directory.
2. Whether a backup exists and is current.
3. PATH CONSUMERS — crons, skills, CLAUDE.md, settings files that reference this path.

Ask before running. Even if the user seems to want speed.

---

## Environment files

- Never create scattered `.env` files. All API keys go in `~/.env.shared` (or equivalent).
- A bare `.env` line in `.gitignore` does NOT match `.env.bak` or `.env.*` backups.
  Use `.env.*` and `*.bak` patterns explicitly.
- Never read API keys back to the user in terminal output. Check for presence only.

---

## cd in scripts

`cd` in a Bash tool call leaks into subsequent calls. Use absolute paths or the
subshell pattern: `(cd /path && command)`.
