import { stripQuotes } from './script.js';
export const DEFAULT_STYLE = 'cinematic live-action, naturalistic color, shallow depth of field';
/** Project limit for Veo clip length. Google's prompt guide gives no length in seconds (it only says to keep clip length in mind), so this is not from the guide. */
export const MAX_SHOT_SECONDS = 8;
/** Deterministic proxy for the best-practice advice to use separate clips for separate events: at most this many beats per shot, all in the shot's one scene and location. */
export const MAX_SHOT_BEATS = 2;
/** Sequencing words that join several events inside one beat (Google's counterexample: a library, then a drive, then a warehouse). "next to" is spatial and allowed. */
const SEQUENCING = /\b(then|after that|afterwards|later|subsequently|next(?! to\b))\b/i;
const clean = (s) => stripQuotes(s).replace(/:/g, ' -').replace(/\s+/g, ' ').trim();
const trimEnd = (s) => clean(s).replace(/[.!?\s]+$/, '');
/** The writer's normalization of asset names and descriptions in the subject; QA compares with the same rule. */
export const normalizeAssetText = trimEnd;
export function shotContinuityNote(shot, assets) {
    const location = assets.find(a => a.id === shot.locationId && a.kind === 'location') ?? byKind(shot, assets, 'location')[0];
    return continuityNote(byKind(shot, assets, 'character'), location);
}
function byKind(shot, assets, kind) {
    const ids = new Set(shot.references);
    return assets.filter(a => a.kind === kind && ids.has(a.id));
}
export function writeVeoPrompt(input) {
    const { shot, assets } = input;
    const characters = byKind(shot, assets, 'character');
    const location = assets.find(a => a.id === shot.locationId && a.kind === 'location') ?? byKind(shot, assets, 'location')[0];
    // Visual subjects come only from the visible list; off-screen speakers are heard, not seen.
    const visibleAssets = shot.visible
        .map(id => assets.find(a => a.id === id && (a.kind === 'character' || a.kind === 'object')))
        .filter((a) => a !== undefined);
    const context = location !== undefined ? `${trimEnd(location.name)}, ${trimEnd(location.description)}` : '';
    // A shot with nothing visible (an empty establishing shot) takes its location as the subject.
    const subject = visibleAssets.length > 0 ? visibleAssets.map(a => `${trimEnd(a.name)}, ${trimEnd(a.description)}`).join('; ') : context;
    const action = shot.beats.map(b => trimEnd(b.text)).filter(Boolean).join('; ');
    const style = trimEnd(input.style ?? DEFAULT_STYLE);
    const cameraMotion = trimEnd(shot.camera.motion);
    const composition = framing(shot);
    const ambiance = trimEnd(input.ambiance ?? '');
    const speakerName = (id) => assets.find(a => a.id === id)?.name ?? id;
    const dialogue = shot.dialogue.map(d => {
        const who = clean(speakerName(d.speakerId));
        return `${who} ${d.offscreen ? 'speaks off-screen' : 'speaks'}: ${clean(d.text)}`;
    });
    const p = {
        shotId: shot.id, subject, context, action, style, dialogue, text: '',
        continuity: continuityNote(characters, location)
    };
    if (cameraMotion !== '')
        p.cameraMotion = cameraMotion;
    if (composition !== '')
        p.composition = composition;
    if (ambiance !== '')
        p.ambiance = ambiance;
    p.text = assemble(p);
    return p;
}
/** Opening and ending framing with explicit temporal wording; a declared final composition is kept too. */
function framing(shot) {
    const opening = trimEnd(shot.camera.opening);
    const ending = trimEnd(shot.camera.ending);
    const final = trimEnd(shot.finalComposition ?? '');
    const parts = [];
    if (opening !== '')
        parts.push(`opens on ${opening}`);
    if (ending !== '')
        parts.push(`ends on ${ending}`);
    if (final !== '' && final !== ending)
        parts.push(`final composition ${final}`);
    return parts.join(', ');
}
/** Metadata outside the prompt text, so asset names stay exact (no clean()). One name per line, so commas, periods and colons in a name cannot blur the list. */
export function continuityNote(characters, location) {
    const chars = characters.length > 0 ? characters.map(c => `Character: ${c.name}`) : ['Characters: none'];
    return [...chars, `Location: ${location !== undefined ? location.name : 'none'}`].join('\n');
}
function assemble(p) {
    const parts = [
        p.cameraMotion !== undefined ? `${p.cameraMotion}.` : undefined,
        p.composition !== undefined ? `Composition: ${p.composition}.` : undefined,
        `Subject: ${p.subject}.`,
        `Context: ${p.context}.`,
        `Action: ${p.action}.`,
        `Style: ${p.style}.`,
        p.ambiance !== undefined ? `Ambiance: ${p.ambiance}.` : undefined,
        ...p.dialogue.map(d => (/[.!?]$/.test(d) ? d : `${d}.`))
    ];
    return parts.filter((x) => x !== undefined).join(' ');
}
export function writeVeoPrompts(shots, scenes, assets, opts = {}) {
    return [...shots].sort((a, b) => a.order - b.order).map(shot => {
        const scene = scenes.find(s => s.id === shot.sceneId);
        if (scene === undefined)
            throw new Error(`shot ${shot.id} references unknown scene ${shot.sceneId}`);
        return writeVeoPrompt({ shot, scene, assets, ...opts });
    });
}
/** Shot output as text: the prompt followed by its continuity note, one block per shot. */
export function renderVeoPrompts(prompts) {
    return prompts.map(p => `Shot ${p.shotId}\n${p.text}\nContinuity:\n${p.continuity}`).join('\n\n') + '\n';
}
/**
 * QA: core fields filled, no quotation marks, colon dialogue, continuity location named. With the shot (and assets), also: continuity names the shot's location and every referenced character asset;
 * duration cap, camera motion and framing kept, dialogue count, and the focus proxy (at most MAX_SHOT_BEATS beats,
 * shot in the given scene and in that scene's location, one location reference). It does not judge whether
 * beats are semantically distinct events; it only flags sequencing connectives (then, after that, later, next) in the action. Empty means pass.
 */
