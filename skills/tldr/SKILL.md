---
name: tldr
description: Save a summary of this conversation to the vault. Key decisions, things to remember, next actions. Store in the right folder automatically.
---

Summarize this conversation:
1. What was decided or figured out
2. Key things to remember
3. Next actions (if any)

Format as a clean markdown note with today's date in the title.
Save to the most relevant folder based on the topic discussed.
- Client work → clients/[name]/ or projects/[name]/
- Research → research/
- General → daily/ with today's date

Also update memory.md at the vault root with any new patterns or
preferences discovered in this session.

## Vault log.md entry (Karpathy LLM Wiki pattern)

After the daily note is saved, append one entry to `~/vault/log.md` using
this exact format so `grep "^## \\["` produces a clean timeline:

```
## [YYYY-MM-DD] ingest | <short session title>
One-line summary of what happened or what was decided. Link to the full
note using Obsidian wikilink syntax: [[daily/YYYY-MM-DD-topic-slug]].
```

Operation type is almost always `ingest` for /tldr sessions. Use `query`
only if the session was purely asking the vault questions (no new content
filed). Use `lint` only if the session was a health check over existing
vault content.

If the session touched a topic that has a dedicated `~/vault/wiki/<topic>/`
folder, ALSO append the same entry to that topic's `wiki/<topic>/log.md`
and update `wiki/<topic>/index.md` if new entity/concept pages were created.
If no matching topic wiki exists, the vault-root `log.md` entry is sufficient.

## Customization

The vault path defaults to `~/vault/`. If your Obsidian vault lives elsewhere,
adjust the paths above accordingly. You can also add a post-save hook to sync
the summary to an external context store (e.g., Perceptor, a vector DB, or
a Git-backed wiki) by adding a PostToolUse hook that triggers on Write calls
targeting the vault directory.
