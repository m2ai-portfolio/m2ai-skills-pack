import { fingerprint } from './canon.js';
import { CSV_COLUMNS, parseCsv } from './csv.js';
import { prettyJson } from './fsio.js';
import { ID_PATTERN } from './spec.js';
function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function parseManifest(text, sink) {
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch (error) {
        sink.error('JSON_PARSE', 'devastator-manifest.json', `not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
    if (!isRecord(parsed)) {
        sink.error('RUNSHEET_MANIFEST', 'devastator-manifest.json', 'manifest is not an object');
        return null;
    }
    const planId = parsed['planId'];
    const planRevision = parsed['planRevision'];
    const planSha256 = parsed['planSha256'];
    const synthetic = parsed['synthetic'];
    const scenes = parsed['scenes'];
    if (typeof planId !== 'string' || !Number.isSafeInteger(planRevision) || planRevision < 1 || typeof planSha256 !== 'string' || typeof synthetic !== 'boolean' || !Array.isArray(scenes)) {
        sink.error('RUNSHEET_MANIFEST', 'devastator-manifest.json', 'manifest must name planId, planRevision, planSha256, synthetic and scenes');
        return null;
    }
    const out = [];
    const seen = new Set();
    for (const scene of scenes) {
        if (!isRecord(scene) || typeof scene['id'] !== 'string' || !Array.isArray(scene['shots'])) {
            sink.error('RUNSHEET_MANIFEST', 'devastator-manifest.json', 'each scene needs a string id and a shots array');
            return null;
        }
        const sceneId = scene['id'];
        const shots = [];
        for (const shot of scene['shots']) {
            if (!isRecord(shot) || typeof shot['id'] !== 'string') {
                sink.error('RUNSHEET_MANIFEST', `devastator-manifest.json scene ${sceneId}`, 'each shot needs a string id');
                return null;
            }
            if (seen.has(shot['id'])) {
                sink.error('RUNSHEET_DUPLICATE_SHOT', `devastator-manifest.json scene ${sceneId}`, `shot id ${shot['id']} is listed more than once`);
                return null;
            }
            seen.add(shot['id']);
            shots.push({ id: shot['id'] });
        }
        out.push({ id: sceneId, shots });
    }
    return { planId, planRevision: planRevision, planSha256, synthetic, scenes: out };
}
/** Parse the exact `Character: <name>` and `Location: <name>` lines the kit writes into continuity_note. */
export function parseContinuityNote(note) {
    const characters = [];
    let location = null;
    for (const line of note.split('\n')) {
        if (line === '')
            continue;
        if (line === 'Characters: none')
            continue;
        if (line.startsWith('Character: ')) {
            const name = line.slice('Character: '.length);
            if (name === '')
                return null;
            characters.push(name);
            continue;
        }
        if (line.startsWith('Location: ')) {
            if (location !== null)
                return null;
            const name = line.slice('Location: '.length);
            if (name === '')
                return null;
            location = name;
            continue;
        }
        return null;
    }
    if (location === null)
        return null;
    return { characters, location };
}
/**
 * Build the run sheet from a pack's manifest and shots.csv, in manifest order. The pack must already have
 * passed verifyPack; this function only checks the two files it reads are internally usable.
 */
export function buildFlowRunsheet(manifestText, csvText, sink) {
    const before = sink.errorCount;
    const manifest = parseManifest(manifestText, sink);
    if (manifest === null)
        return null;
    let rows;
    try {
        rows = parseCsv(csvText);
    }
    catch (error) {
        sink.error('RUNSHEET_CSV_PARSE', 'shots.csv', `not valid CSV: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
    const header = rows[0];
    if (header === undefined || header.join(',') !== CSV_COLUMNS.join(',')) {
        sink.error('RUNSHEET_CSV_HEADER', 'shots.csv', `header must be ${CSV_COLUMNS.join(',')}`);
        return null;
    }
    const body = rows.slice(1);
    const expected = manifest.scenes.reduce((total, scene) => total + scene.shots.length, 0);
    if (body.length !== expected) {
        sink.error('RUNSHEET_CSV_ROWS', 'shots.csv', `${body.length} data rows for ${expected} manifest shots`);
        return null;
    }
    const shots = [];
    let index = 0;
    for (const scene of manifest.scenes) {
        for (const manifestShot of scene.shots) {
            const row = body[index];
            index += 1;
            const at = `${scene.id}/${manifestShot.id}`;
            if (row === undefined || row.length !== CSV_COLUMNS.length) {
                sink.error('RUNSHEET_CSV_ROW', 'shots.csv', `row for ${at} does not have ${CSV_COLUMNS.length} columns`);
                continue;
            }
            const durationText = row[6] ?? '';
            const duration = Number(durationText);
            if (durationText === '' || !Number.isFinite(duration) || duration <= 0) {
                sink.error('RUNSHEET_DURATION', at, `duration_seconds ${JSON.stringify(durationText)} is not a finite positive number`);
                continue;
            }
            const continuity = parseContinuityNote(row[10] ?? '');
            if (continuity === null) {
                sink.error('RUNSHEET_CONTINUITY', at, 'continuity_note must contain one Location line and only Character/Characters-none lines');
                continue;
            }
            const takeFile = readTakeFile(`${manifestShot.id}__take-01.mp4`, at, sink);
            const takeId = defaultTakeId(manifestShot.id, at, sink, 'the shot id is too long for the generated take_id; shorten the shot id or run from a shot list with an explicit take_id');
            if (takeFile === null || takeId === null)
                continue;
            shots.push({
                shot_id: manifestShot.id,
                scene: scene.id,
                duration_seconds: duration,
                prompt_text: row[9] ?? '',
                characters: continuity.characters,
                location: continuity.location,
                take_file: takeFile,
                take_id: takeId
            });
        }
    }
    if (sink.errorCount > before)
        return null;
    return {
        schemaVersion: 1,
        kind: 'devastator.flow-runsheet',
        planId: manifest.planId,
        planRevision: manifest.planRevision,
        planSha256: manifest.planSha256,
        synthetic: manifest.synthetic,
        shots
    };
}
const SHOT_KEYS = new Set(['scene', 'shot_id', 'duration_seconds', 'prompt_text', 'characters', 'location', 'take_file', 'take_id']);
const META_KEYS = ['planId', 'planRevision', 'planSha256', 'synthetic'];
const SHOT_ID = new RegExp(ID_PATTERN);
const SHA_256 = /^[0-9a-f]{64}$/;
const CONTROL = /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/;
// prompt_text may span lines like the pack's CSV prompt does, but only with LF or CRLF. A lone CR,
// any other C0/C1 character and U+2028/U+2029 stay refused, so a prompt cannot forge a run-sheet line.
const PROMPT_CONTROL = /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F-\u009F\u2028\u2029]/;
const BARE_FILE_BAD = /[\/\\]/;
function hasControl(value) {
    return CONTROL.test(value);
}
function hasPromptControl(value) {
    return PROMPT_CONTROL.test(value) || /\r(?!\n)/.test(value);
}
/** IDs are trimmed and must match the plan id pattern, so they stay safe as output file names. */
function readId(value, field, code, at, sink) {
    if (typeof value !== 'string') {
        sink.error(code, at, `${field} must be a non-empty string matching ${ID_PATTERN}`);
        return null;
    }
    if (hasControl(value)) {
        sink.error('SHOTS_CONTROL', at, `${field} contains a control character`);
        return null;
    }
    const trimmed = value.trim();
    if (trimmed === '') {
        sink.error(code, at, `${field} must be a non-empty string matching ${ID_PATTERN}`);
        return null;
    }
    if (!SHOT_ID.test(trimmed)) {
        sink.error(code, at, `${field} ${JSON.stringify(value)} must match ${ID_PATTERN}`);
        return null;
    }
    return trimmed;
}
/** Free text keeps its bytes (prompt_text, location) but never carries a forged run-sheet line. */
function readText(value, field, code, at, sink, multiline = false) {
    if (typeof value !== 'string') {
        sink.error(code, at, `${field} must be a non-empty string`);
        return null;
    }
    if (multiline ? hasPromptControl(value) : hasControl(value)) {
        sink.error('SHOTS_CONTROL', at, `${field} contains a control character`);
        return null;
    }
    if (value.trim() === '') {
        sink.error(code, at, `${field} must be a non-empty string`);
        return null;
    }
    return value;
}
/** A take file is saved under the clip root, so it must be one bare name and nothing else. */
function readTakeFile(value, at, sink) {
    if (typeof value !== 'string') {
        sink.error('SHOTS_TAKE', at, 'take_file must be a non-empty string when present');
        return null;
    }
    if (hasControl(value)) {
        sink.error('SHOTS_CONTROL', at, 'take_file contains a control character');
        return null;
    }
    const trimmed = value.trim();
    if (trimmed === '') {
        sink.error('SHOTS_TAKE', at, 'take_file must be a non-empty string when present');
        return null;
    }
    if (trimmed === '.' || trimmed.includes('..') || BARE_FILE_BAD.test(trimmed)) {
        sink.error('SHOTS_TAKE', at, `take_file ${JSON.stringify(value)} must be a bare file name with no slash, backslash or ..`);
        return null;
    }
    return trimmed;
}
/** The pack naming scheme appends to the shot id, so the generated id must still pass the explicit take_id rules. */
function defaultTakeId(shotId, at, sink, hint) {
    const takeId = readId(`${shotId}-take-01`, 'take_id', 'SHOTS_TAKE', at, sink);
    if (takeId === null)
        sink.error('SHOTS_TAKE', at, `default take_id for shot ${JSON.stringify(shotId)} is invalid`, hint);
    return takeId;
}
function readShotsMetadata(record, sink) {
    const present = META_KEYS.filter(key => Object.hasOwn(record, key));
    if (present.length === 0)
        return null;
    if (present.length !== META_KEYS.length) {
        sink.error('SHOTS_METADATA', '', `plan metadata is partial; provide all of ${META_KEYS.join(', ')} or none`);
        return null;
    }
    const planIdValue = record['planId'];
    const planRevision = record['planRevision'];
    const planSha256Value = record['planSha256'];
    const synthetic = record['synthetic'];
    const planId = typeof planIdValue === 'string' && SHOT_ID.test(planIdValue) ? planIdValue : null;
    const planSha256 = typeof planSha256Value === 'string' && SHA_256.test(planSha256Value) ? planSha256Value : null;
    if (planId === null)
        sink.error('SHOTS_METADATA', 'planId', `planId must be a string matching ${ID_PATTERN}`);
    if (typeof planRevision !== 'number' || !Number.isSafeInteger(planRevision) || planRevision < 1)
        sink.error('SHOTS_METADATA', 'planRevision', 'planRevision must be a safe integer of at least 1');
    if (planSha256 === null)
        sink.error('SHOTS_METADATA', 'planSha256', 'planSha256 must be a lowercase SHA-256 hex string matching ^[0-9a-f]{64}$');
    if (typeof synthetic !== 'boolean')
        sink.error('SHOTS_METADATA', 'synthetic', 'synthetic must be a boolean');
    if (planId === null || typeof planRevision !== 'number' || planSha256 === null || typeof synthetic !== 'boolean')
        return null;
    return { planId, planRevision, planSha256, synthetic };
}
/**
 * Build the same run sheet from a plain shot list instead of a committed pack. Accepted input is either an
 * array of shots or an object with a `shots` array. The six plain fields are required; `take_file` and
 * `take_id` are optional and default to the pack naming. A run sheet emitted by `flow-runsheet --json` is
 * accepted unchanged, so its plan metadata is preserved and the output is byte-identical to pack mode.
 */
export function buildFlowRunsheetFromShots(text, sink) {
    const before = sink.errorCount;
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch (error) {
        sink.error('SHOTS_JSON_PARSE', 'shots', `not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
    let rawShots;
    let metadata = null;
    if (Array.isArray(parsed))
        rawShots = parsed;
    else if (isRecord(parsed)) {
        rawShots = parsed['shots'];
        metadata = readShotsMetadata(parsed, sink);
        if (sink.errorCount > before)
            return null;
    }
    else {
        sink.error('SHOTS_SHAPE', 'shots', 'shot list must be an array or an object with a shots array');
        return null;
    }
    if (!Array.isArray(rawShots) || rawShots.length === 0) {
        sink.error('SHOTS_SHAPE', 'shots', 'shots must be a non-empty array');
        return null;
    }
    const seen = new Set();
    const shots = [];
    for (const [index, item] of rawShots.entries()) {
        const at = `shots[${index}]`;
        if (!isRecord(item)) {
            sink.error('SHOTS_SHOT', at, 'each shot must be an object');
            continue;
        }
        for (const key of Object.keys(item))
            if (!SHOT_KEYS.has(key))
                sink.error('SHOTS_UNKNOWN_FIELD', at, `unknown field ${key}`);
        const scene = readId(item['scene'], 'scene', 'SHOTS_SCENE', at, sink);
        const shotId = readId(item['shot_id'], 'shot_id', 'SHOTS_SHOT_ID', at, sink);
        const duration = item['duration_seconds'];
        const promptText = readText(item['prompt_text'], 'prompt_text', 'SHOTS_PROMPT', at, sink, true);
        const location = readText(item['location'], 'location', 'SHOTS_LOCATION', at, sink);
        const charactersValue = item['characters'];
        let characters = null;
        if (!Array.isArray(charactersValue))
            sink.error('SHOTS_CHARACTERS', at, 'characters must be an array of non-empty strings');
        else {
            let valid = true;
            const names = [];
            for (const name of charactersValue) {
                if (typeof name !== 'string' || name.trim() === '') {
                    sink.error('SHOTS_CHARACTERS', at, 'characters must be an array of non-empty strings');
                    valid = false;
                    break;
                }
                if (hasControl(name)) {
                    sink.error('SHOTS_CONTROL', at, 'characters contains a control character');
                    valid = false;
                    break;
                }
                names.push(name);
            }
            if (valid)
                characters = names;
        }
        if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0)
            sink.error('SHOTS_DURATION', at, 'duration_seconds must be a finite positive number');
        const takeFileValue = item['take_file'];
        const takeIdValue = item['take_id'];
        const explicitTakeFile = takeFileValue === undefined ? null : readTakeFile(takeFileValue, at, sink);
        const explicitTakeId = takeIdValue === undefined ? null : readId(takeIdValue, 'take_id', 'SHOTS_TAKE', at, sink);
        const takeFile = takeFileValue === undefined ? (shotId === null ? null : readTakeFile(`${shotId}__take-01.mp4`, at, sink)) : explicitTakeFile;
        const takeId = takeIdValue === undefined ? (shotId === null ? null : defaultTakeId(shotId, at, sink, 'give an explicit take_id')) : explicitTakeId;
        if (shotId !== null && seen.has(shotId))
            sink.error('SHOTS_DUPLICATE_SHOT', at, `shot_id ${shotId} is listed more than once`);
        if (shotId !== null)
            seen.add(shotId);
        if (scene === null || shotId === null || typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0 || promptText === null || location === null || characters === null || takeFile === null || takeId === null)
            continue;
        shots.push({
            shot_id: shotId,
            scene,
            duration_seconds: duration,
            prompt_text: promptText,
            characters,
            location,
            take_file: takeFile,
            take_id: takeId
        });
    }
    if (sink.errorCount > before)
        return null;
    const resolved = metadata ?? { planId: 'shots', planRevision: 1, planSha256: fingerprint(shots), synthetic: false };
    return { schemaVersion: 1, kind: 'devastator.flow-runsheet', ...resolved, shots };
}
/** Deterministic JSON: stable keys, two-space indent, trailing newline, no timestamps or host paths. */
export function renderFlowRunsheetJson(sheet) {
    return prettyJson(sheet);
}
function markdownFence(text) {
    const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map(run => run.length));
    const mark = '`'.repeat(longest + 1);
    return `${mark}text\n${text}\n${mark}`;
}
/** Deterministic Markdown: one section per shot in manifest order, prompt text fenced verbatim. */
export function renderFlowRunsheetMarkdown(sheet) {
    const lines = [
        `# Flow run sheet - ${sheet.planId} revision ${sheet.planRevision}`,
        '',
        `Plan SHA-256: \`${sheet.planSha256}\``,
        `Synthetic test receipts: ${sheet.synthetic ? 'yes' : 'no'}`,
        `Shots: ${sheet.shots.length}`,
        '',
        'Work in this order, one shot at a time. Copy each prompt text unaltered.',
        ''
    ];
    for (const [index, shot] of sheet.shots.entries()) {
        lines.push(`## ${index + 1}. ${shot.shot_id}`, '');
        lines.push(`- shot_id: ${shot.shot_id}`);
        lines.push(`- scene: ${shot.scene}`);
        lines.push(`- duration_seconds: ${shot.duration_seconds}`);
        lines.push(`- take_file: ${shot.take_file}`);
        lines.push(`- take_id: ${shot.take_id}`);
        lines.push(`- characters: ${shot.characters.length === 0 ? 'none' : shot.characters.join('; ')}`);
        lines.push(`- location: ${shot.location}`);
        lines.push('', 'Continuity names for Jump To (exact spelling):', '');
        if (shot.characters.length === 0)
            lines.push('- Characters: none');
        else
            for (const name of shot.characters)
                lines.push(`- Character: ${name}`);
        lines.push(`- Location: ${shot.location}`);
        lines.push('', 'prompt_text:', '', markdownFence(shot.prompt_text), '');
    }
    return `${lines.join('\n').trimEnd()}\n`;
}