export function checkVeoPrompt(p, shot, scene, assets) {
    const problems = [];
    const at = `prompt ${p.shotId}`;
    for (const f of ['subject', 'context', 'action', 'style']) {
        if (p[f].trim() === '')
            problems.push(`${at}: missing core field ${f}`);
    }
    for (const f of ['cameraMotion', 'composition', 'ambiance']) {
        if (p[f] !== undefined && p[f].trim() === '')
            problems.push(`${at}: optional field ${f} present but empty`);
    }
    const populated = [
        ['cameraMotion', p.cameraMotion, `${p.cameraMotion}.`],
        ['composition', p.composition, `Composition: ${p.composition}.`],
        ['ambiance', p.ambiance, `Ambiance: ${p.ambiance}.`]
    ];
    for (const [f, v, sentence] of populated) {
        if (v !== undefined && v.trim() !== '' && !p.text.includes(sentence))
            problems.push(`${at}: optional field ${f} not in prompt text`);
    }
    if (SEQUENCING.test(p.action))
        problems.push(`${at}: action sequences several events (${SEQUENCING.exec(p.action)[0]}); split into separate shots (one focused moment per clip)`);
    if (stripQuotes(p.text) !== p.text.replace(/\s+/g, ' ').trim())
        problems.push(`${at}: quotation mark in prompt text`);
    for (const d of p.dialogue) {
        const m = /^([^:]+?): (\S.*)$/.exec(d);
        if (m === null || !/\s/.test(m[1].trim()))
            problems.push(`${at}: dialogue must be speaker action, colon, words: ${d}`);
        else if (!p.text.includes(d))
            problems.push(`${at}: dialogue missing from prompt text: ${d}`);
    }
    for (const [label, value] of [['Subject', p.subject], ['Context', p.context], ['Action', p.action], ['Style', p.style]]) {
        if (value !== '' && !p.text.includes(`${label}: ${value}`))
            problems.push(`${at}: ${label.toLowerCase()} not in prompt text`);
    }
    if (p.continuity.trim() === '' || /^Location: none$/m.test(p.continuity))
        problems.push(`${at}: continuity note names no location asset`);
    if (shot !== undefined) {
        if (shot.durationSeconds > MAX_SHOT_SECONDS)
            problems.push(`${at}: duration ${shot.durationSeconds}s exceeds ${MAX_SHOT_SECONDS}s`);
        if (shot.camera.motion.trim() !== '' && p.cameraMotion === undefined)
            problems.push(`${at}: shot has camera motion but prompt omits it`);
        if (shot.beats.length > MAX_SHOT_BEATS)
            problems.push(`${at}: ${shot.beats.length} beats exceed ${MAX_SHOT_BEATS}; split into separate shots (one focused moment per clip)`);
        if (shot.camera.opening.trim() !== '' && !p.text.includes(`opens on ${trimEnd(shot.camera.opening)}`))
            problems.push(`${at}: opening framing missing from prompt text`);
        if (shot.camera.ending.trim() !== '' && !p.text.includes(`ends on ${trimEnd(shot.camera.ending)}`))
            problems.push(`${at}: ending framing missing from prompt text`);
        if (scene !== undefined) {
            if (shot.sceneId !== scene.id)
                problems.push(`${at}: shot belongs to scene ${shot.sceneId}, not ${scene.id}`);
            else if (shot.locationId !== scene.locationId)
                problems.push(`${at}: shot location ${shot.locationId} differs from scene location ${scene.locationId}`);
        }
        if (assets !== undefined) {
            // Flow's Jump To needs the exact asset names: the note must carry the shot's own location and every referenced character.
            const loc = assets.find(a => a.id === shot.locationId && a.kind === 'location');
            if (loc !== undefined && !p.continuity.split('\n').includes(`Location: ${loc.name}`))
                problems.push(`${at}: continuity note does not name location asset ${loc.name}`);
            for (const c of assets.filter(a => a.kind === 'character' && shot.references.includes(a.id))) {
                if (!p.continuity.split('\n').includes(`Character: ${c.name}`))
                    problems.push(`${at}: continuity note does not name character asset ${c.name}`);
            }
        }
        if (shot.dialogue.length !== p.dialogue.length)
            problems.push(`${at}: dialogue count differs from shot`);
    }
    return problems;
}
