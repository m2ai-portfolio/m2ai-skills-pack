# Nano Banana Pro Prompting Guide

Reference guide for the Nano Banana Pro prompting methodology. Use this when enhancing user prompts for Gemini image generation.

## Core Philosophy: The "Thinking" Model

Unlike previous models that relied on keyword matching ("tag soup"), Nano Banana Pro is built on a reasoning engine. It understands physics, intent, and composition.

**The Golden Rule:** Talk to it like a Creative Director, not a search engine.

## The Four Pillars of Prompting

### A. Natural Language Over Tags

- **Avoid:** `dog, park, 4k, realistic, sunset`
- **Use:** "A cinematic wide shot of a Golden Retriever sprinting through a sunlit park at golden hour. The low sun casts long shadows on the grass."

### B. Edit, Don't Re-roll

If an image is 80% right, don't generate a new one. Use reference images + natural edit instructions.

- **Technique:** Pass the previous image as a reference and describe what to change.
- **Example:** "That's great, but change the lighting to a moody cyberpunk night scene and make the text neon blue."

### C. Context is King (The "Why")

Give the model context so it can infer artistic decisions (lighting, depth of field, plating).

- **Template:** `[Subject] + [Context/Use Case]`
- **Example:** "Create an image of a sandwich **for a high-end Brazilian gourmet cookbook**." (The model infers professional plating, macro focal length, and dramatic lighting.)

### D. Specificity & Materiality

Define textures and materials to avoid the "plastic AI look."

- **Keywords to use:** `Brushed steel`, `soft velvet`, `crumpled paper`, `matte finish`, `grainy film texture`, `weathered wood`, `hammered copper`, `frosted glass`.

## The Ultimate Prompt Structure

For best results, construct prompts using this sequence:

1. **Subject** — Who/What
2. **Action** — Doing what
3. **Environment** — Where
4. **Lighting/Mood** — Time of day, atmosphere
5. **Technical Specs** — Camera angle, style, texture
6. **Context** — Intended audience/medium

**Master Example:**

> "A hyper-realistic close-up of an astronaut fixing a circuit board **(Subject/Action)** on the surface of Mars **(Environment)**. Harsh sunlight from the right creates deep contrast **(Lighting)**. Shot on 35mm film with visible grain and dust textures **(Technical)**. For a sci-fi documentary promotional poster **(Context)**."

## Progressive Complexity (Model Selection Guide)

Choose the right level of complexity for each prompt:

1. **Text-to-Image** (flash/pro) — Pure creative synthesis. The model generates entirely from its training. Best for abstract, artistic, or fictional subjects.
2. **Web Search Grounding** (grounded + `--search web`) — The model searches the web for factual info before generating. Use when accuracy matters (real events, facts, data).
3. **Image Search Grounding** (grounded + `--search image`) — The model retrieves real photographs from Google Images as visual references. Use for real products, landmarks, people, or brands.
4. **Combined Search + Reference** (grounded + `--search both` + `--reference`) — Full power. Web context + visual references + your own reference images for subject consistency. Use for compositing real people into accurate real-world scenes.

**When to use grounded vs flash/pro:** If the subject exists in the real world and accuracy matters, use grounded. If it's creative/fictional, flash or pro will produce better artistic results without search overhead.

## Advanced Techniques

### Identity Locking (Character Consistency)

Supports up to 14 reference images (6 high-fidelity) to maintain character identity across scenes.

- **Prompt Formula:** "Keep [Person A]'s facial features exactly the same as the reference image, but change [Expression/Action]."
- **Example:** "Design a viral thumbnail using the person from the reference image. Keep facial features identical. Pose them pointing excitedly at a floating hologram."

### Text Rendering & Typography

~94% character accuracy. Works well for logos, posters, and thumbnails.

- **Instruction:** Explicitly state the text content and style.
- **Example:** "A retro 80s movie poster. Title text at the top reads 'NANO NIGHTS' in chrome metallic font with pink neon outlines."

### Layout Control (Sketches & Wireframes)

Upload a rough sketch or wireframe as a reference image to control element placement.

- **Example:** "Generate a high-fidelity UI mockup for a travel app based on this wireframe. Use a clean, airy aesthetic with teal accents."

## Quick Reference: Aspect Ratios & Resolution

| Ratio | Use Case |
|-------|----------|
| 1:1   | Social media profile, product shots |
| 16:9  | YouTube thumbnails, presentations, desktop wallpaper |
| 9:16  | Phone wallpaper, Instagram stories, TikTok |
| 4:3   | Blog posts, traditional photography |
| 3:4   | Portrait photography, Pinterest |

**Resolution:** Native 2K default, 4K available with Pro model.

**Negative Prompts:** Less necessary due to reasoning capabilities, but can be appended for style exclusions (e.g., "no cartoon style").
