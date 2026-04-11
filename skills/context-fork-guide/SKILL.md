---
name: context-fork-guide
description: Use when creating or modifying skills that do heavy research, search, or multi-tool work. Adds context:fork to isolate skill execution in a separate context window, keeping the main session clean. Trigger on "keep context clean", "skill is bloating my context", "run this in a separate window", or when building any research/search skill.
---

# Context Fork Guide — Isolate Heavy Skills

When building skills that perform heavy operations (vault search, codebase exploration,
multi-file analysis, research), add `context: fork` to the frontmatter. This runs the
skill in a separate context window so only the final summary returns to your main session.

## When to Fork

Fork when the skill will:
- Read more than 5 files
- Run multiple searches or grep operations
- Pull external data (web, API, database)
- Perform exploratory work where dead-ends are expected

Do NOT fork when:
- The skill modifies files in the current project (needs main context)
- The skill is conversational (needs prior chat history)
- The output is a single lookup (overhead not worth it)

## How to Apply

Add one line to any SKILL.md frontmatter:

```yaml
---
name: your-skill-name
description: Your skill description
context: fork
---
```

That's it. The skill now runs in an isolated context window.

## The Pattern: Research Skill with Fork

```yaml
---
name: deep-research
description: Search vault, codebase, and web for context on a topic.
context: fork
---
```

```markdown
# Deep Research

1. Search Obsidian vault for notes matching the topic
2. Grep the codebase for related code patterns
3. Web search for current best practices
4. Return a structured summary:
   - Key findings (bullet points)
   - Relevant file paths
   - Recommended next steps

Output ONLY the summary. All intermediate search results stay in the forked context.
```

## Verification

After adding `context: fork` to a skill:
1. Run `/context` to check token count before invoking the skill
2. Invoke the skill
3. Run `/context` again — token increase should be minimal (summary only)
4. Compare with running the same skill without the fork line

## Existing Skills to Consider Forking

Review /home/apexaipc/.claude/skills/ for skills that do heavy search or research.
Candidates: any skill that reads multiple files, runs searches, or pulls external data.
Add `context: fork` to their frontmatter and test.

## Source

Extracted from: [3 Claude Code Features You'll Wish You Knew Sooner](https://www.youtube.com/watch?v=iALzJyvgCoM) by Mark Kashef (AI Automation Society), March 19, 2026.
