import { allShotFingerprints } from './fingerprint.js';
import { approvalsSpec } from './model.js';
import { loadDocument, parseDocument } from './fsio.js';
export const REQUIRED_CHECKLIST = {
    'creative-approval': ['whole-plan-approved', 'generated-additions-reviewed', 'deferrals-acknowledged'],
    'semantic-review': ['prompt-vs-structure', 'character-descriptions-vs-assets', 'scene-beats-supported', 'camera-vs-final-composition']
};
/**
 * What each required item asks a reviewer to confirm. Prompt structure and character assets extend the existing
 * prompt-vs-structure and character-descriptions-vs-assets items; no id is added, so no item can be listed twice.
 */
export const CHECKLIST_CRITERIA = {
    'whole-plan-approved': 'whole-plan-approved',
    'generated-additions-reviewed': 'generated-additions-reviewed',
    'deferrals-acknowledged': 'deferrals-acknowledged',
    'prompt-vs-structure': 'Each prompt matches its shot structure: subject, context, action and style present; camera motion, composition and ambiance in the text when the shot has them; dialogue as speaker action, colon, words with no quotation marks; one focused moment in one place; script voiceover and dialogue follow the same format',
    'character-descriptions-vs-assets': 'Each prompt describes its visible characters as their character assets do (name and description), and its continuity note names the shot location and every referenced character asset exactly, one per line, for Flow Jump To',
    'scene-beats-supported': 'scene-beats-supported',
    'camera-vs-final-composition': 'camera-vs-final-composition'
};
export function checklistItem(id) {
    return CHECKLIST_CRITERIA[id] ?? id;
}
export function loadApprovals(path, sink) {
    return loadDocument(path, approvalsSpec, 'approvals', sink);
}
export function parseApprovals(bytes, sink) {
    return parseDocument(bytes, approvalsSpec, 'approvals', sink);
}
/**
 * Accepted-state gate. A receipt only counts when it carries the exact current plan SHA-256, a passing verdict,
 * a fully passing required checklist and (semantic) one current, passing attestation per current shot.
 */
