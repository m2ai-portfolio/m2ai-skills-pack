import { existsSync, readFileSync } from 'node:fs';
import { parseCsv } from './csv.js';
import { DiagnosticSink } from './diag.js';
import { readHashed, resolveUnder } from './fsio.js';
import { analyzePlan, loadPlan } from './plan.js';
export const SOURCE_INDEX = 'evidence/source-index.json';
export const SPEC_SHA256 = '7987cfa9fca264ec17182d7823556ffc8bb73c1bb130d97d8286d64b9b6b4e7c';
/** W1.3: validate every source hash from the portable index (never originalPath host paths) and the original manifest. */
export function verifySources(root) {
    const sink = new DiagnosticSink();
    const verified = [];
    const indexPath = resolveUnder(root, SOURCE_INDEX);
    if (!existsSync(indexPath)) {
        sink.error('SOURCE_INDEX_MISSING', SOURCE_INDEX, 'portable source index is missing');
        return { sink, verified };
    }
    const index = JSON.parse(readFileSync(indexPath, 'utf8'));
    if (index.specificationSha256 !== SPEC_SHA256)
        sink.error('SPEC_PIN', SOURCE_INDEX, 'index does not pin the revision-2 specification hash');
    for (const file of index.files) {
        const full = resolveUnder(root, file.path);
        if (!existsSync(full)) {
            sink.error('SOURCE_MISSING', file.path, `${file.id} copy is missing`);
            continue;
        }
        const actual = readHashed(full).sha256;
        if (actual !== file.sha256)
            sink.error('SOURCE_HASH', file.path, `${file.id} hash mismatch (expected ${file.sha256}, found ${actual})`);
        else
            verified.push({ id: file.id, path: file.path, sha256: actual });
    }
    const manifest = JSON.parse(readFileSync(resolveUnder(root, 'evidence/review/source-manifest.json'), 'utf8'));
    const known = new Set(index.files.map(f => f.sha256));
    for (const entry of manifest.files) {
        if (!known.has(entry.sha256))
            sink.error('MANIFEST_NOT_PORTABLE', entry.path, `original manifest hash ${entry.sha256} has no portable copy in the index`);
    }
    return { sink, verified };
}
/** Each entry must match exactly one observed diagnostic: these are the KNOWN defects of the supplied sample. */
export const KNOWN_OBSERVED_DEFECTS = [
    { code: 'MISSING_REFERENCE', contains: 'obs-s3-sh1: visible character GUY' },
    { code: 'MISSING_REFERENCE', contains: 'obs-s3-sh1: visible character YUKIKAZE' },
    { code: 'BEAT_UNCOVERED', contains: 'obs-s1-b4' },
    { code: 'BEAT_UNCOVERED', contains: 'obs-s2-b4' },
    { code: 'BEAT_UNCOVERED', contains: 'obs-s2-b5' },
    { code: 'BEAT_UNCOVERED', contains: 'obs-s2-b6' },
    { code: 'BEAT_UNCOVERED', contains: 'obs-s2-b7' },
    { code: 'REQUIREMENT_ABSENT', contains: 'REQ-SPORTS-CARS' },
    { code: 'REQUIREMENT_ABSENT', contains: 'REQ-EXPLORE' },
    { code: 'CAMERA_FINAL_COMPOSITION', contains: 'obs-s3-sh2' },
    { code: 'OBSERVED_DURATION_NOT_EXACT_MINUTE', contains: '66' }
];
/** Diagnose the diagnostic-only observed fixture without repairing it or suppressing its defects. */
export function diagnoseObserved(root, planRel) {
    const sink = new DiagnosticSink();
    const loaded = loadPlan(root, planRel, sink);
    const report = { sink, rows: 0, observedSeconds: 0, known: [], unexpected: [], missingKnown: [], transcriptionProblems: [] };
    if (loaded === null)
        return report;
    if (loaded.plan.profile !== 'observed') {
        sink.error('NOT_OBSERVED', '/profile', 'diagnose-observed requires the observed profile');
        return report;
    }
    analyzePlan(loaded, root, sink);
    report.observedSeconds = loaded.plan.shots.reduce((n, s) => n + s.durationSeconds, 0);
    const csv = parseCsv(readFileSync(resolveUnder(root, 'evidence/raw/movie-pack/shots.csv'), 'utf8'));
    const rows = csv.slice(1);
    report.rows = rows.length;
    if (rows.length !== loaded.plan.shots.length)
        report.transcriptionProblems.push(`fixture has ${loaded.plan.shots.length} shots, raw CSV has ${rows.length}`);
    const nameOf = new Map(loaded.plan.assets.map(a => [a.id, a.name]));
    const shots = [...loaded.plan.shots].sort((a, b) => a.order - b.order);
    const sceneOrder = new Map(loaded.plan.scenes.map(s => [s.id, s.order]));
    const ordered = shots.sort((a, b) => (sceneOrder.get(a.sceneId) ?? 0) - (sceneOrder.get(b.sceneId) ?? 0) || a.order - b.order);
    ordered.forEach((shot, i) => {
        const row = rows[i];
        if (row === undefined)
            return;
        const [scene, shotNo, type, location, characters, dialogue, duration, references, description] = row;
        if (scene !== String(sceneOrder.get(shot.sceneId)) || shotNo !== String(shot.order))
            report.transcriptionProblems.push(`${shot.id}: scene/shot numbers differ from CSV`);
        if (type !== shot.type)
            report.transcriptionProblems.push(`${shot.id}: type differs`);
        if (location !== nameOf.get(shot.locationId))
            report.transcriptionProblems.push(`${shot.id}: location differs`);
        if (characters !== shot.visible.map(v => nameOf.get(v) ?? v).join('; '))
            report.transcriptionProblems.push(`${shot.id}: characters differ`);
        if (dialogue !== shot.dialogue.map(l => l.text).join(' '))
            report.transcriptionProblems.push(`${shot.id}: dialogue differs`);
        if (duration !== String(shot.durationSeconds))
            report.transcriptionProblems.push(`${shot.id}: duration differs`);
        if (references !== shot.references.map(v => nameOf.get(v) ?? v).join('; '))
            report.transcriptionProblems.push(`${shot.id}: references differ`);
        if (description !== shot.promptText)
            report.transcriptionProblems.push(`${shot.id}: description differs`);
    });
    const unmatched = [...KNOWN_OBSERVED_DEFECTS];
    for (const item of sink.items) {
        if (item.severity === 'info')
            continue;
        const at = unmatched.findIndex(k => k.code === item.code && (item.message.includes(k.contains) || item.path.includes(k.contains)));
        if (at >= 0) {
            unmatched.splice(at, 1);
            report.known.push(item);
        }
        else if (item.severity === 'error' || item.code === 'CAMERA_FINAL_COMPOSITION')
            report.unexpected.push(item);
    }
    report.missingKnown = unmatched;
    return report;
}
