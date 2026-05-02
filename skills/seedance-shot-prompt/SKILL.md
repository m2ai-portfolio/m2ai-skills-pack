---
name: seedance-shot-prompt
description: Use when generating a Seedance 2 video prompt for a linear forward-motion shot — transitions, chase shots, establishing shots, A→B narrative clips. Trigger when the user asks for a "shot prompt", "transition shot", "video shot", "cinematic shot", "forward motion video", "A to B shot", "linear video generation", "narrative video clip", or describes a shot with a starting state and a different ending state. NOT for loops or backgrounds — for those use seedance-loop-prompt instead. Includes a 3-stage smoke-test protocol for identity-bound shots and a named taxonomy of 8 known failure modes (api_xor_constraint, identity_drift, motion_reversal, boomerang_interpolation, no_motion_reference_only, hallucination, text_garbling, input_stacking_ineffective) drawn from a 2026-04 production AAR.
---

# Seedance Shot Prompt Builder

Generate hyper-detailed, structured video prompts for Seedance 2 that produce **linear forward-motion shots** — transitions, chase shots, establishing shots, narrative A→B clips. Forces exhaustive specificity on camera, lighting, action arc, anchor frames, and identity handling — the details humans leave vague that bite at render time.

This is the counterpart to `seedance-loop-prompt` (companion skill — build alongside if you also need looping backgrounds). If the user wants a seamless looping background, redirect there.

## When to use this vs the loop builder

| Use seedance-shot-prompt | Use seedance-loop-prompt |
|---|---|
| Forward motion A→B | Returns to start (cyclic) |
| Different first/last frame | Same first/last frame |
| Transition / chase / establishing / reveal | Background / product loop |
| Pacing: build → climax → hold | Pacing: build → peak → resolve back |

## Input expectations

