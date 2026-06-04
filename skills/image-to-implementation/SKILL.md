---
name: image-to-implementation
description: Generate a visual reference image for a UI or design concept, then produce a structured implementation prompt that hands the image to a code-capable model. Closes the "AI invents bad taste" failure mode by anchoring implementation to a concrete visual rather than a text description alone.
---

# Image to Implementation

A two-phase workflow: first generate a reference image that captures the intended design, then produce an implementation prompt that pairs the image with acceptance criteria and technical constraints. The reference image acts as a visual contract — the implementation model cannot invent aesthetics when it has a concrete target to match.

## Trigger

Use when the user says "/image-to-implementation", "build a UI from a design", "implement from a visual", "generate then implement", "I want the AI to match a design", or when implementing frontend components where visual taste matters and "make it look good" is not a sufficient spec.

## Phase 1: Design Intake

Ask the user:
1. **What is the component or page?** (e.g., "a pricing table", "a dashboard header", "a login form")
2. **What is the visual style?** (e.g., "minimal, white background, sans-serif", "dark mode, neon accent, brutalist grid")
3. **What are the key UI elements?** (e.g., "three pricing tiers, a toggle for monthly/annual, a CTA button per tier")
4. **What tech stack will the implementation use?** (e.g., "React + Tailwind", "plain HTML/CSS", "Next.js + shadcn/ui")

If the user already has a reference image, skip to Phase 3.

## Phase 2: Generate the Reference Image

Construct an image generation prompt from the intake answers using this pattern:

```
{Component name}, {visual style}, {key elements listed}, clean UI design, high fidelity mockup, white background, no lorem ipsum, no browser chrome
```

Then generate the image using the available image generation tool (invoke whatever image tool is configured in this session). Save the image to `./reference-{component-name}.png` or the path the user specifies.

Confirm the image with the user before proceeding. Ask: "Does this reference match your intent? If not, describe what to change and I'll regenerate."

## Phase 3: Generate the Implementation Prompt

Produce a complete implementation prompt structured as follows:

```
TASK: Implement {component name} to match the attached reference image.

REFERENCE IMAGE: {path or description of the image}

TECH STACK: {framework, CSS approach, component library if any}

REQUIRED ELEMENTS:
  - {element 1 from intake}
  - {element 2 from intake}
  - {element 3 from intake}

VISUAL FIDELITY REQUIREMENTS:
  - Match spacing, typography, and color from the reference image exactly.
  - Do not invent new colors, fonts, or layout patterns not visible in the reference.
  - Use the same visual hierarchy as the reference (what is large stays large).

ACCEPTANCE CRITERIA:
  - {criterion 1 — usually: renders correctly in a browser at 1280px wide}
  - {criterion 2 — usually: mobile responsive with a reasonable breakpoint}
  - {criterion 3 — specific to component: e.g., toggle switches state correctly}
  - {criterion 4 — no placeholder text in the final output}

CONSTRAINTS:
  - {any hard limits, e.g., "no external CSS libraries beyond Tailwind"}
  - {accessibility requirement if any, e.g., "all interactive elements keyboard-accessible"}

START HERE:
  Describe the layout structure you see in the reference image before writing any code.
```

## Phase 4: Handoff

Deliver:
1. The reference image (confirm it is saved or provide the path).
2. The implementation prompt in a code block, ready to paste.
3. A brief note on how to use the pair: "Paste the prompt and attach the image into your code model session."

## Reference Image Storage Convention

Save generated reference images to `./` by default unless the user specifies a path. Name them `reference-{kebab-case-component-name}.png`. This makes them easy to find and attach in subsequent sessions.

## What This Does NOT Do

- Does not implement the UI itself — it produces the prompt and reference that a code model uses.
- Does not guarantee the implementation model will match the reference perfectly — the prompt constrains it, but human review of the output is always required.
- Does not handle backend logic — this workflow covers the visual layer only.

## Source

Extracted from Nate Kadlac newsletter (2026-04-28): "ChatGPT 5.5 scored 87 where the next best model scored 67. Here's what that gap looks like in real work." The reference-driven frontend pattern (Nate's observation that Images 2 + Codex outperforms blank-canvas prompting for visual work) is the source of this two-phase workflow.
