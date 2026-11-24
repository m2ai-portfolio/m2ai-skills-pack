import { arr, bool, id, lit, nullable, num, obj, oneOf, rec, sha, str, text } from './spec.js';
export const SCHEMA_VERSION = 1;
const provenance = oneOf('authored', 'generated', 'unknown');
const approvalType = oneOf('creative-approval', 'semantic-review');
const verdict = oneOf('pass', 'fail', 'unverified');
const onOff = oneOf('on', 'off', 'undecided');
function buildPlanSpec(version) {
    return obj({
        schemaVersion: lit(version),
        kind: lit('devastator.plan'),
        profile: oneOf('proposed', 'observed'),
        planId: id,
        revision: num({ int: true, min: 1 }),
        caseId: id,
        briefRevision: num({ int: true, min: 1 }),
        title: text,
        profileNote: text,
        durationPolicy: obj({ mode: oneOf('exact', 'tolerance', 'observed'), targetSeconds: num({ positive: true }), toleranceSeconds: num({ positive: true }), approvedBy: text }, ['toleranceSeconds', 'approvedBy']),
        inputs: arr(obj({ id, role: oneOf('brief', 'source-manifest', 'schema', 'context-packet', 'evidence'), path: text, sha256: sha })),
        assets: arr(obj({ id, kind: oneOf('character', 'location', 'voice', 'object'), name: text, description: text, provenance, provenanceNote: text, voiceAssetId: id }, ['voiceAssetId'])),
        scenes: arr(obj({
            id,
            order: num({ int: true, min: 1 }),
            title: text,
            locationId: id,
            summary: text,
            provenance,
            beats: arr(obj({ id, text, support: arr(obj({ shotId: id, beatId: id })), excludedRationale: text }, ['excludedRationale']))
        })),
        shots: arr(obj({
            id,
            sceneId: id,
            order: num({ int: true, min: 1 }),
            type: oneOf('establishing', 'dialogue', 'action', 'transition', 'insert'),
            durationSeconds: num({ positive: true }),
            locationId: id,
            beats: arr(obj({ id, text })),
            references: arr(id),
            visible: arr(id),
            camera: obj({ opening: text, motion: str(), ending: str() }),
            finalComposition: text,
            dialogue: arr(obj({ speakerId: id, text, offscreen: bool })),
            promptText: text,
            ...(version === 2 ? { voiceover: str() } : {}),
            provenance
        }, version === 2 ? ['finalComposition', 'voiceover'] : ['finalComposition'])),
        requirements: arr(obj({ id, treatment: oneOf('included', 'hinted', 'deferred', 'unresolved', 'absent'), shotIds: arr(id), rationale: str(), creatorApprovalRequired: bool })),
        additions: arr(obj({ id, description: text, provenance: oneOf('generated', 'proposal'), shotIds: arr(id), material: bool })),
        output: obj({ subtitles: onOff, music: onOff, audioLeveling: onOff, generationSettings: text }),
        approvalsRequired: arr(approvalType, 1)
    }, [], `Devastator editable canonical plan (schema version ${version}).`);
}
/** Keep legacy schema identity unchanged; v2 adds optional narration only. */
export const planSpec = buildPlanSpec(1);
export const planV2Spec = buildPlanSpec(2);
const evidence = arr(obj({ ref: text, note: str() }));
export const approvalsSpec = obj({
    schemaVersion: lit(SCHEMA_VERSION),
    kind: lit('devastator.approvals'),
    planId: id,
    receipts: arr(obj({
        receiptId: id,
        type: approvalType,
        synthetic: bool,
        syntheticLabel: text,
        planSha256: sha,
        reviewer: obj({ id: text, name: text }),
        reviewedAt: str({ pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z$' }),
        verdict,
        evidence,
        checklist: arr(obj({ id, item: text, result: verdict })),
        shotAttestations: arr(obj({ shotId: id, fingerprint: sha, assetFingerprints: rec(sha), verdict, evidence }))
    }, ['syntheticLabel', 'shotAttestations']))
}, [], 'Local approval/semantic-review receipts. Attestations, not cryptographic proof of reviewer identity.');
export const clipsSpec = obj({
    schemaVersion: lit(SCHEMA_VERSION),
    kind: lit('devastator.clips'),
    planId: id,
    selections: arr(obj({
        shotId: id,
        shotFingerprint: sha,
        planRevision: num({ int: true, min: 1 }),
        planSha256: sha,
        takeId: id,
        file: text,
        resolvedFile: text,
        sha256: sha,
        bytes: num({ int: true, min: 0 }),
        silent: bool,
        expectedDurationSeconds: num({ positive: true }),
        observedDurationSeconds: nullable(num({ positive: true })),
        status: lit('selected')
    })),
    pending: arr(obj({ shotId: id, forShotFingerprint: sha, takeId: id, file: text, resolvedFile: text, sha256: sha, bytes: num({ int: true, min: 0 }) }))
}, [], 'Explicit shot-to-take selections. Hashes prove file bytes only; no audiovisual content is checked.');
const claimType = oneOf('observed-artifact', 'creator-recollection', 'vendor-claim', 'inference', 'proposal');
export const briefSpec = obj({
    schemaVersion: lit(SCHEMA_VERSION),
    kind: lit('devastator.brief'),
    briefId: id,
    revision: num({ int: true, min: 1 }),
    sourceNote: text,
    requirements: arr(obj({ id, wording: text, claimType, evidenceIds: arr(id, 1) }), 1),
    unknowns: arr(obj({ id, text, status: lit('unknown') }))
}, [], 'Creator brief with stable requirement IDs and original wording.');
export const caseSpec = obj({
    schemaVersion: lit(SCHEMA_VERSION),
    kind: lit('devastator.case'),
    caseId: id,
    target: obj({ name: text, version: nullable(text), observationDate: str({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }), access: arr(text) }),
    evidenceIds: arr(id, 1),
    rawAttachments: arr(obj({ sourceId: id, originalPath: text, sha256: sha })),
    originalInputStatus: text,
    unknowns: arr(obj({ id, text })),
    claims: arr(obj({ id, text, claimType, evidenceIds: arr(id) })),
    improvements: arr(obj({ id, text, claimType: lit('proposal') })),
    limits: arr(text)
}, [], 'Reusable per-target reverse-engineering case record.');
export const trendSpec = obj({
    schemaVersion: lit(SCHEMA_VERSION),
    kind: lit('devastator.trends'),
    observations: arr(obj({
        id,
        query: text,
        geography: text,
        period: text,
        captureDate: str({ pattern: '^\\d{4}-\\d{2}-\\d{2}$|^unknown$' }),
        evidenceId: id,
        claimType,
        metrics: arr(obj({ label: text, value: text, kind: oneOf('relative-interest', 'change', 'status'), note: str() })),
        statedSource: text,
        calculation: text,
        geographyDifferences: arr(obj({ field: text, value: text, comparedWith: text, note: str() })),
        chosenTopic: nullable(text)
    })),
    recollections: arr(obj({ id, text, claimType: lit('creator-recollection') })),
    limits: arr(text)
}, [], 'Optional manual Trend Finder observation. Not a scraper, predictor, or ranking engine.');
export const committedSpec = obj({
    schemaVersion: lit(SCHEMA_VERSION),
    kind: lit('devastator.committed'),
    generator: text,
    planId: id,
    planRevision: num({ int: true, min: 1 }),
    planSha256: sha,
    approvalsSha256: sha,
    synthetic: bool,
    syntheticNote: str(),
    inputs: arr(obj({ path: text, sha256: sha })),
    receipts: arr(obj({ type: approvalType, receiptId: id, synthetic: bool })),
    files: arr(obj({ path: text, sha256: sha, bytes: num({ int: true, min: 0 }) }), 1),
    claims: text
}, [], 'Written last by an atomic no-replace hard link; a pack without a matching marker is incomplete.');
export const SPECS = {
    plan: planSpec,
    'plan-v2': planV2Spec,
    approvals: approvalsSpec,
    clips: clipsSpec,
    brief: briefSpec,
    case: caseSpec,
    trends: trendSpec,
    committed: committedSpec
};
