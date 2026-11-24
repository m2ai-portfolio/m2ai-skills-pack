// QA pass: validates a script and its Veo prompts against the semantic-review checklist items it can check without a model.
// Pure; no I/O, no network. It does not replace the human review (one focused moment, beats semantically distinct).
import { REQUIRED_CHECKLIST } from './approvals.js';
import { checkScript } from './script.js';
import { checkVeoPrompt, normalizeAssetText } from './veo.js';
const ASSET_PROBLEM = /continuity|character asset|visible character/;
export function qaPass(input) {
    const items = { 'prompt-vs-structure': [], 'character-descriptions-vs-assets': [] };
    const add = (p) => { items[ASSET_PROBLEM.test(p) ? 'character-descriptions-vs-assets' : 'prompt-vs-structure'].push(p); };
    checkScript(input.script).forEach(add);
    for (const shot of input.shots) {
        if (!input.prompts.some(p => p.shotId === shot.id))
            add(`prompt ${shot.id}: shot has no prompt`);
    }
    for (const p of input.prompts) {
        const shot = input.shots.find(s => s.id === p.shotId);
        if (shot === undefined) {
            add(`prompt ${p.shotId}: no such shot`);
            continue;
        }
        const scene = input.scenes.find(s => s.id === shot.sceneId);
        checkVeoPrompt(p, shot, scene, input.assets).forEach(add);
        for (const c of input.assets.filter(a => a.kind === 'character' && shot.visible.includes(a.id))) {
            if (!p.subject.includes(normalizeAssetText(c.name)) || !p.subject.includes(normalizeAssetText(c.description)))
                add(`prompt ${p.shotId}: visible character ${c.name} not described as its asset`);
        }
    }
    return { items, pass: Object.values(items).every(v => v.length === 0) };
}
/** Checklist ids the QA pass reports on; every one must be a required semantic-review item, listed once. */
export const QA_ITEM_IDS = ['prompt-vs-structure', 'character-descriptions-vs-assets'];
export function checklistHasDuplicates(ids) {
    return ids.filter((id, i) => ids.indexOf(id) !== i);
}
export const QA_ITEMS_ARE_REQUIRED = QA_ITEM_IDS.every(id => REQUIRED_CHECKLIST['semantic-review'].includes(id));
