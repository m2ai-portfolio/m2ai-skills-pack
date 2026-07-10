---
name: trace-prompt
description: "Reconstruct a sanitized diagnostic trace of the CURRENT prompt exchange only, not the full session, and write it to a markdown file the user can share for support or bug reports. Captures the exact prompt, which model/brain was active (Claude, Codex, Gemini, etc), what tools ran, what happened versus what was expected, and any error text verbatim. Redacts PII before writing anything. Built for ClaudeClaw-OS (CCOS) users hitting model-specific quirks (e.g. Codex-run agents behaving differently than Claude-run ones) who need to hand a support thread something concrete instead of a vague complaint."
when_to_use: "trace this, trace-prompt, something went wrong just now, capture a bug report, diagnostic trace, what just happened, log this exchange for support, weird behavior with codex, weird behavior with a different model"
---

# /trace-prompt

You are capturing a diagnostic trace of the **current exchange only**. Not the user's full session history, not their whole project, just what just happened between the user's last real prompt and your response to it. The output is a single sanitized markdown file the user can hand to a support thread, a GitHub issue, or a coach, without having to explain anything by hand.

This exists because "it has quirks" is not actionable. A trace is.

## When to run this

Trigger when the user says something like "trace this," "trace-prompt," or appends `#trace-prompt` to a message. Also trigger proactively if the user just described something going wrong (a tool call failing, an agent behaving differently than expected, especially when running on a non-Claude brain like Codex or Gemini) and a trace would obviously help, but ask first before writing a file unprompted.

## What to capture

Reconstruct from what is visible in the current conversation, do not go digging through unrelated history or other files unless the user points you at something specific.

1. **The exact prompt(s)** the user just gave you, verbatim, that led to the behavior worth tracing.
2. **Which model or brain was active**, if you can tell (Claude, Codex, Gemini, or otherwise). If you genuinely cannot determine this, say so explicitly in the trace rather than guessing.
3. **What you did in response**: which tools you called, which files you touched, which commands you ran, in order.
4. **What actually happened, versus what the user described as wrong or unexpected.** State both sides plainly, do not editorialize about whose fault it is.
5. **Any error text**, copied verbatim, word for word. Do not summarize or paraphrase an error message, exact text matters for debugging.

## Redaction (mandatory, before writing anything)

Strip the following and replace each with `[REDACTED-<type>]`:

- Personal names, other than generic role labels the user already used publicly (e.g. keep "the GM" or "my client," redact an actual name)
- Email addresses
- Phone numbers
- API keys, tokens, credentials of any kind
- File paths that reveal personal information (home directory usernames, client names, etc), unless the path itself is the bug being reported, in which case redact just the personal segment and keep the structurally relevant part
- Physical addresses

If in doubt about whether something is PII, redact it. A trace that is slightly less specific is fine. A trace that leaks someone's email is not.

## Output

Write the result to `trace-<UTC-timestamp>.md` in the current working directory, using this structure:

```markdown
# Trace: <one-line summary of what was being attempted>

**Timestamp (UTC):** <ISO timestamp>
**Model/brain active:** <Claude | Codex | Gemini | unknown, and why unknown if so>

## Prompt
<the exact prompt(s), verbatim>

## What happened
<tools called, files touched, commands run, in order>

## Expected vs actual
**Expected:** <what the user described wanting>
**Actual:** <what actually happened>

## Error text (if any)
<verbatim, or "none">
```

After writing, tell the user the exact file path so they can immediately share it. Do not summarize the trace back to them in chat, the file is the deliverable.

## Hard rules

- Current exchange only. Do not reconstruct or summarize the user's entire session unless they explicitly ask for that instead.
- Redact before you write, never write first and clean up after.
- Verbatim error text, never paraphrased.
- No em dashes anywhere in the output file.
- If you cannot determine which model/brain was active, say so plainly rather than guessing, a wrong guess here defeats the whole point of the trace.
