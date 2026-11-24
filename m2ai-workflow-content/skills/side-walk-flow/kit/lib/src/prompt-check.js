import { hasQuotationMark } from './script.js';
export const MIN_PROMPT_WORDS = 60;
export const MAX_PROMPT_WORDS = 135;
// Camera moves are read only from the single documented `Camera:` sentence. Words elsewhere in the prompt
// (a truck, a track, a crane, a boom, a roll of cable, "she follows him") are subject matter, not moves.
const CAMERA_MOVE = /\b(?:pan(?:s|ned|ning)?|tilt(?:s|ed|ing)?|dolly|dollies|dollying|dollied|truck(?:s|ed|ing)?|track(?:s|ed|ing)?|zoom(?:s|ed|ing)?|orbit(?:s|ed|ing)?|crane(?:s|d|ing)?|boom(?:s|ed|ing)?|pedestal(?:s|ed|ing)?|roll(?:s|ed|ing)?|arc(?:s|ed|ing)?|push(?:es|ed|ing)?[ -]in|pull(?:s|ed|ing)?[ -](?:back|out)|follow(?:s|ed|ing)?)\b/gi;
// A camera sentence starts at the beginning of the prompt, at the start of a line, or after a real sentence
// end. A `.` between digits (`1.5x`) is never a sentence end: end only at `.`, `!` or `?` followed by
// whitespace or the end of the text. The `Camera:` prefix is mandatory because it gives the lint one
// unambiguous place to read the move from.
const CAMERA_SENTENCE = /(?:^\s*|[.!?](?=\s|$)\s+)camera\s*:/gim;
const STATIC_CAMERA = /\b(?:static|locked[ -]off)\b/i;
// Any negation in the Camera: sentence is a failure: that sentence states the one move, never what to avoid.
// The contraction forms cover both `don't` and `dont`; the `n't` suffix catches the remaining contractions.
const CAMERA_NEGATION = /\b(?:no|not|never|without|zero|none|neither|nor|nothing|dont|doesnt|isnt|arent|wasnt|werent|cant|cannot|wont|couldnt|shouldnt|wouldnt)\b|n['\u2019]t\b/i;
const SENTENCE_END = /[.!?](?=\s|$)/g;
const ABBREVIATIONS = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc', 'e.g', 'i.e', 'fig', 'approx', 'dept', 'inc', 'ltd', 'co']);
const WORD = /\S+/g;
const EM_DASHES = ['\u2014', '\u2015', '\u2E3A', '\u2E3B'];
const AVOID = /\bavoid\s*:/gi;
const ON_SCREEN_TEXT = /\b(?:on[- ]?screen|onscreen)\s+text\b|\btext\s+overlays?\b/i;
const SUBTITLES = /\bsubtitles?\b|\bcaptions?\b/i;
const WATERMARKS = /\bwatermarks?\b|\bwater\s+marks?\b/i;
function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function nonEmptyString(value) {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
}
/**
 * Read `shot_id` and `prompt_text` from a run sheet JSON document (the `flow-runsheet --json` output), or
 * from a bare array of shots. Malformed input is refused before any rule runs.
 */
export function parsePromptRunSheet(text, sink) {
    const before = sink.errorCount;
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch (error) {
        sink.error('PROMPT_RUNSHEET_JSON', 'run-sheet', `not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
    let rawShots;
    if (Array.isArray(parsed))
        rawShots = parsed;
    else if (isRecord(parsed))
        rawShots = parsed['shots'];
    else {
        sink.error('PROMPT_RUNSHEET_SHAPE', 'run-sheet', 'run sheet must be an array or an object with a shots array');
        return null;
    }
    if (!Array.isArray(rawShots) || rawShots.length === 0) {
        sink.error('PROMPT_RUNSHEET_SHAPE', 'run-sheet', 'shots must be a non-empty array');
        return null;
    }
    const seen = new Set();
    const shots = [];
    for (const [index, item] of rawShots.entries()) {
        const at = `shots[${index}]`;
        if (!isRecord(item)) {
            sink.error('PROMPT_RUNSHEET_SHOT', at, 'each shot must be an object');
            continue;
        }
        const shotId = nonEmptyString(item['shot_id']);
        const promptText = nonEmptyString(item['prompt_text']);
        if (shotId === null)
            sink.error('PROMPT_RUNSHEET_SHOT', at, 'shot_id must be a non-empty string');
        if (promptText === null)
            sink.error('PROMPT_RUNSHEET_SHOT', at, 'prompt_text must be a non-empty string');
        if (shotId !== null && seen.has(shotId))
            sink.error('PROMPT_RUNSHEET_DUPLICATE', at, `shot_id ${shotId} is listed more than once`);
        if (shotId !== null)
            seen.add(shotId);
        if (shotId === null || promptText === null)
            continue;
        shots.push({ shot_id: shotId, prompt_text: promptText });
    }
    if (sink.errorCount > before)
        return null;
    return shots;
}
export function countPromptWords(text) {
    return text.match(WORD)?.length ?? 0;
}
/** First real sentence end at or after the start of `text`, or -1. Decimal points and abbreviations do not count. */
function sentenceEnd(text) {
    const finder = new RegExp(SENTENCE_END.source, 'g');
    for (let match = finder.exec(text); match !== null; match = finder.exec(text)) {
        if (match[0] !== '.')
            return match.index;
        const token = /([A-Za-z][A-Za-z.]*)$/.exec(text.slice(0, match.index))?.[1]?.toLowerCase() ?? '';
        if (ABBREVIATIONS.has(token))
            continue;
        return match.index;
    }
    return -1;
}
/** Every sentence that starts with `Camera:`, returned without its terminating punctuation. */
export function cameraSentences(text) {
    const finder = new RegExp(CAMERA_SENTENCE.source, 'gim');
    const sentences = [];
    for (let match = finder.exec(text); match !== null; match = finder.exec(text)) {
        const after = text.slice(match.index + match[0].length);
        const end = sentenceEnd(after);
        sentences.push(end === -1 ? after : after.slice(0, end));
    }
    return sentences;
}
/**
 * Count the moves in one `Camera:` sentence. `static` / `locked off` / `locked-off` count as one fixed-camera
 * choice, never as a second move. Every move term counts, because a sentence that contains any negation is
 * rejected before this count runs.
 */
export function countCameraMoves(sentence) {
    const fixed = STATIC_CAMERA.test(sentence) ? 1 : 0;
    const terms = sentence.match(new RegExp(CAMERA_MOVE.source, 'gi'))?.length ?? 0;
    return fixed + terms;
}
/**
 * The tail is everything from the last `Avoid:` to the end of the prompt, so trailing whitespace at the
 * end of the prompt (newlines included) is not part of the tail's content.
 */
function avoidTail(text) {
    const finder = new RegExp(AVOID.source, 'gi');
    let last = null;
    for (let match = finder.exec(text); match !== null; match = finder.exec(text))
        last = match;
    if (last === null)
        return null;
    return text.slice(last.index + last[0].length);
}
/**
 * Deterministic per-shot lint: 60 to 135 words, no em dash, no quotation marks, exactly one camera move,
 * and a final Avoid: tail naming on-screen text, subtitles and watermarks. Every failure names the shot_id.
 */
export function lintPromptText(shotId, text) {
    const failures = [];
    const add = (code, message) => {
        failures.push({ shot_id: shotId, code, message });
    };
    const words = countPromptWords(text);
    if (words < MIN_PROMPT_WORDS || words > MAX_PROMPT_WORDS)
        add('PROMPT_WORD_COUNT', `prompt has ${words} words; must be ${MIN_PROMPT_WORDS} to ${MAX_PROMPT_WORDS}`);
    if (EM_DASHES.some(dash => text.includes(dash)))
        add('PROMPT_EM_DASH', 'prompt contains an em dash or a long dash (U+2014, U+2015, U+2E3A, U+2E3B)');
    if (hasQuotationMark(text))
        add('PROMPT_QUOTATION', 'prompt contains a quotation mark');
    const sentences = cameraSentences(text);
    if (sentences.length !== 1) {
        add('PROMPT_CAMERA_SENTENCE', `prompt has ${sentences.length} Camera: sentences; exactly one sentence starting "Camera:" is required`);
    }
    else {
        const sentence = sentences[0];
        if (CAMERA_NEGATION.test(sentence)) {
            add('PROMPT_CAMERA_NEGATION', 'the Camera: sentence states the one move; put moves to avoid in the Avoid: tail');
        }
        else {
            const moves = countCameraMoves(sentence);
            if (moves !== 1)
                add('PROMPT_CAMERA_MOVES', `Camera: sentence has ${moves} camera moves; exactly one is required (pan, tilt, dolly, truck, track, zoom, orbit, crane, boom, pedestal, roll, arc, push in, pull back, follow, static, locked off)`);
        }
    }
    const tail = avoidTail(text);
    if (tail === null) {
        add('PROMPT_AVOID_TAIL', 'prompt does not end with an Avoid: tail naming on-screen text, subtitles and watermarks');
    }
    else {
        const content = tail.trimEnd();
        if (/[\n\r\u2028\u2029]/.test(content)) {
            add('PROMPT_AVOID_TAIL', 'keep the Avoid: tail on one line at the end of the prompt');
        }
        else if (/[.!?]\s+\S/.test(content)) {
            add('PROMPT_AVOID_TAIL', 'Avoid: must be the final sentence of the prompt');
        }
        else {
            const missing = [];
            if (!ON_SCREEN_TEXT.test(content))
                missing.push('on-screen text');
            if (!SUBTITLES.test(content))
                missing.push('subtitles');
            if (!WATERMARKS.test(content))
                missing.push('watermarks');
            if (missing.length > 0)
                add('PROMPT_AVOID_TAIL', `Avoid: tail is missing ${missing.join(', ')}`);
        }
    }
    return failures;
}
/** Run the lint over every shot and record one diagnostic per failure, keyed by shot_id. */
export function checkPromptRunSheet(shots, sink) {
    const failures = [];
    const failed = new Set();
    for (const shot of shots) {
        for (const failure of lintPromptText(shot.shot_id, shot.prompt_text)) {
            failures.push(failure);
            failed.add(failure.shot_id);
            sink.error(failure.code, failure.shot_id, failure.message);
        }
    }
    return { failures, failedShotIds: [...failed] };
}
