---
name: side-walk-flow
description: Take any Google Flow video generation, from a committed pack or a plain shot list, one shot at a time under the user's supervision: build a deterministic flow-runsheet, lint every prompt, run per-take QA, and import the downloads with the kit when there is a pack.
---

# Google Flow production loop (browser layer)

The kit and app stay offline: make no network or model calls from their code. This skill is the live browser step, run only in the user's already signed-in session and only under their supervision. Flow's UI, model names, credit costs and terms are external and may change. The numbers and names below are OBSERVED notes, not current facts: confirm each on screen before you generate or spend.

## Build check

The built kit ships inside this skill at `<skill-dir>/kit/lib`, where `<skill-dir>` is the folder holding this SKILL.md (for a plugin install, the plugin's `skills/side-walk-flow/` folder). It needs Node.js and has no dependencies; there is nothing to build. It is a frozen build: change the prompt rules here, not in the kit. `<project-root>` in every command is the folder that owns your plan and clips; for `--shots` mode any existing folder works.

Before the first shot, run
`node <skill-dir>/kit/lib/src/main.js --root <project-root>`. It exits with status 2 after printing the command list. That exit status is expected; the check is that the list includes `flow-prompt-check`. If it is reported as an unknown command, stop and report it; do not run Flow against a missing build.

## Commands (absolute paths)

Every kit command in this skill uses this exact absolute prefix, from any working directory:

```
node <skill-dir>/kit/lib/src/main.js --root <project-root>
```

Generate a run sheet from a committed pack, or from a plain shot list:

```
node <skill-dir>/kit/lib/src/main.js --root <project-root> flow-runsheet <pack-dir> --out <run-sheet.md>
node <skill-dir>/kit/lib/src/main.js --root <project-root> flow-runsheet --shots <shots.json> --out <run-sheet.md>
node <skill-dir>/kit/lib/src/main.js --root <project-root> flow-runsheet --shots <shots.json> --json --out <run-sheet.json>
```

Lint every prompt before opening Flow:

```
node <skill-dir>/kit/lib/src/main.js --root <project-root> flow-prompt-check <run-sheet.json>
```

Import the downloads and check readiness, for a committed pack only:

```
node <skill-dir>/kit/lib/src/main.js --root <project-root> map-clips <plan> --clips <clips.json> --clip-root <clip-root> --select '<shot_id>=<take_file>@<take_id>'
node <skill-dir>/kit/lib/src/main.js --root <project-root> readiness <plan> --approvals <approvals.json> --clips <clips.json> --clip-root <clip-root>
```

`<pack-dir>`, `--shots`, `--out` and the `flow-prompt-check` run-sheet file resolve against the current directory, not `--root`. Pass an absolute path for each of them. Only `<plan>`, `--clips`, `--approvals` and `--clip-root` resolve against `--root`; make those relative to the checkout that owns the committed inputs.

## Prompt lint (what `flow-prompt-check` enforces)

Every prompt must have 60 to 135 words, no em dash or long dash, no quotation mark, exactly one camera move, and a final `Avoid:` tail naming on-screen text, subtitles and watermarks. Quotation marks are rejected because they can burn into captions; removing them does not make a shot silent. A silent or mouthed shot keeps the spoken words out of the prompt entirely, as step 5 of the prompt order describes.

The camera move is read only from one sentence that starts with `Camera:` (case-insensitive), at the start of the prompt, at the start of a line, or after a real sentence end. A sentence ends only at `.`, `!` or `?` followed by whitespace or the end of the text, so a decimal point such as `1.5x` does not end it. Write exactly one such sentence, for example `Camera: slow pan right.` or `Camera: static, locked off.` Zero or two `Camera:` sentences fail (`PROMPT_CAMERA_SENTENCE`). The `Camera:` sentence names one move and nothing else: it must contain no negation at all (`no`, `not`, `never`, `without`, `zero`, `none`, `neither`, `nor`, `nothing`, `don't`, `doesn't`, `isn't`), or it fails `PROMPT_CAMERA_NEGATION`. Put negated moves in the `Avoid:` tail instead, for example `Avoid: on-screen text, subtitles, watermarks, no zoom`. Otherwise exactly one move is required (`PROMPT_CAMERA_MOVES`); `static`, `locked off` and `locked-off` count as the one move, and a move plus static or two moves fail. Words outside the `Camera:` sentence, including a truck, a track, a crane, a boom, a roll or "she follows him", are never counted as moves.

The `Avoid:` tail is everything from the last `Avoid:` to the end of the prompt. Trailing whitespace at the end of the prompt, newlines included, is ignored, so a final newline does not fail. It must stay on one line: any line break (`\n`, `\r`, U+2028 or U+2029) inside the tail fails with "keep the Avoid: tail on one line at the end of the prompt", so never wrap it. Nothing may follow the tail on the same line: a `.`, `!` or `?` followed by whitespace and then more text fails with "Avoid: must be the final sentence of the prompt". A trailing `etc.` at the very end still passes.

## Before the first shot

1. Run the build check above and stop if `flow-prompt-check` is an unknown command.
2. Ask the user for the committed pack directory or the plain shot list file. Confirm a pack is committed, not an incomplete export. A plain shot list needs `scene`, `shot_id`, `duration_seconds`, `prompt_text`, `characters` and `location` for every shot.
3. Generate the run sheet with one of the `flow-runsheet` commands above, using absolute paths for `<pack-dir>`, `--shots` and `--out`. For a pack, the command refuses any pack that `verify-pack` rejects; report its diagnostics and stop.
4. Make the JSON form of the same run sheet and run `flow-prompt-check` on it with an absolute path. If it exits 1, report each failure by `shot_id` and stop. Do not rewrite a prompt to make the lint pass unless the user asks for that edit.
5. Read the run sheet and the per-run credit cap the user gives you. If they have not stated a cap, stop and ask before opening Flow.
6. Use the browser session the user already signed in. Do not sign in, create an account, or change account settings.

## Stop points (never cross)

- **Never type a password or other credential.** That includes a password, one-time code, recovery code, API key or passkey prompt. Stop and ask the user to take over the browser.
- **Stop and ask the user before any action that may spend credits.** That includes Generate, a reroll, an upscale and any paid edit. State the per-run cap they gave and the price shown on screen. Do not act on your own, do not continue after the cap is reached, and do not batch several shots ahead. One explicit yes is required per Generate; a batch is allowed only when the user names the shot ids and the total credit cap for that batch.
- **Never choose between takes or record an approval.** You may download, name and list takes; the user decides which one is used and whether the shot is approved. Do not mark a checklist, sign a receipt, or write an approval file.
- **Stop if Flow shows a sign-in, captcha or terms page.** Do not enter a credential, solve the captcha, or accept terms on their behalf. Report what the page asks for and stop.

## Reference images: plain panels only

- Upload only plain, single-subject reference images. No contact sheets, no labelled turnarounds, no multi-panel grids and no images with embedded typography.
- Use 1 or 2 clean panels on a neutral background. If all you have is a contact sheet, crop one panel offline first and upload that, never the sheet.
- Keep the subject isolated: one face or one full figure per image, no labels, arrows, colour swatches or measurement marks.
- If the reference still carries text or several panels, stop and ask the user for a clean source instead of uploading it.

## Model and credit notes (observed, confirm on screen)

- Draft blocking and camera motion at 360p. Upscale only the take the user named, after their yes, at the price shown on screen; the observed note says that upscale to 720p or 1080p costs 0 credits on a paid plan. Confirm the price on screen before you rely on it.
- Model names and prices are observed notes and may be stale. The old note names `Veo 3.1 Quality` at 100 credits, `Gemini Omni Flash` 360p drafts at 4 to 7 credits depending on 4, 6, 8 or 10 seconds, and free daily image quotas on Nano Banana models. Treat every one as UNVERIFIED until the open Flow screen shows the same model, resolution, duration and price.
- Never quote a credit cost or model name from this skill as current. Read it from the Flow UI at the moment of Generate and report the observed value.
- Use the cheapest draft that tests the shot. Spend on the keeper, not on exploration.
- `Return silent videos` is an observed Flow project setting. Only the user may change it; ask them and do not edit project settings yourself.

## Never Extend a hero shot

- Do not press Flow's `Extend` button on a hero shot. The old note says Extend forces a lower model; confirm the current behaviour on screen if the user asks.
- To continue from a hero take, extract its last frame and start the next shot from that frame with `Frames -> First Frame`. The next shot begins from the actual final image, not from an Extend continuation.
- Extract the handoff frame with:

  ```
  ffmpeg -sseof -0.1 -i <take> -frames:v 1 -update 1 <take>-last-frame.png
  ```

- Keep the handoff frame with the take so the next shot can be reproduced.
- Never reverse or boomerang a clip, and never ask Flow for reverse motion or a backward loop. A reversed take is not a usable handoff.

## Prompt order (6 steps)

Compile every shot prompt in this order and keep it inside the lint limits: 60 to 135 words, no em dash or long dash, no quotation mark, exactly one `Camera:` sentence with exactly one move.

1. **Continuity and one camera move.** Start with the single documented camera sentence: `Camera: <shot scale>, <angle>, <one camera move>.` For example `Camera: medium shot, eye level, slow pan right.` A fixed camera is a valid move: `Camera: static, locked off.` The sentence names the one move and nothing else, never a negation; put a move to avoid in the `Avoid:` tail. Write no second `Camera:` sentence anywhere and do not add a second move later in the prompt.
2. **Subject, verbatim, plus emotion and multi-person guard.** Use the run sheet's subject names and descriptions exactly. Direct the emotion. If two or more people are in frame, describe the second person's contrasting appearance so identities do not bleed.
3. **Scalar kinetic anchor.** Give a concrete physical motion with a screen direction and a rate where useful, for example `drives forward left-to-right at 50 mph`.
4. **CTLT environment, lighting and texture.** Name the light source and direction, the lens and depth of field, and the physical material of the surfaces.
5. **Audio and dialogue, conditionally.** Write `<Speaker> says: <line>` only when the take should contain that spoken line. For a silent or mouthed shot, never put the words in the prompt at all: describe the mouth movement without text, state silence with `Audio: silence.` or ambient/SFX only, and add `spoken dialogue` and `audible speech` to the `Avoid:` tail. Add explicit `SFX:` and `Ambient noise:` sentences when they apply.
6. **Avoid tail.** End with one final `Avoid:` sentence that names on-screen text, subtitles and watermarks, plus any other avoid items, including negated moves, scene cuts and signage lettering: `Avoid: on-screen text, subtitles, watermarks, signage lettering, scene cuts, no zoom, reverse motion, frozen subject, morphing silhouette.` Add `spoken dialogue` and `audible speech` only for silent or mouthed shots, never for a shot that should contain a spoken line. Nothing may follow the tail.

## Work through the run sheet

One shot at a time, in run sheet order. Do not skip ahead or reorder shots.

1. Open the next shot's entry. Note its `shot_id`, `prompt_text`, `characters`, `location`, `take_file` and `take_id`.
2. Set continuity with Jump To. Use each `Character: <name>` and `Location: <name>` from the entry exactly as spelled. Do not translate, shorten, title-case, merge or substitute a similar asset. If a name is missing in Flow, stop and report it rather than inventing one.
3. Check the reference images in use against the plain-panel rules above and stop if they are not clean. Then attach the approved start frame the storyboard names with `Frames -> First Frame`, before pasting the prompt.
4. Paste `prompt_text` unaltered into Flow's prompt field. Do not edit, clean up, shorten, translate, add style words, remove punctuation or reformat it. Compare the field with the run sheet and with the passing `flow-prompt-check` output before generating.
5. Apply the spending stop point: ask the user, state the per-run cap they gave and the price shown on screen, and press Generate only after their explicit yes.
6. Wait for the take to finish. Download it and save it under the run sheet's `take_file` name, for example `sc01-sh01__take-01.mp4`, in the clip root the user names. A reroll is the exception: save it under the reroll name from the reroll section below, never under `take-01`. Do not keep the browser's default file name and do not otherwise rename the take.
7. Run the per-take QA below before showing the take to the user. Never reverse or boomerang the clip.
8. Record only the run sheet's `take_id` with that file. Do not approve the take or choose it over another.
9. Move to the next shot only after the file is saved, QA is reported, and the user has seen the result.

If a shot fails, looks wrong, or Flow offers several takes, stop and ask the user. Do not generate a second take under the same file name, do not overwrite a saved take, and do not pick a favourite.

## At most 2 rerolls per shot

- Give each shot at most 2 rerolls. Count every Generate after the first as a reroll.
- Name rerolls in sequence and never overwrite a saved take: the first take is `<shot_id>__take-01.mp4` with take id `<shot_id>-take-01`, the next is `<shot_id>__take-02.mp4` with take id `<shot_id>-take-02`, and so on. Every reroll is a new name and a new file.
- If it still fails on the second reroll, stop stacking prompts and change the approach: pre-compose a new first frame, split the beat into two shots, cut the move to a single axis, or replace the reference panel.
- Report the two failed attempts, their take ids and the new approach to the user before spending again.

## Per-take QA (run by the agent)

Run this on every downloaded take, before you describe it as good or show it as a keeper. Keep the evidence files next to the take.

1. Container and stream facts with ffprobe. Read the stream list, including `codec_type`, so a missing audio stream is visible:

   ```
   ffprobe -v error -show_entries format=duration:stream=codec_name,codec_type,width,height,r_frame_rate -of json <take>
   ```

2. Volume per 0.5 second with ffmpeg. This resamples to 16 kHz mono inside the filter chain, cuts 8000-sample windows (0.5 s) and prints RMS for each window:

   ```
   ffmpeg -hide_banner -i <take> -vn -af "aresample=16000,aformat=channel_layouts=mono,asetnsamples=n=8000,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level" -f null -
   ```

   The resample has to be inside `-af` so each window is 0.5 s whatever the source rate. The RMS trace shows level, not content. If the take has no audio stream, this command fails with `Output file does not contain any stream`. That is expected for a missing stream: report it from the ffprobe stream list in step 1, and do not treat it as a tool error.

3. Contact sheet from the actual frames:

   ```
   ffmpeg -i <take> -vf "fps=1,scale=320:-1,tile=5x4" -frames:v 1 <take>-contact-sheet.jpg
   ```

4. Caption strip across the whole take. Sample the bottom 20 percent where burned-in text and captions appear, at 2 frames per second, and tile every sample. N is 2 x the take duration in seconds, rounded up:

   ```
   ffmpeg -i <take> -vf "fps=2,crop=iw:ih*0.2:0:ih*0.8,scale=360:-1,tile=1x<N>" -frames:v 1 <take>-caption-strip.jpg
   ```

   Read every tile in the strip. A caption that starts after the first frame is still visible in its tile; a single crop of frame 0 would miss it.

5. Unwanted speech. When the shot has no spoken line, any voice or intelligible speech fails the take. Only the user listening can confirm silence: the RMS trace shows level, not content, and an audio stream can carry noise or speech. Silence is expected for a silent shot. If the ffprobe stream list has no audio stream, report that instead of assuming silence.

Read the contact sheet, the caption strip and the volume trace yourself. Check for burned-in text, captions or watermarks, identity drift between people, extra people, more than the one requested camera move, a frozen subject, a hard cut and reverse or boomerang motion. An automatic score, including CLIP, aesthetic, scene-detect or any ffmpeg metric, is never the gate. Your inspection and the user's decision are the gate.

If QA fails, stop and report the specific frames and times. Do not approve the take, do not quietly reroll, and do not average the failure into a score.

## Import with the kit and run readiness (committed pack only)

`map-clips` and `readiness` need a kit plan, so they apply only to a committed pack. For `--shots` mode, skip the kit import: save each take under the run sheet's `take_file` in the clip root the user names, keep the QA evidence next to it, and report the take ids. Do not invent a plan or run `map-clips` without one.

For a packed run, after the user has named the take for each shot, map the saved files with the run sheet `take_file` and `take_id` values. Run `map-clips --select` only with the take the user named, after they named it:

```
node <skill-dir>/kit/lib/src/main.js --root <project-root> map-clips <plan> --clips <clips.json> --clip-root <clip-root> \
  --select 'sc01-sh01=sc01-sh01__take-02.mp4@sc01-sh01-take-02' \
  --select 'sc01-sh02=sc01-sh02__take-01.mp4@sc01-sh02-take-01'
```

Then check the mapped state:

```
node <skill-dir>/kit/lib/src/main.js --root <project-root> readiness <plan> --approvals <approvals.json> --clips <clips.json> --clip-root <clip-root>
```

`map-clips` and `readiness` re-hash the files and check shot fingerprints; they do not judge audiovisual quality, Flow import success, credit spend or creative approval. If readiness reports errors, report the diagnostic codes to the user and stop. Do not hand-edit `clips.json` to silence them.

## Run sheet fields

- `shot_id`, `scene`, `duration_seconds`: the shot and scene to generate.
- `prompt_text`: the exact text to paste; it is never rewritten.
- `characters`, `location`: the exact names for Jump To.
- `take_file`: the file name to save and later pass to `map-clips`.
- `take_id`: the take id to pass to `map-clips`.

Run the kit with no command to print the usage for `flow-runsheet`, `flow-prompt-check`, `map-clips` and `readiness`.
