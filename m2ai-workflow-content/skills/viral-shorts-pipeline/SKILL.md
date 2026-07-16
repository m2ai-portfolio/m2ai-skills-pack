---
name: viral-shorts-pipeline
description: Generate and publish viral TikTok/YouTube Shorts from a single theme prompt. Produces 10 AI-generated videos (Kling AI), auto-trims dead intros (Gemini frame scan), burns captions, and posts to TikTok + YouTube via Blotato MCP. Use when asked to "make viral videos", "generate TikToks", "create shorts", "run the viral pipeline", or "generate and post videos".
---

# Viral Shorts Pipeline

End-to-end: theme → 10 videos → trimmed → captioned → posted. One command.

## When to Use

Trigger on:
- "make viral videos about X"
- "generate TikToks of [theme]"
- "create shorts"
- "run the viral pipeline"
- "generate and post [N] videos"
- "build me some TikTok content"

## Prerequisites

| Requirement | Status | Notes |
|-------------|--------|-------|
| `kie-cli` | **MUST INSTALL** | [github.com/alexadark/kie-cli](https://github.com/alexadark/kie-cli) — Kling AI + Nano Banana unified CLI |
| `ffmpeg` | **MUST INSTALL** | `sudo apt install ffmpeg` — for trimming and caption burning |
| `KIE_API_KEY` | Needs setup | Kling AI API key — add to `~/.env.shared` |
| `GEMINI_API_KEY` | Likely set | Check `~/.env.shared` as `GOOGLE_API_KEY` |
| Blotato MCP | Needs setup | Install via Blotato dashboard → API → copy setup command → paste in terminal |
| Blotato account | Needs setup | [blotato.com](https://blotato.com) — connect TikTok + YouTube in settings |
| Python + Pillow | Installed | `pip install Pillow` if missing |

**Before running**: verify prerequisites, stop and report any that are missing.

## Phase 1 — Prompt Generation

**Input**: user's theme (e.g., "giant animals", "puppies in tiny spaces")
**Output**: `/tmp/viral-pipeline-[run-id]/prompts/` — 10 JSON prompt files

For each of 10 videos, generate a prompt that defines:
- **Camera POV**: security cam, drone, CCTV, handheld found footage, dashcam
- **Environment**: specific location (subway, parking lot, supermarket, forest path)
- **Subject + action**: the animal/character doing something unexpected
- **Visual style**: photorealistic, low-res grain, timestamp overlay
- **Hook frame**: ensure action or creature is visible within the first 0.5 seconds

Store prompts as `prompt-01.json` through `prompt-10.json`:
```json
{
  "id": "01",
  "theme": "giant animals",
  "prompt": "Security camera footage of a massive tarantula the size of a car crawling across a Walmart parking lot at night, timestamp overlay, grainy CCTV quality, fluorescent lights flickering...",
  "pov": "security-cam",
  "subject": "tarantula",
  "hook": "creature visible in frame 1"
}
```

Reference folder: `skills/viral-shorts-pipeline/reference/` — prompt examples and engineering rules. Read before generating. Add any prompts that produce great results back here.

## Phase 2 — Video Generation (Parallel)

Generate all 10 videos concurrently via kie-cli:

```bash
source ~/.env.shared

OUTPUT_DIR="/tmp/viral-pipeline-[run-id]/videos"
mkdir -p "$OUTPUT_DIR"

# Run all 10 in parallel, wait for completion
for i in $(seq -w 1 10); do
  kie generate \
    --prompt "$(cat prompts/prompt-$i.json | python3 -c 'import json,sys; print(json.load(sys.stdin)["prompt"])')" \
    --model kling-v3 \
    --output "$OUTPUT_DIR/video-$i.mp4" &
done
wait
echo "All 10 videos generated."
```

If kie-cli supports a batch mode, prefer that. Log any failures — retry once before skipping.

## Phase 3 — Frame Scan (Dead Intro Detection)

For each video, use Gemini to detect when the subject first appears in frame:

```python
import google.generativeai as genai
import os, json

genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
model = genai.GenerativeModel("gemini-2.0-flash")

def scan_video(video_path, prompt_subject):
    """Returns trim_seconds: how many seconds to cut from the start."""
    with open(video_path, "rb") as f:
        video_data = f.read()

    response = model.generate_content([
        f"This is a short video. The main subject is: {prompt_subject}. "
        "At what timestamp (in seconds, to 1 decimal) does the subject first clearly appear in frame? "
        "Reply with ONLY a number like 0.0 or 2.3. If subject is visible immediately, reply 0.0.",
        {"mime_type": "video/mp4", "data": video_data}
    ])

    trim_seconds = float(response.text.strip())
    return trim_seconds
```

Save scan results to `/tmp/viral-pipeline-[run-id]/scans/scan-results.json`:
```json
{
  "video-01": {"trim_seconds": 0.0, "subject_detected": true},
  "video-02": {"trim_seconds": 2.3, "subject_detected": true},
  ...
}
```

## Phase 4 — Auto-Trim Dead Intros

For any video where `trim_seconds > 0.3`, trim with ffmpeg:

```bash
for video in videos/video-*.mp4; do
  name=$(basename "$video" .mp4)
  trim=$(jq -r ".\"$name\".trim_seconds" scans/scan-results.json)

  if (( $(echo "$trim > 0.3" | bc -l) )); then
    ffmpeg -ss "$trim" -i "$video" -c copy "trimmed/$name.mp4" -y
    echo "Trimmed $name: removed ${trim}s dead intro"
  else
    cp "$video" "trimmed/$name.mp4"
  fi
done
```

Output: `trimmed/video-01.mp4` through `trimmed/video-10.mp4`

## Phase 5 — Caption Generation + Burn

Generate captions (yellow Impact Bold) and burn into trimmed videos:

**Caption Strategy**: Use the prompt's core action as the caption. Short, punchy, all caps.
- "GIANT SPIDER TAKES OVER WALMART"
- "ENORMOUS SNAKE IN THE SUBWAY"
- Keep to 1-2 lines, max 40 chars per line

```python
from PIL import Image, ImageDraw, ImageFont
import subprocess, os

def create_caption_overlay(text, video_path, output_path, fps=24):
    """Burn yellow Impact Bold caption at bottom of video."""
    # Get video dimensions
    probe = subprocess.check_output([
        'ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_streams', video_path
    ])
    # ... extract width/height from probe output

    # Generate caption frame with Pillow
    img = Image.new('RGBA', (width, 200), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype('/usr/share/fonts/truetype/impact.ttf', 64)
    # Draw text with black outline + yellow fill
    draw.text((x, y), text, font=font, fill=(255, 220, 0), stroke_width=3, stroke_fill=(0, 0, 0))
    img.save('/tmp/caption-overlay.png')

    # Burn into video with ffmpeg
    subprocess.run([
        'ffmpeg', '-i', video_path,
        '-i', '/tmp/caption-overlay.png',
        '-filter_complex', 'overlay=0:H-h-20',
        '-c:a', 'copy', output_path, '-y'
    ])
```

Output: `captioned/video-01.mp4` through `captioned/video-10.mp4`

## Phase 6 — HIL Selection

**Stop here. Show the user what was generated.**

Present a summary table:
```
Generated 10 videos in: /tmp/viral-pipeline-[run-id]/captioned/

Video  | Subject     | Trimmed  | Caption
-------|-------------|----------|----------------------------------
01     | tarantula   | 0.0s     | GIANT SPIDER TAKES OVER WALMART
02     | python      | 2.3s cut | MASSIVE SNAKE IN THE SUBWAY
03     | elephant    | 0.0s     | ELEPHANT CRASHES DRIVE-THRU
...

Which videos do you want to post? (e.g., "post 1 3 5 to TikTok, merge 2 4 for YouTube")
```

Wait for explicit user instruction before proceeding to Phase 7.

## Phase 7 — Assemble + Post via Blotato

**TikTok posting** (stagger 3 hours apart to avoid shadowban):
- Use Blotato MCP to schedule each selected video
- Auto-schedule: first post now, subsequent posts +3h, +6h, etc.

**YouTube Shorts** (if user wants to merge clips):
- Concatenate selected videos with ffmpeg: `ffmpeg -f concat -safe 0 -i filelist.txt -c copy merged.mp4`
- Post merged video as YouTube Short via Blotato MCP
- Set visibility: private initially, let user confirm before going public

**Blotato MCP usage**:
```
# List connected accounts
blotato_list_accounts()

# Upload video to temp URL (required before posting)
blotato_upload_media(file_path="captioned/video-01.mp4")

# Schedule TikTok post
blotato_create_post(
  platform="tiktok",
  media_url="[temp_url]",
  caption="Giant spider takes over Walmart 🕷️ #viral #wildlife #scarycam",
  schedule_time="[ISO datetime]"
)
```

Blotato auto-detects language from captions — if captions are in English, it'll post to the English-language account.

## Phase 8 — Report

Summarize results:
```
Pipeline complete.

Generated: 10 videos
Posted to TikTok: videos 1, 3, 5 — scheduled 3h apart
Posted to YouTube: merged short (videos 2, 4) — private

Output folder: /tmp/viral-pipeline-[run-id]/
Captions burned, dead intros trimmed.

TikTok schedule:
  video-01: [datetime]
  video-03: [datetime +3h]
  video-05: [datetime +6h]
```

## The Named Pattern

**The Dead Intro Kill** — The first frame decides if someone swipes. Gemini scans every video for how many seconds pass before the subject appears. Anything over 0.3s gets trimmed. This pattern applies to any short-form video pipeline, not just AI-generated content.

**The Shadowban Buffer** — TikTok rate-limits and shadowbans accounts that post multiple videos in quick succession. Auto-schedule posts 3h apart to stay under the radar.

## Reference Folder

`/home/user/.claude/skills/viral-shorts-pipeline/reference/`
- `prompt-engineering.md` — rules for writing Kling AI prompts that convert
- `examples/giant-animals/` — prompts that produced high-view videos
- `examples/puppies/` — second template set

Add winning prompts here after each run to improve future generations.

## Source

Alexandra Spalato — "Claude Code Generates 10 TikToks in One Command + post them"
https://www.youtube.com/watch?v=9F9U93GVv34
Channel: Alexandra Spalato | AI Automation