**Required:**
- Subject (what's on screen)
- Some sense of motion (where the camera or subject goes)

**Optional — infer if not provided:**
- Mood/tone
- Duration (default: 8 seconds for a shot — shorter than loops because there's no return arc)
- Color palette
- Reference frames (hosted URLs if available, e.g. `https://<your-cdn>/<project>/*`)

## Confidence gate

- Has subject + motion intent → generate immediately
- Missing subject → ask ONE focused question
- Missing motion intent → infer from subject type (see Direction inference)
- Never over-interrogate. Make creative decisions where the user hasn't specified.

## Direction inference

When the user doesn't specify a motion arc, infer from the subject:

| Subject Type | Default Motion | Why |
|---|---|---|
| Vehicle (chase/driving) | Tracking shot, parallel motion | Emphasizes speed and forward intent |
| Vehicle (transition) | Aerial pull-up or push-down | Hands off scene to next clip |
| Character (narrative) | Push-in to medium close-up | Builds emotional weight |
| Architecture / location | Slow dolly forward, low elevation | Reveals scale |
| Product reveal (linear) | Crane down then push-in | Big-to-intimate hand-off |
| Abstract / atmospheric | Drift or arc with focus pull | Mood without subject lock |
| Sim/UI/wireframe → real | Crossfade-style match cut motion | Bridges synthetic and real |

## Before generating a prompt for an identity-bound shot

**3-stage smoke-test protocol** — non-optional when the user names a specific subject (branded vehicle, named product, specific character, custom-spec object).

A 2026-04 production AAR proved that current-gen video models cannot preserve specific identity AND motion simultaneously. Skip the smoke test, and you burn 1-2 days fighting the model's ceiling.

1. **Generic motion test** (~30 min, 1-2 generations)
   - Same camera arc, generic subject (anonymous landscape, abstract object, unbranded vehicle)
   - Confirms the provider can produce clean linear motion at this duration/framing at all
   - If this fails: provider is not viable for the project regardless of identity. Move on.

2. **Identity-only test** (~30 min, 1-2 generations)
   - Specific named subject, near-static or very gentle motion (slow orbit, fixed lock-off, slight push-in)
   - Confirms the provider can hold the identity when not under motion stress
   - If this fails: identity reference workflow needs LoRA / different provider. Skip step 3.

3. **Combined test** (only after 1 and 2 both pass)
   - Specific subject + the actual motion arc the user wants
   - If 1 and 2 passed but 3 fails: this is the diagnostic signature of the **2026-era identity-vs-motion trade-off**. Abandon this provider for this shot. Don't grind. Try one alternative provider (Veo, Runway Gen-5+, Luma) or fall back to real footage.

When the user proposes an identity-bound shot, surface this protocol explicitly before producing a prompt. Ask if they've smoke-tested the provider on a generic shot for the same subject class. If not, recommend running the smoke test first (or generate a smoke-test prompt as a standalone deliverable).

## Output format

Generate a single structured prompt with ALL 7 sections below. Every section is mandatory.

---

### SCENE
Describe the subject and environment:
- Subject: material, color, form factor, key visual details. Be precise — "Rapid Blue C8 Corvette with high-wing carbon spoiler, signature side skirts, red angular front emblem, silver split-spoke wheels, dark calipers" not "blue Corvette."
- Environment: track, road, void, studio, drone-shot countryside, etc. Describe what surrounds the subject and where the camera is operating.
- Mood references: 1-2 real-world visual references to anchor the aesthetic ("DJI cinematic auto reel," "Top Gear chase cam, golden hour," "Drive 2011 night drive"). Always include at least one.
- Color palette: dominant tones, accent colors, lighting temperature.

### CAMERA
Describe camera behavior across the full duration:
- Motion type: tracking shot, push-in, pull-back, crane-down, aerial parallax, dolly-forward, lateral pan, etc.
- Speed: "slow, deliberate, cinematic" or "fast, reactive chase pace" — be specific.
- **Start position ≠ end position.** This is a linear shot. Specify both anchors explicitly:
  - Start: angle, elevation, distance, framing (e.g., "front-three-quarter low-angle at 8m, ground-level tracking from front")
  - End: angle, elevation, distance, framing (e.g., "rear-three-quarter aerial at 25m, 30-degree elevation pulling back")
- Path between: how the camera transitions from start to end (curve, straight line, easing).
- Focal length, depth-of-field, any rack focus.

### ACTION ARC
Linear progression from A to B. Unidirectional — **no peak-then-return**, no boomerang.
- Starting state: what's happening at frame 0 (subject pose, motion, environment state)
- Progression: what changes through the duration. Granular. "Vehicle accelerates from 40 to 80mph as camera pulls back, transitioning from tight chase frame to wide aerial reveal" — not "car drives."
- Pacing model: pick one.
  - **Buildup → climax**: action intensifies through the shot, ends at peak (chase reaching apex, vehicle exiting frame at speed)
  - **Reveal → hold**: motion delivers the subject to a settled framing, then holds (push-in to character, crane-down to product on plinth)
- Ending state: where everything resolves at the final frame. The shot stops here — no return.
- What the next clip needs: if this is a transition, note what the outgoing frame should hand off to.

### TEXT CHOREOGRAPHY
Always output exactly: "No text. No UI. Background plate only."

Seedance produces background plates only. All HUD, branding, captions, lower-thirds, and UI elements are composited in post (e.g. Remotion). Asking the model to render text triggers `text_garbling` — lettering, logos, and HUD elements are always destroyed.

### LIGHTING & ATMOSPHERE
- Light source: direction, type (rim, key, ambient), color temperature
- **Static lighting throughout.** No flickers, no color temp shifts, no exposure pumps. Non-negotiable.
- Edge/rim light: which edges catch it, intensity
- Atmospheric effects: dust, haze, lens flare, motion blur, particles
- Shadows: how they fall on the subject and ground
- (No particle-state-reset requirement — that's a loop concern, not a shot concern.)

### ANCHOR FRAMES
This section replaces the loop-builder's LOOP SEAL. It defines first and last frames as **distinct compositions** to prevent boomerang interpolation.

- **First frame**: name it. Composition, camera distance, angle. If using image-to-video with a hosted reference, give the URL (e.g., `https://<your-cdn>/<project>/<frame>.jpg`).
- **Last frame**: name it. **Must be visually distinct** from the first — different angle, different distance, OR different elevation. At least one major axis must differ clearly.
- **Why distinct**: visually similar anchors from a continuous shot trigger `boomerang_interpolation` — the model interprets them as a return path and produces forward → back → forward motion. Continuous-clip frame pairs reliably break this way.
- **Provider constraint warning**: Some Seedance 2 endpoints (e.g. Kie 2026-04) enforce `first_frame_url` / `last_frame_url` XOR `reference_image_urls` (mutually exclusive, 422 on both). If the user needs both framing-lock AND identity-lock from references, surface the `api_xor_constraint` warning — the combined shot will fail on current providers and they need to pick one.

### TECHNICAL
- Duration: [specified or default 8 seconds]
- Linear forward-motion shot (NOT looping)
- Image-to-video generation mode with **different first/last frame references** if anchor mode used
- OR text-to-video with detailed framing description if anchor mode unavailable
- No watermarks
- 4K resolution if supported

---

After presenting the prompt, always include this reminder:

> **Seedance setup:** Linear shot — set DIFFERENT first and last frame references in image-to-video mode (or use anchors XOR references per provider constraint). If this is an identity-bound shot and you haven't run the 3-stage smoke test, do that first.

## Hard rules — enforced on every prompt

1. **Linear intent.** This is NOT a loop. If the user says "background", "looping", "endless", "product loop", or "seamless cycle", redirect to `seedance-loop-prompt`. Do not produce a shot prompt for a looping concept.
2. **Anchors XOR references constraint (Kie API, 2026-04).** Some providers enforce that anchor frames (`first_frame_url`/`last_frame_url`) and identity references (`reference_image_urls`) are mutually exclusive. You pick framing-lock OR identity-lock per call. If the user needs both, warn them up front: the combined shot will fail on current models. They need to either accept identity drift, accept framing drift, or train a LoRA.
3. **Visually distinct anchors.** First and last frames must differ on at least one major axis (angle, distance, elevation). Continuous-clip-style similar frames trigger `boomerang_interpolation`. If the user's reference frames are too similar, flag it before generating.
4. **Identity-bound shots need smoke testing first.** If the user names a specific subject (a branded vehicle, named product, specific character), run the 3-stage smoke-test protocol before committing to the real shot. Current-gen models can't preserve specific identity + motion simultaneously. Don't burn 2 days finding out — burn 30 minutes confirming first.
5. **No text in video.** Composite all text, HUD, lower-thirds, and branding in post (e.g. Remotion). Seedance garbles typography reliably.
6. **Static lighting.** No flickers, no color temp shifts, no exposure pumps. Standard rule.
7. **Describe visual results, not software.** "The camera dollies forward, lifting from 2m to 6m elevation across the shot" — not "apply a dolly-forward keyframe with a Y-axis curve."
8. **Input stacking does not raise the ceiling.** If a generic smoke test shows a provider can't do the shot, adding more inputs (longer prompt, more references, guide videos) will not bridge the gap. Production AAR experience confirms this. When the user asks "what if we add another reference image and a guide video," surface `input_stacking_ineffective` and recommend evaluating a different provider instead.

## Failure modes reference card

When reviewing a user's prompt or a generation result, name the failure mode using this taxonomy. The vocabulary itself is a tool — naming the failure short-circuits days of "let me try one more thing."

| Mode | One-line definition |
|---|---|
| `api_xor_constraint` | Provider rejects request because anchor frames and identity references are mutually exclusive. Pick one. |
| `identity_drift` | Anchor mode loses specific markings; output is generic, not the named subject. |
| `motion_reversal` | Model interprets first/last frames in temporal reverse. Salvageable in ffmpeg post. |
| `boomerang_interpolation` | Visually similar anchors produce forward → back → forward motion. Make anchors more distinct. |
| `no_motion_reference_only` | Reference-only mode loses driving motion entirely; subject becomes still-frame-with-jitter. |
| `hallucination` | Reference mode inserts components that don't exist (exhaust pipe on a C8 Stingray, fake badging, wrong wheel count). |
| `text_garbling` | HUD, logos, captions always destroyed. Composite in post. |
| `input_stacking_ineffective` | Adding more input signals (refs + anchors + guide video) doesn't raise the model's ceiling. The constraint is the model. |

## Creative principles

1. **Specificity over vagueness.** "Camera tracks parallel at 30mph from rear-three-quarter, 2m elevation, holds for 3s then peels off into 25m aerial pull-back over the final 5s" beats "camera follows the car." Include exact distances, angles, durations.
2. **Arcs are unidirectional.** A shot doesn't return to its start. The pacing model is build → climax (action shots) or reveal → hold (narrative shots). Don't write "and then comes back" — that's a loop.
3. **Mood references anchor style.** Always include 1-2 real-world references (named films, director styles, brand cinematics) to ground the aesthetic.
4. **First and last frame are the anchors of the prompt's intent.** Spend description budget there. Everything in between is interpolation, which the model handles best when both ends are clearly defined and visually distinct.
5. **Match the duration to the arc.** 4-6s for a transition or reveal. 8-10s for a chase or developmental shot. Don't ask the model to fill 15s of forward motion — interpolation collapses past ~10s.

## Tone

- Direct and technical — like a director's shot notes, not a marketing brief
- No hype words: never use "stunning," "breathtaking," "incredible," "mesmerizing," "cinematic masterpiece"
- Concise but complete — every detail earns its place
- Bullet points within sections for scanability
- Describe what happens, let the visuals speak

## References

- The 2026-era identity-vs-motion ceiling: current-gen video models (Seedance 2, Kie endpoints, Runway Gen-4 era) cannot reliably preserve specific named-subject identity AND motion simultaneously. Smoke-test before committing.
- Kie-specific API constraints (2026-04): anchor frames XOR reference images, mutually exclusive per call.
- `seedance-loop-prompt` skill — counterpart for seamless looping backgrounds (build alongside if needed).

## Configuration

This skill expects:

- A reference image host (CDN, R2 bucket, S3, or any HTTPS-reachable URL) for `first_frame_url` / `last_frame_url` / `reference_image_urls`. Replace `<your-cdn>` and `<project>` placeholders with your own paths when generating prompts.
- A Seedance 2 provider (Kie, Volcengine, or equivalent) with image-to-video generation mode enabled.
- A post-composition tool (e.g. Remotion, After Effects, Fusion) for HUD/text/branding overlays — Seedance garbles in-frame text reliably.
