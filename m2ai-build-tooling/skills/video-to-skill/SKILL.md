---
name: video-to-skill
description: Create Claude Code skills from screen recordings of manual processes. Records tacit knowledge by sending screen capture video to Gemini video understanding API, extracting a comprehensive SOP, then converting that SOP into a production skill via skill-creator. Use when the user says "record to skill", "video to skill", "screen record skill", "extract skill from video", "SOP from recording", or wants to capture a manual workflow as an automated skill.
---

# Video-to-Skill — Screen Recording to Automated Skill Pipeline

Turn a screen recording of any manual process into a fully structured Claude Code skill.
This captures tacit knowledge (cursor movements, under-breath commentary, style preferences,
iteration patterns) that written prompts miss.

## Prerequisites

- `gemini-api-dev` skill installed globally
- Gemini API key in `~/.env.shared` as `GOOGLE_API_KEY`
- `skill-creator` skill available (for final skill generation)
- Screen recording software (Loom, OBS, native OS recorder)
- `ffmpeg` or Python video compression available (for large recordings)

## Phase 1: Video Preparation

1. User provides a screen recording file (MP4, WebM, MOV).
2. Check file size. If over 50MB, compress before upload:

```bash
python3 -c "
import subprocess, sys, os
inp = sys.argv[1]
out = os.path.splitext(inp)[0] + '_compressed.mp4'
subprocess.run([
    'ffmpeg', '-i', inp, '-vcodec', 'libx264', '-crf', '28',
    '-preset', 'fast', '-vf', 'scale=-2:720', '-an', out
], check=True)
print(f'Compressed: {os.path.getsize(out) / 1e6:.1f}MB')
" /path/to/video.mp4
```

3. Confirm the compressed file is under 50MB. If still too large, increase CRF or reduce resolution.

## Phase 2: SOP Extraction via Gemini

Send the video to the Gemini video understanding API using the `gemini-api-dev` skill.

**Prompt to use for extraction:**

> Take this screen recording and produce the most comprehensive, detailed SOP of the
> entire process you see me walk through. Account for:
> - Every step taken, including navigation and UI interactions
> - All spoken commentary, especially offhand remarks and under-breath observations
> - Style preferences expressed (what the user likes/dislikes and why)
> - Iteration patterns (what was changed, how many times, what triggered changes)
> - External references visited (websites, examples, inspiration sources)
> - Decision points where the user chose one option over another and why
> - Any tacit knowledge that wouldn't normally be written down
>
> Structure the SOP as numbered phases with sub-steps. Flag "tacit knowledge nuggets"
> separately at the end.

Save the extracted SOP to a working directory (e.g., `/tmp/video-to-skill/sop-{name}.md`).

## Phase 3: SOP Review (Human-in-the-Loop)

Present the extracted SOP summary to the user. Ask:

- Does this accurately capture your process?
- Any steps missing or misinterpreted?
- Any tacit knowledge nuggets that are wrong or need emphasis?

Incorporate feedback before proceeding.

## Phase 4: Skill Generation

Invoke the `skill-creator` skill with the reviewed SOP as input.

**Key instructions for skill-creator:**

- Use the SOP as the ground truth for the skill's phases
- Preserve all tacit knowledge as explicit rules or preferences in the skill
- Add `AskUserQuestion` checkpoints at decision points identified in the SOP (minimal HIL)
- Include source attribution in the skill frontmatter
- Style preferences from the SOP become hard rules in the skill, not suggestions

## Phase 5: Validation

1. Read the generated SKILL.md
2. Verify all SOP phases are represented
3. Verify tacit knowledge nuggets are encoded as rules
4. Use `claude-code-guide` agent to validate skill structure
5. Test invocation in a fresh session

## Cost Management

| Recording Length | Estimated Gemini Cost | Tip |
|-----------------|----------------------|-----|
| Under 5 min | < $0.05 | Send as-is |
| 5-15 min | $0.05-0.20 | Compress to 720p |
| 15-40 min | $0.20-0.80 | Compress aggressively (CRF 30+, 480p) |
| Over 40 min | $0.80+ | Split into segments or compress hard |

## When NOT to Use This

- Process is purely text-based with no visual/UI component (just write the skill directly)
- Recording is mostly idle time or waiting (trim first)
- The task is a one-off that won't be repeated

## Source Attribution

Technique from Mark Kashef: "You've Never Made a Claude Code Skill Like This" (2026-03-23)
https://www.youtube.com/watch?v=hTWxGSsGDZU
