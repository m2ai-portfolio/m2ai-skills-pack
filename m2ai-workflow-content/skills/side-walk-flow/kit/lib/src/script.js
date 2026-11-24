import { writerPersona } from './persona.js';
export const DEFAULT_SPEAKERS = Object.freeze([
    Object.freeze({ name: 'Narrator', action: 'speaks softly' }),
    Object.freeze({ name: 'Walker', action: 'pauses' })
]);
const QUOTE_MARKS = /["“”„‟«»‹›`‘‛″＂「」『』]/g;
// A straight or curly single quote is an apostrophe only when letters or digits sit on both sides (don't); anywhere else it is a quotation delimiter.
const LONE_SINGLE = /(?<![\p{L}\p{N}])['’]|['’](?![\p{L}\p{N}])/u;
const LONE_SINGLE_ALL = new RegExp(LONE_SINGLE.source, 'gu');
const QUOTE_ANY = /["“”„‟«»‹›`‘‛″＂「」『』]/;
function hasQuote(s) {
    return QUOTE_ANY.test(s) || LONE_SINGLE.test(s);
}
/** True when text contains a quotation mark. An apostrophe inside a word (don't, don’t) is not a quotation mark. */
export function hasQuotationMark(s) {
    return hasQuote(s);
}
/** Remove quotation marks. Apostrophes inside words (don't, don’t) are kept; every other single quote is dropped. */
export function stripQuotes(s) {
    return s
        .replace(QUOTE_MARKS, '')
        .replace(LONE_SINGLE_ALL, '')
        .replace(/\s+/g, ' ')
        .trim();
}
function clean(s) {
    return stripQuotes(s).replace(/:/g, ' -').replace(/\s+/g, ' ').trim();
}
function trendFacts(trends) {
    if (trends === undefined)
        return [];
    const facts = [];
    for (const o of trends.observations) {
        const topic = o.chosenTopic ?? o.query;
        const metric = o.metrics[0];
        facts.push(metric ? `${topic}: ${metric.label} ${metric.value} (${o.geography}, ${o.period})` : `${topic} (${o.geography}, ${o.period})`);
    }
    return facts;
}
function sentence(s) {
    const t = clean(s);
    return /[.!?]$/.test(t) ? t : `${t}.`;
}
export function writeScript(input) {
    const persona = writerPersona(input.personaRequest ?? { briefId: input.brief.briefId }, input.selector);
    const speakers = input.speakers ?? DEFAULT_SPEAKERS;
    if (speakers.length === 0)
        throw new Error('at least one speaker is required');
    for (const sp of speakers) {
        if (clean(sp.name) === '' || clean(sp.action) === '')
            throw new Error('speaker name and action must be non-empty');
    }
    const facts = trendFacts(input.trends);
    const beats = input.brief.requirements.map((req, i) => {
        const sp = speakers[i % speakers.length];
        const fact = facts.length > 0 ? facts[i % facts.length] : undefined;
        const voiceover = sentence(req.wording);
        const line = `${clean(sp.name)} ${clean(sp.action)}: ${sentence(fact ?? req.wording)}`;
        return { requirementId: req.id, voiceover, dialogue: [line] };
    });
    return { briefId: input.brief.briefId, personaId: persona.id, beats };
}
/** QA for the format rules. Returns problems; empty means pass. */
export function checkScript(script) {
    const problems = [];
    if (script.beats.length === 0)
        problems.push('script has no beats');
    script.beats.forEach((b, i) => {
        const at = `beat ${i + 1} (${b.requirementId})`;
        if (b.voiceover.trim() === '')
            problems.push(`${at}: empty voiceover`);
        if (hasQuote(b.voiceover))
            problems.push(`${at}: quotation mark in voiceover`);
        if (b.dialogue.length === 0)
            problems.push(`${at}: no dialogue`);
        for (const line of b.dialogue) {
            if (hasQuote(line))
                problems.push(`${at}: quotation mark in dialogue: ${line}`);
            const m = /^([^:]+?): (\S.*)$/.exec(line);
            if (m === null)
                problems.push(`${at}: dialogue must be speaker action, colon, words: ${line}`);
            else if (!/\s/.test(m[1].trim()))
                problems.push(`${at}: speaker action missing before colon: ${line}`);
        }
    });
    return problems;
}
/** Plain-text script for the reply: VO and dialogue per beat. */
export function renderScript(script) {
    return script.beats
        .map((b, i) => [`Beat ${i + 1} (${b.requirementId})`, `VOICEOVER: ${b.voiceover}`, ...b.dialogue].join('\n'))
        .join('\n\n') + '\n';
}
