---
name: claude-design-to-code
description: Rapidly prototype UI wireframes and high-fidelity designs with Claude Design, then export to Claude Code with a single terminal command that preserves full design fidelity. Covers self-verification loops, mode switching (cinematic/editorial/responsive), Figma import, and bias-breaking prompting patterns. Use when saying "design to code", "wireframe to code", "prototype in Claude Design", "export Claude Design", or "Claude Design handoff".
---

# Claude Design to Claude Code Handoff

Use Claude Design to go from idea → high-fidelity prototype → working local code without writing a single follow-up prompt.

## Prerequisites

- Access to Claude Design (available via the palette icon inside claude.ai)
- Claude Code installed locally
- Node/npm for running the exported local dev server

## Phase 1: Access Claude Design

1. Open claude.ai in a browser.
2. Click the **palette icon** in the toolbar (not the same as the standard chat interface).
3. Choose your starting point:
   - **Prompt** — describe the UI from scratch
   - **Wireframe** — generate low-fidelity structure first, then iterate
   - **Import** — paste a Figma file URL, GitHub repo URL, or design system definition

## Phase 2: Generate the Initial Design

Write a single detailed prompt covering:
- Page type (landing page, dashboard, slide deck, mobile app screen)
- Content intent (what is the user trying to do on this page)
- Tone and style (editorial, corporate, cinematic, minimal)
- Any constraints (color palette, font, accessibility level)

**Bias-breaking pattern**: Instead of letting Claude Design make all decisions autonomously, start with:

> Before generating, ask me 3 clarifying questions about this design.

This breaks Claude Design's tendency to default to its stylistic preferences. Answer the questions, then let it generate.

## Phase 3: Iterate with Tweaks

Claude Design offers three editing layers — use them in order from coarse to fine:

1. **Mode switching** (coarsest): Switch between `cinematic`, `editorial`, and `responsive` modes to change the overall layout approach. Do this before detailed edits.

2. **Tweaks panel**: Natural-language refinements ("make the hero section taller", "change the font to something more editorial"). Each tweak is atomic and undoable.

3. **Draw mode** (finest): Click-drag to select specific elements and give pinpoint instructions. Use for precise spacing, color, or component-level changes.

**Self-verification loop**: Claude Design runs its own overlap/alignment checks. When it flags an issue, accept the correction before proceeding — this prevents compounding layout drift.

## Phase 4: Mobile and Scroll-Driven Pages

- Toggle between desktop and mobile views using the viewport control (top toolbar).
- For scroll-driven pages: enable the scroll animation layer and set triggers per section.
- Cinematic mode produces parallax-heavy, motion-forward layouts. Editorial mode is text-forward with generous whitespace.
- Switch modes in real time — the design reflows without losing content.

## Phase 5: Export to Claude Code

When the design is ready:

1. Click **Export** (top right) → select **Claude Code**.
2. Claude Design generates a terminal command — copy it.
3. In your local terminal, paste and run the command:

```bash
# The exported command looks approximately like this:
npx claude-design pull <session-id> --output ./my-design
cd my-design && npm install && npm run dev
```

4. Open `http://localhost:3000` (or the port shown) — the design renders locally with full fidelity.
5. From this point, treat it as a standard Claude Code project: add databases, microservices, APIs, or continue iterating on the frontend.

## Phase 6: Team Sharing

- Use the **Share** button to generate a review link (view + comment access).
- Comments are threaded per element — reviewers can click a component and leave feedback.
- Approved designs can be re-imported into Claude Design for another iteration cycle.

## Known Biases to Prompt Around

Claude Design has observable stylistic defaults:
- Prefers large hero images with centered text
- Defaults to sans-serif body fonts
- Tends toward generous padding (may feel empty on content-heavy pages)
- Slide decks default to a dark background with bold headlines

To override: be explicit in the prompt ("use a tight grid", "no hero image, lead with a data table", "light background, dense information layout").

## When to Use Each Approach

| Scenario | Approach |
|----------|----------|
| New page from scratch | Start with prompt + bias-breaking questions |
| Existing design to modernize | Import Figma or GitHub URL |
| Slide deck | Single prompt → tweak font/colors |
| Mobile-first | Generate desktop, then toggle mobile and fix |
| Hand off to engineer | Export to Claude Code, commit result |

## Source Attribution

Technique from Mark Kashef: "Claude Design Just Shook Up the Design Industry" (2026-04-17)
https://www.youtube.com/watch?v=TJRsTwi1McI
