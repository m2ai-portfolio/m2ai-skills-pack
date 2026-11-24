import { existsSync, readFileSync } from 'node:fs';
import { loadDocument, resolveUnder } from './fsio.js';
import { briefSpec, caseSpec, trendSpec } from './model.js';
import { SOURCE_INDEX } from './observed.js';
/** W5.1: optional manual trend observation. Relative-interest metrics must never be labeled as search counts. */
export function validateTrends(path, root, sink) {
    const doc = loadDocument(path, trendSpec, 'trends', sink);
    if (doc === null)
        return null;
    const ids = existsSync(resolveUnder(root, SOURCE_INDEX)) ? new Set(JSON.parse(readFileSync(resolveUnder(root, SOURCE_INDEX), 'utf8')).files.map(f => f.id)) : new Set();
    doc.value.observations.forEach((obs, i) => {
        const base = `/observations/${i}`;
        if (!ids.has(obs.evidenceId))
            sink.error('TREND_EVIDENCE', `${base}/evidenceId`, `evidence ${obs.evidenceId} is not in the portable source index`);
        for (const [mi, metric] of obs.metrics.entries()) {
            if (/search(es)?\s*(volume|count)|\bsearches\b/i.test(`${metric.label} ${metric.value}`) && !/not /i.test(metric.note)) {
                sink.error('TREND_ABSOLUTE_VOLUME', `${base}/metrics/${mi}`, 'interest values are relative (0-100), not absolute search volume');
            }
            if (metric.kind === 'relative-interest' && !/relative/i.test(`${metric.label} ${metric.note}`))
                sink.error('TREND_UNLABELED_INTEREST', `${base}/metrics/${mi}`, 'relative-interest metrics must say they are relative');
        }
        if (obs.claimType === 'observed-artifact' && obs.statedSource.trim().toLowerCase() !== 'unknown' && !/screenshot|displayed|stated/i.test(obs.statedSource)) {
            sink.warn('TREND_SOURCE_CLAIM', `${base}/statedSource`, 'a stated source must be what the screenshot displays; otherwise record "unknown"');
        }
    });
    return doc.value;
}
export function validateCase(path, root, sink) {
    const doc = loadDocument(path, caseSpec, 'case', sink);
    if (doc === null)
        return null;
    const index = JSON.parse(readFileSync(resolveUnder(root, SOURCE_INDEX), 'utf8'));
    const byId = new Map(index.files.map(f => [f.id, f.sha256]));
    const known = new Set(byId.keys());
    const cited = [...doc.value.evidenceIds, ...doc.value.claims.flatMap(c => c.evidenceIds)];
    for (const evidenceId of cited)
        if (!known.has(evidenceId))
            sink.error('CASE_EVIDENCE', '/evidenceIds', `unknown evidence ID ${evidenceId}`);
    const hashes = new Set(index.files.map(f => f.sha256));
    for (const raw of doc.value.rawAttachments) {
        if (byId.get(raw.sourceId) !== raw.sha256)
            sink.error('CASE_RAW_HASH', '/rawAttachments', `raw attachment ${raw.sourceId} hash differs from the portable index`);
        if (!hashes.has(raw.sha256))
            sink.error('CASE_RAW_HASH', '/rawAttachments', `hash ${raw.sha256} unknown`);
    }
    if (doc.value.claims.some(c => c.claimType === 'proposal'))
        sink.warn('CASE_PROPOSAL_AS_CLAIM', '/claims', 'proposals belong in improvements, not claims');
    return doc.value;
}
export function validateBrief(path, sink, label = 'brief') {
    const doc = loadDocument(path, briefSpec, label, sink);
    if (doc === null)
        return null;
    const seen = new Set();
    for (const req of doc.value.requirements) {
        if (seen.has(req.id))
            sink.error('DUPLICATE_REQUIREMENT_ID', '/requirements', `duplicate requirement ${req.id}`);
        seen.add(req.id);
    }
    return doc.value;
}