export function checkAcceptance(plan, planSha256, approvals, sink, options) {
    const result = { creative: null, semantic: null, synthetic: false, staleShotIds: [] };
    if (approvals === null) {
        sink.error('APPROVAL_MISSING', 'approvals', 'no approvals file was supplied; the plan is validation-only');
        return result;
    }
    if (approvals.planId !== plan.planId)
        sink.error('APPROVAL_PLAN_ID', '/planId', `approvals are for ${approvals.planId}, plan is ${plan.planId}`);
    for (const [index, receipt] of approvals.receipts.entries()) {
        if (approvals.receipts.findIndex(other => other.receiptId === receipt.receiptId) !== index)
            sink.error('RECEIPT_DUPLICATE_ID', `/receipts/${index}`, `duplicate receipt ID ${receipt.receiptId}`);
        if (receipt.synthetic && receipt.syntheticLabel === undefined)
            sink.error('SYNTHETIC_UNLABELED', `/receipts/${index}`, 'synthetic receipts need a syntheticLabel');
        if (!receipt.synthetic && receipt.syntheticLabel !== undefined)
            sink.error('SYNTHETIC_UNLABELED', `/receipts/${index}`, 'syntheticLabel on a non-synthetic receipt');
    }
    for (const type of plan.approvalsRequired) {
        const ofType = approvals.receipts.filter(r => r.type === type);
        const current = ofType.filter(r => r.planSha256 === planSha256);
        const receipt = current[current.length - 1];
        if (receipt === undefined) {
            if (ofType.length > 0) {
                const old = ofType.map(r => r.planSha256.slice(0, 12)).join(', ');
                sink.error('APPROVAL_STALE', `/receipts[type=${type}]`, `${type} receipt(s) are for older plan bytes (${old}); current plan is ${planSha256.slice(0, 12)}`, 'any plan edit, even formatting, needs a new receipt');
            }
            else
                sink.error('APPROVAL_MISSING', `/receipts[type=${type}]`, `no ${type} receipt`);
            if (type === 'semantic-review') {
                // Identify what a reviewer must revisit even without a current receipt: use the latest older one.
                const latest = ofType[ofType.length - 1];
                if (latest !== undefined)
                    result.staleShotIds = staleAgainst(plan, latest, sink, true);
            }
            continue;
        }
        if (receipt.synthetic)
            result.synthetic = true;
        if (receipt.synthetic && !options.allowSynthetic)
            sink.error('SYNTHETIC_RECEIPT', `/receipts/${receipt.receiptId}`, `${type} receipt ${receipt.receiptId} is synthetic test data, not human approval`, 'pass --allow-synthetic only for automated fixtures');
        if (receipt.verdict !== 'pass')
            sink.error('APPROVAL_NOT_PASSING', `/receipts/${receipt.receiptId}`, `${type} verdict is ${receipt.verdict}`);
        const checklistPath = `/receipts/${receipt.receiptId}/checklist`;
        const seenIds = new Set();
        for (const item of receipt.checklist) {
            if (seenIds.has(item.id))
                sink.error('CHECKLIST_DUPLICATE', checklistPath, `checklist item ${item.id} appears more than once; contradictory entries cannot count as a passing review`);
            seenIds.add(item.id);
            if (item.result !== 'pass')
                sink.error('CHECKLIST_NOT_PASSING', checklistPath, `checklist item ${item.id} is ${item.result}`);
        }
        for (const required of REQUIRED_CHECKLIST[type]) {
            if (!seenIds.has(required))
                sink.error('CHECKLIST_INCOMPLETE', checklistPath, `missing checklist item ${required}`);
        }
        if (receipt.evidence.length === 0)
            sink.error('EVIDENCE_MISSING', `/receipts/${receipt.receiptId}/evidence`, 'receipt carries no evidence links');
        if (type === 'creative-approval')
            result.creative = receipt;
        else {
            result.semantic = receipt;
            result.staleShotIds = staleAgainst(plan, receipt, sink, false);
        }
    }
    return result;
}
/** Exact set comparison between a semantic receipt and the current shots. Returns shot IDs needing review. */
function staleAgainst(plan, receipt, sink, receiptIsForOldPlan) {
    const attestations = receipt.shotAttestations;
    const base = `/receipts/${receipt.receiptId}/shotAttestations`;
    const current = allShotFingerprints(plan);
    const needs = new Set();
    if (attestations === undefined) {
        sink.error('SEMANTIC_ATTESTATIONS_MISSING', base, 'semantic review has no per-shot attestations');
        return [...current.keys()];
    }
    const counts = new Map();
    for (const a of attestations)
        counts.set(a.shotId, (counts.get(a.shotId) ?? 0) + 1);
    const severity = receiptIsForOldPlan ? 'info' : 'error';
    for (const [shotId, count] of counts) {
        if (!current.has(shotId))
            sink.add(severity, 'SEMANTIC_ATTESTATION_UNKNOWN', base, `attestation for shot ${shotId}, which is not in the current plan`);
        if (count > 1)
            sink.add(severity, 'SEMANTIC_ATTESTATION_DUPLICATE', base, `shot ${shotId} is attested ${count} times`);
    }
    for (const [shotId, now] of current) {
        const attestation = attestations.find(a => a.shotId === shotId);
        if (attestation === undefined) {
            needs.add(shotId);
            sink.add(severity, 'SEMANTIC_ATTESTATION_MISSING', base, `shot ${shotId} has no attestation`, 'all current shots need entries');
            continue;
        }
        const changedAssets = new Set();
        for (const assetId of new Set([...Object.keys(now.assetFingerprints), ...Object.keys(attestation.assetFingerprints)])) {
            if (now.assetFingerprints[assetId] !== attestation.assetFingerprints[assetId])
                changedAssets.add(assetId);
        }
        if (attestation.fingerprint !== now.fingerprint || changedAssets.size > 0) {
            needs.add(shotId);
            const why = changedAssets.size > 0 ? `dependent asset(s) changed or re-scoped: ${[...changedAssets].sort().join(', ')}` : 'shot content changed';
            sink.add(severity, 'SEMANTIC_ATTESTATION_STALE', base, `shot ${shotId} attestation is outdated; ${why}`, 'review the dependent prompt and attest its current fingerprint, even if the text is retained');
            continue;
        }
        if (attestation.evidence.length === 0)
            sink.add(severity, 'SEMANTIC_EVIDENCE_MISSING', base, `shot ${shotId} attestation has no review evidence`);
        if (attestation.verdict === 'fail')
            sink.add(severity, 'SEMANTIC_ATTESTATION_FAIL', base, `shot ${shotId} attestation verdict is fail`);
        if (attestation.verdict === 'unverified')
            sink.add(severity, 'SEMANTIC_ATTESTATION_UNVERIFIED', base, `shot ${shotId} attestation verdict is unverified`);
    }
    return [...needs].sort();
}
/** Template for a reviewer: current fingerprints, every verdict unverified until a person inspects the text. */
export function semanticTemplate(plan, planSha256) {
    const shotAttestations = [...allShotFingerprints(plan).values()].map(f => ({
        shotId: f.shotId,
        fingerprint: f.fingerprint,
        assetFingerprints: f.assetFingerprints,
        verdict: 'unverified',
        evidence: []
    }));
    return {
        receiptId: 'TEMPLATE-semantic-review',
        type: 'semantic-review',
        synthetic: false,
        planSha256,
        reviewer: { id: 'unassigned', name: 'unassigned' },
        reviewedAt: '1970-01-01T00:00:00Z',
        verdict: 'unverified',
        evidence: [],
        checklist: REQUIRED_CHECKLIST['semantic-review'].map(id => ({ id, item: checklistItem(id), result: 'unverified' })),
        shotAttestations
    };
}
export function creativeTemplate(planSha256) {
    return {
        receiptId: 'TEMPLATE-creative-approval',
        type: 'creative-approval',
        synthetic: false,
        planSha256,
        reviewer: { id: 'unassigned', name: 'unassigned' },
        reviewedAt: '1970-01-01T00:00:00Z',
        verdict: 'unverified',
        evidence: [],
        checklist: REQUIRED_CHECKLIST['creative-approval'].map(id => ({ id, item: checklistItem(id), result: 'unverified' }))
    };
}
