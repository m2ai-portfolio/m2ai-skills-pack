---
name: context-hygiene
description: Reference for Claude Code context management. Use /by-the-way for side questions, /fork for path exploration, and context:fork in skills for isolated execution. Trigger on "context is getting large", "session feels slow", "Claude forgot what we were doing", "how do I manage context".
---

# Context Hygiene — 3 Shields

Three techniques for keeping Claude Code sessions focused and performant.
Use these proactively — context bloat is gradual and invisible until quality degrades.

## Shield 1: /by-the-way (Side Questions)

For quick lookups that don't deserve main context space:
- "What was that Calendly link?"
- "How many slides in the last deck?"
- "What's the standard meeting length?"

Usage: Type `/by-the-way` then your question. Answer returns without polluting
the main conversation thread.

Best for: Static data retrieval, FAQ-style questions, quick lookups from CLAUDE.md
or project files.

## Shield 2: /fork (Path Exploration)

When you want to try a different approach without risking your current progress:
- "Let me try a completely different design"
- "What if we used a different tech stack?"
- "Create version 2 from scratch"

Usage: Type `/fork` — creates a new conversation branch with full history.
Returns a resume command to get back to the original conversation.

Best for: A/B testing approaches, exploring risky changes, version comparison.

Pro tip: Run multiple forks in parallel terminal sessions for simultaneous exploration.

## Shield 3: context: fork (Skill Isolation)

Add `context: fork` to any SKILL.md frontmatter to run heavy skills in an
isolated context window. See the context-fork-guide skill for full details.

## When Context Gets Large

Signs your context is bloated:
- Slower responses
- Claude "forgets" earlier decisions
- Suggestions become less relevant

Recovery:
1. `/fork` to start fresh with history preserved
2. `/compact` to summarize and compress context
3. For future sessions: apply `context: fork` to heavy skills proactively

## Context Budget Rule of Thumb

- Light session (single file edits, Q&A): 50K-100K tokens, no shields needed
- Medium session (multi-file feature work): 100K-300K tokens, use /by-the-way for side queries
- Heavy session (research + build): 300K+, fork skills and /fork for exploration branches

## Source

Extracted from: [3 Claude Code Features You'll Wish You Knew Sooner](https://www.youtube.com/watch?v=iALzJyvgCoM) by Mark Kashef (AI Automation Society), March 19, 2026.
