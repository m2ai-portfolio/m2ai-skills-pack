---
name: banana-maker
description: Generate images using the Gemini image generation API with the Nano Banana Pro prompting methodology. Use when the user asks to generate, create, or make an image, picture, photo, illustration, or visual.
argument-hint: "PROMPT" [--model flash|pro|grounded] [--aspect-ratio AR] [--size SIZE] [--reference PATH]
---

# Banana Maker — Gemini Image Generation

## When to Use

Activate this skill when the user asks to:
- Generate, create, or make an image / picture / photo / illustration
- Visualize a concept, scene, or idea as an image
- Edit or modify an existing image (with reference images)
- Create thumbnails, posters, logos, or any visual content

## Workflow

### 1. Capture the User's Idea
Take the user's description or prompt as input. It can be a quick idea or a detailed description.

### 2. Ask for Model Choice
Present these options:
- **Flash** — Nano Banana 2 (`gemini-3.1-flash-image-preview`). Fast, cost-effective. Supports 512 to 4K, controllable thinking, new ultra-wide aspect ratios. Good for iteration and quick concepts.
- **Pro** — Nano Banana Pro (`gemini-3-pro-image-preview`). Advanced reasoning ("Thinking"), high-fidelity text rendering. Best for final output and detailed work. 1K-4K.
- **Grounded** — Same Flash 3.1 model + search tools. The model can search the web and Google Images for real visual references before generating. Best for real people, real products, specific brands, real places, or anything where factual accuracy matters.

### 3. Enhance the Prompt (Recommended)
Read the prompting guide at `~/.claude/skills/banana-maker/prompting-guide.md` and apply the Nano Banana Pro methodology to enhance the user's idea into a detailed, high-quality prompt. Claude does this enhancement directly -- no extra API call needed.

**Apply the Ultimate Prompt Structure:**
1. **Subject** -- Who/What
2. **Action** -- Doing what
3. **Environment** -- Where
4. **Lighting/Mood** -- Time of day, atmosphere
5. **Technical Specs** -- Camera angle, style, texture, materiality
6. **Context** -- Intended audience/medium (this helps the model infer artistic decisions)

**Key principles:**
- Write in natural language, not tag soup
- Add materiality keywords to avoid the "plastic AI look" (brushed steel, soft velvet, matte finish, grainy film texture)
- Give context/purpose so the model can infer artistic decisions

Show the enhanced prompt to the user before generating.

### 4. Generate the Image
Run the script using the banana-maker venv:

```bash
~/.claude/skills/banana-maker/venv/bin/python ~/.claude/skills/banana-maker/generate_image.py "THE ENHANCED PROMPT" --model MODEL_CHOICE [OPTIONS]
```

### 5. Report Results
- Show the output file path
- Since Matthew browses from his Surface tablet, provide: `http://<host>:PORT/filename` if a file server is running, otherwise just the file path

## Script Usage Reference

```
generate_image.py PROMPT --model MODEL [OPTIONS]

Positional:
  prompt                  The image generation prompt

Required:
  --model, -m             flash | pro | grounded

Options:
  --output, -o PATH       Output file path (default: output/generated_TIMESTAMP.png)
  --aspect-ratio, -a AR   1:1 | 16:9 | 9:16 | 4:3 | 3:4 | 1:4 | 4:1 | 1:8 | 8:1 (default: 1:1)
  --size, -s SIZE         512 | 1K | 2K | 4K (default: 2K, 512 is Flash 3.1 only)
  --reference, -r PATH    Reference image path(s), can specify multiple times (max 14)
  --search SEARCH         web | image | both (requires --model grounded)
  --thinking, -t LEVEL    minimal | high (Flash 3.1 thinking control, flash/grounded only)
```

## Model Mapping

| Flag | Model ID | Notes |
|------|----------|-------|
| `flash` | `gemini-3.1-flash-image-preview` | Nano Banana 2: fast, 512-4K, thinking control |
| `pro` | `gemini-3-pro-image-preview` | Nano Banana Pro: advanced reasoning, 1K-4K |
| `grounded` | `gemini-3.1-flash-image-preview` | Flash 3.1 + search tools (Nano Banana 2) |

## Reference Images

For identity locking, style transfer, or image editing, pass reference images:

```bash
~/.claude/skills/banana-maker/venv/bin/python ~/.claude/skills/banana-maker/generate_image.py \
  "Transform this photo into a watercolor painting" \
  --model flash \
  --reference photo.jpg
```

Supports up to 14 reference images (10 objects + 4 characters for Flash 3.1).

## Examples

**Simple generation:**
```bash
~/.claude/skills/banana-maker/venv/bin/python ~/.claude/skills/banana-maker/generate_image.py \
  "A hyper-realistic close-up of an astronaut fixing a circuit board on Mars. Harsh sunlight from the right creates deep contrast. Shot on 35mm film with visible grain. For a sci-fi documentary poster." \
  --model pro --aspect-ratio 16:9
```

**With reference image:**
```bash
~/.claude/skills/banana-maker/venv/bin/python ~/.claude/skills/banana-maker/generate_image.py \
  "Keep this person's facial features identical but place them in a cyberpunk city at night" \
  --model pro --reference portrait.jpg
```

**With search grounding (real-world accuracy):**
```bash
~/.claude/skills/banana-maker/venv/bin/python ~/.claude/skills/banana-maker/generate_image.py \
  "The Sydney Opera House at sunset with a dramatic storm approaching from the west" \
  --model grounded --search both --aspect-ratio 16:9
```

**Fast low-res iteration with thinking:**
```bash
~/.claude/skills/banana-maker/venv/bin/python ~/.claude/skills/banana-maker/generate_image.py \
  "A minimalist logo for a coffee brand called 'Dark Roast Labs'" \
  --model flash --size 512 --thinking high
```

**Ultra-wide panoramic:**
```bash
~/.claude/skills/banana-maker/venv/bin/python ~/.claude/skills/banana-maker/generate_image.py \
  "A sweeping desert landscape at golden hour, endless sand dunes under dramatic cloud formations" \
  --model flash --aspect-ratio 8:1 --size 4K
```
