# Kling AI Prompt Engineering — Viral Shorts

Rules extracted from Alexandra Spalato's pipeline. Update this file as you learn what converts.

## Core Formula

```
[CAMERA TYPE] footage of [GIANT/UNEXPECTED SUBJECT] [SPECIFIC ACTION] at [SPECIFIC LOCATION],
[VISUAL QUALITY DESCRIPTOR], [LIGHTING/TIME], [TEXTURE DETAILS]
```

## Camera Types That Convert

- **Security camera / CCTV** — adds authenticity, triggers "is this real?" response
- **Dashcam** — movement + shaky = found footage energy
- **Drone** — scale of creature is more dramatic from above
- **Handheld phone** — "someone filmed this" feel

## What Makes a Hook Frame

The subject MUST be clearly visible in frame 0. Not approaching. Not implied. IN FRAME.
Bad: "a large shadow moving toward the camera"
Good: "a tarantula the size of a car filling the frame"

## Scale Language

Always make the creature absurdly large relative to the environment:
- "the size of a car" / "the size of a school bus"
- "towering over the building" / "its body blocking the exit"
- "each leg the width of a telephone pole"

## Visual Quality Descriptors

- Grainy CCTV quality, timestamp overlay, fluorescent lights
- Low bitrate compression artifacts
- Fish-eye lens distortion (for dome security cams)
- Night vision green tint
- Dashcam watermark with speed/GPS coordinates

## Locations That Work

High-contrast mundane vs. monster:
- Walmart parking lot (night, sodium vapor lights)
- Subway platform (rush hour)
- Drive-thru lane
- Airport terminal
- Supermarket aisle
- School bus stop

## What Doesn't Work

- Generic "forest" or "field" — too expected
- No timestamp/camera overlay — feels like animation, not real
- Subject not visible in first frame — Gemini will flag, pipeline will trim
- Too long a prompt — Kling performs better with focused, specific prompts under 200 words

## Giant Animals Examples

See `examples/giant-animals/` for prompts that produced high-view videos.

## Adding Winning Prompts

After a video performs well (views, engagement), copy its prompt JSON into the relevant examples folder:
```
examples/[theme]/prompt-[description].json
```
