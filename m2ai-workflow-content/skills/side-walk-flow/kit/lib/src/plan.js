import { existsSync } from 'node:fs';
import { sha256Hex } from './canon.js';
import { DiagnosticSink } from './diag.js';
import { allShotFingerprints } from './fingerprint.js';
import { planSpec, planV2Spec } from './model.js';
import { isSafeRelativePath, parseDocument, prettyJson, readHashed, resolveUnder } from './fsio.js';
import { toJsonSchema } from './spec.js';
import { SPECS } from './model.js';
import { readFileSync } from 'node:fs';
import { validateBrief, validateCase } from './records.js';
export const PLAN_SCHEMA_PATH = 'evidence/schemas/plan.schema.json';
export const PLAN_V2_SCHEMA_PATH = 'evidence/schemas/plan-v2.schema.json';
export const planSchemaName = (plan) => plan.schemaVersion === 2 ? 'plan-v2' : 'plan';
export const planSchemaPath = (plan) => plan.schemaVersion === 2 ? PLAN_V2_SCHEMA_PATH : PLAN_SCHEMA_PATH;
export const CASE_RECORD_PATH = 'deliverables/case/case-record.json';
export const BRIEF_PATH = 'deliverables/brief/brief.json';
export const SOURCE_MANIFEST_PATH = 'evidence/review/source-manifest.json';
/** Frozen drafting packet per profile (documented in kit/README.md). */
export const CONTEXT_PACKET_PATHS = { proposed: 'deliverables/proposed/context-packet.md', observed: 'deliverables/observed/transcription-packet.md' };
export function requiredRoleBindings(profile) {
    return [
        { role: 'brief', tag: 'BRIEF', path: BRIEF_PATH },
        { role: 'source-manifest', tag: 'MANIFEST', path: SOURCE_MANIFEST_PATH },
        { role: 'context-packet', tag: 'PACKET', path: CONTEXT_PACKET_PATHS[profile] }
    ];
}
export function schemaDocument(name) {
    const spec = Object.hasOwn(SPECS, name) ? SPECS[name] : undefined;
    if (spec === undefined)
        throw new Error(`unknown schema ${name}`);
    return prettyJson({ $schema: 'https://json-schema.org/draft/2020-12/schema', $id: `devastator/${name}.schema.json`, title: `Devastator ${name}`, ...toJsonSchema(spec) });
}
/** Version dispatch retains precise unknown-field/type errors and strict legacy parsing. */
export function parsePlanDocument(bytes, label, sink) {
    let value;
    try {
        value = JSON.parse(bytes.toString('utf8'));
    }
    catch {
        return parseDocument(bytes, planSpec, label, sink);
    }
    const version = typeof value === 'object' && value !== null ? value.schemaVersion : undefined;
    const parsed = parseDocument(bytes, version === 2 ? planV2Spec : planSpec, label, sink);
    if (version === 1)
        for (const d of sink.items) {
            if (d.code === 'SCHEMA_UNKNOWN_FIELD' && d.path.endsWith('/voiceover'))
                d.hint = 'Migrate this project to plan schema v2 before adding voiceover (POST /api/migrate-plan with baseRevision).';
        }
    return parsed;
}
export function loadPlan(root, relPath, sink) {
    if (!isSafeRelativePath(relPath)) {
        sink.error('PATH_UNSAFE', relPath, 'plan path must be repository-relative without ".."');
        return null;
    }
    let bytes;
    try {
        bytes = readFileSync(resolveUnder(root, relPath));
    }
    catch (error) {
        sink.error('FILE_READ', '', `cannot read ${relPath}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
    const doc = parsePlanDocument(bytes, '', sink);
    if (doc === null)
        return null;
    return { doc, plan: doc.value, sha256: doc.sha256, relPath };
}
/** The brief is always the canonical current brief file, never whichever input the plan happens to declare first. */
export function loadBrief(root, _plan, sink) {
    const full = resolveUnder(root, BRIEF_PATH);
    if (!existsSync(full))
        return null;
    const local = new DiagnosticSink();
    const brief = validateBrief(full, local, BRIEF_PATH);
    for (const item of local.items)
        sink.items.push(item);
    return brief === null || local.errorCount > 0 ? null : brief;
}
const MOVING = /pull[- ]?back|push|zoom|tracking|handheld|drift|pan\b|dolly|orbit|crane/i;
const STATIC_OPENING = /locked[- ]off|static/i;
const WORD = /[\p{L}\p{N}'’-]+/gu;
function duplicates(values) {
    const seen = new Set();
    const dup = new Set();
    for (const value of values)
        (seen.has(value) ? dup : seen).add(value);
    return [...dup];
}
/** Structural, reference, ordering, coverage, duration and input-freshness validation. Never mutates inputs. */
export function analyzePlan(loaded, root, sink, options = {}) {
    const { plan } = loaded;
    const assets = new Map();
    for (const dup of duplicates(plan.assets.map(a => a.id)))
        sink.error('DUPLICATE_ASSET_ID', '/assets', `duplicate asset ID ${dup}`);
    for (const asset of plan.assets)
        assets.set(asset.id, asset);
    const sceneIds = new Set(plan.scenes.map(s => s.id));
    for (const dup of duplicates(plan.scenes.map(s => s.id)))
        sink.error('DUPLICATE_SCENE_ID', '/scenes', `duplicate scene ID ${dup}`);
    for (const dup of duplicates(plan.shots.map(s => s.id)))
        sink.error('DUPLICATE_SHOT_ID', '/shots', `duplicate shot ID ${dup}`);
    for (const dup of duplicates(plan.requirements.map(r => r.id)))
        sink.error('DUPLICATE_REQUIREMENT_ID', '/requirements', `duplicate requirement ID ${dup}`);
    for (const dup of duplicates(plan.additions.map(r => r.id)))
        sink.error('DUPLICATE_ADDITION_ID', '/additions', `duplicate addition ID ${dup}`);
    for (const dup of duplicates(plan.inputs.map(r => r.id)))
        sink.error('DUPLICATE_INPUT_ID', '/inputs', `duplicate input ID ${dup}`);
    const shots = new Map(plan.shots.map(s => [s.id, s]));
    const needKind = (path, assetId, kinds, what) => {
        const asset = assets.get(assetId);
        if (asset === undefined) {
            sink.error('UNKNOWN_ASSET', path, `${what} references unknown asset ${assetId}`, 'define the asset in /assets or fix the ID');
            return undefined;
        }
        if (!kinds.includes(asset.kind))
            sink.error('ASSET_KIND', path, `${what} ${assetId} is a ${asset.kind}; expected ${kinds.join(' or ')}`);
        return asset;
    };
    plan.assets.forEach((asset, index) => {
        if (asset.voiceAssetId !== undefined) {
            if (asset.kind !== 'character')
                sink.error('ASSET_KIND', `/assets/${index}/voiceAssetId`, 'only characters may declare voiceAssetId');
            needKind(`/assets/${index}/voiceAssetId`, asset.voiceAssetId, ['voice'], 'voiceAssetId');
        }
    });
    plan.scenes.forEach((scene, si) => {
        needKind(`/scenes/${si}/locationId`, scene.locationId, ['location'], 'scene location');
        if (!plan.shots.some(shot => shot.sceneId === scene.id))
            sink.warn('SCENE_EMPTY', `/scenes/${si}`, `scene ${scene.id} has no shots`);
        for (const dup of duplicates(scene.beats.map(b => b.id)))
            sink.error('DUPLICATE_BEAT_ID', `/scenes/${si}/beats`, `duplicate scene beat ID ${dup}`);
        scene.beats.forEach((beat, bi) => {
            const path = `/scenes/${si}/beats/${bi}`;
            const hasSupport = beat.support.length > 0;
            const excluded = beat.excludedRationale !== undefined;
            if (!hasSupport && !excluded)
                sink.error('BEAT_UNCOVERED', path, `summary beat ${beat.id} has neither supporting shot beats nor a deliberate exclusion`, 'link support or set excludedRationale');
            if (hasSupport && excluded)
                sink.error('BEAT_AMBIGUOUS', path, `summary beat ${beat.id} is both supported and excluded`);
            beat.support.forEach((link, li) => {
                const shot = shots.get(link.shotId);
                if (shot === undefined)
                    return sink.error('UNKNOWN_SHOT', `${path}/support/${li}`, `unknown shot ${link.shotId}`);
                if (shot.sceneId !== scene.id)
                    sink.error('BEAT_SUPPORT_SCENE', `${path}/support/${li}`, `shot ${shot.id} belongs to scene ${shot.sceneId}, not ${scene.id}`);
                if (!shot.beats.some(b => b.id === link.beatId))
                    sink.error('UNKNOWN_BEAT', `${path}/support/${li}`, `shot ${shot.id} has no beat ${link.beatId}`);
            });
        });
    });
    const sceneOrders = plan.scenes.map(s => String(s.order));
    for (const dup of duplicates(sceneOrders))
        sink.error('ORDER_DUPLICATE', '/scenes', `scene order ${dup} used more than once`);
    let total = 0;
    plan.shots.forEach((shot, i) => {
        const path = `/shots/${i}`;
        total += shot.durationSeconds;
        if (!sceneIds.has(shot.sceneId))
            sink.error('UNKNOWN_SCENE', `${path}/sceneId`, `shot ${shot.id} references unknown scene ${shot.sceneId}`);
        needKind(`${path}/locationId`, shot.locationId, ['location'], 'shot location');
        if (!shot.references.includes(shot.locationId))
            sink.error('MISSING_REFERENCE', `${path}/references`, `shot ${shot.id} does not reference its location ${shot.locationId}`);
        for (const dup of duplicates(shot.references))
            sink.error('DUPLICATE_REFERENCE', `${path}/references`, `shot ${shot.id} lists ${dup} twice`);
        for (const dup of duplicates(shot.beats.map(b => b.id)))
            sink.error('DUPLICATE_BEAT_ID', `${path}/beats`, `duplicate shot beat ID ${dup}`);
        shot.references.forEach((ref, ri) => needKind(`${path}/references/${ri}`, ref, ['character', 'location', 'object', 'voice'], 'reference'));
        shot.visible.forEach((vis, vi) => {
            const asset = needKind(`${path}/visible/${vi}`, vis, ['character', 'object'], 'visibility requirement');
            if (asset !== undefined && !shot.references.includes(vis))
                sink.error('MISSING_REFERENCE', `${path}/references`, `shot ${shot.id}: visible ${asset.kind} ${vis} has no reference entry`, 'attach the asset reference');
        });
        shot.dialogue.forEach((line, di) => {
            const speaker = needKind(`${path}/dialogue/${di}/speakerId`, line.speakerId, ['character', 'voice'], 'speaker');
            if (speaker === undefined)
                return;
            if (speaker.kind === 'voice') {
                if (!line.offscreen)
                    sink.error('VOICE_ONSCREEN', `${path}/dialogue/${di}`, `voice ${line.speakerId} must be marked offscreen`);
                if (shot.visible.includes(line.speakerId))
                    sink.error('VOICE_VISIBLE', `${path}/visible`, `voice ${line.speakerId} cannot be a visible cast member`);
            }
            else if (!line.offscreen && !shot.visible.includes(line.speakerId)) {
                sink.error('SPEAKER_NOT_VISIBLE', `${path}/dialogue/${di}`, `on-screen speaker ${line.speakerId} is not in the visibility requirements`, 'mark offscreen or add to visible');
            }
            if (speaker.kind === 'character' && !shot.references.includes(line.speakerId))
                sink.error('MISSING_REFERENCE', `${path}/references`, `speaker ${line.speakerId} has no reference entry`);
        });
        if (STATIC_OPENING.test(shot.camera.opening) && MOVING.test(shot.camera.motion) && shot.camera.ending.trim() === '') {
            sink.warn('CAMERA_FINAL_COMPOSITION', `${path}/camera`, `shot ${shot.id}: static opening with movement "${shot.camera.motion}" but no declared ending`, 'semantic review must check the camera path against the required final composition');
        }
        if (shot.dialogue.length > 0) {
            const words = shot.dialogue.reduce((n, line) => n + (line.text.match(WORD)?.length ?? 0), 0);
            const rate = words / shot.durationSeconds;
            sink.info('DIALOGUE_TIMING_REVIEW', `${path}/dialogue`, `shot ${shot.id}: ${words} words in ${shot.durationSeconds}s (${rate.toFixed(2)} words/s); heuristic only, needs a timed read-through`);
            if (rate > 2.5)
                sink.warn('DIALOGUE_TIMING_HEURISTIC', `${path}/dialogue`, `shot ${shot.id}: ${rate.toFixed(2)} words/s exceeds the 2.5 words/s review heuristic (not proof of misfit)`);
        }
    });
    for (const scene of plan.scenes) {
        const orders = plan.shots.filter(s => s.sceneId === scene.id).map(s => String(s.order));
        for (const dup of duplicates(orders))
            sink.error('ORDER_DUPLICATE', `/scenes/${scene.id}`, `shot order ${dup} used more than once in scene ${scene.id}`);
    }
    const policy = plan.durationPolicy;
    const diff = Math.abs(total - policy.targetSeconds);
    sink.info('DURATION_TOTAL', '/durationPolicy', `target ${policy.targetSeconds}s, planned total ${total}s (${policy.mode})`);
    if (plan.profile === 'proposed' && policy.mode === 'observed')
        sink.error('DURATION_POLICY', '/durationPolicy/mode', 'observed duration mode is only valid for the observed profile');
    if (policy.mode === 'exact' && diff > 1e-9)
        sink.error('DURATION_POLICY', '/durationPolicy', `exact policy requires ${policy.targetSeconds}s but shots sum to ${total}s`, 'edit durations or record a creator-approved tolerance; durations are never trimmed silently');
    if (policy.mode === 'tolerance') {
        if (policy.toleranceSeconds === undefined || policy.approvedBy === undefined)
            sink.error('DURATION_POLICY', '/durationPolicy', 'tolerance policy needs toleranceSeconds and approvedBy (creator approval)');
        else if (diff > policy.toleranceSeconds + 1e-9)
            sink.error('DURATION_POLICY', '/durationPolicy', `total ${total}s outside ${policy.targetSeconds}s +/- ${policy.toleranceSeconds}s`);
    }
    if (policy.mode === 'observed' && diff > 1e-9)
        sink.error('DURATION_POLICY', '/durationPolicy', `observed record says ${policy.targetSeconds}s but shots sum to ${total}s`);
    if (plan.profile === 'observed') {
        if (policy.targetSeconds !== 60)
            sink.warn('OBSERVED_DURATION_NOT_EXACT_MINUTE', '/durationPolicy', `observed sample totals ${total}s, not an exact 60 seconds; recorded as observed, not relabeled`);
    }
    plan.requirements.forEach((req, i) => {
        const path = `/requirements/${i}`;
        if (req.treatment === 'absent' && plan.profile !== 'observed')
            sink.error('TREATMENT_INVALID', path, 'treatment "absent" is only valid in the observed profile');
        if (req.treatment === 'absent')
            sink.error('REQUIREMENT_ABSENT', path, `requirement ${req.id} has no teaser treatment in the observed baseline`, 'recorded as evidence; not repaired');
        if (req.treatment === 'included' || req.treatment === 'hinted') {
            if (req.shotIds.length === 0)
                sink.error('TREATMENT_NO_SHOTS', path, `${req.treatment} requirement ${req.id} must point to scene/shot IDs`);
            for (const shotId of req.shotIds)
                if (!shots.has(shotId))
                    sink.error('UNKNOWN_SHOT', path, `requirement ${req.id} points to unknown shot ${shotId}`);
        }
        if (req.treatment === 'deferred') {
            if (req.rationale.trim() === '')
                sink.error('DEFERRAL_UNJUSTIFIED', path, `deferred requirement ${req.id} needs a visible rationale`);
            if (!req.creatorApprovalRequired)
                sink.error('DEFERRAL_UNJUSTIFIED', path, `deferred requirement ${req.id} must require creator approval`);
        }
        if (req.treatment === 'unresolved')
            sink.warn('REQUIREMENT_UNRESOLVED', path, `requirement ${req.id} is unresolved; accepted export is blocked until it is treated`);
    });
    for (const add of plan.additions)
        for (const shotId of add.shotIds)
            if (!shots.has(shotId))
                sink.error('UNKNOWN_SHOT', '/additions', `addition ${add.id} points to unknown shot ${shotId}`);
    for (const add of plan.additions.filter(a => a.material))
        sink.info('MATERIAL_ADDITION', '/additions', `material ${add.provenance} addition ${add.id}: ${add.description}`);
    for (const type of ['creative-approval', 'semantic-review']) {
        if (!plan.approvalsRequired.includes(type))
            sink.error('APPROVALS_REQUIRED_INCOMPLETE', '/approvalsRequired', `plan must require ${type}`);
    }
    checkInputs(loaded, root, sink, options.approvalsPath);
    checkCaseBinding(plan, root, sink);
    const brief = loadBrief(root, plan, sink);
    if (brief !== null) {
        if (brief.revision !== plan.briefRevision)
            sink.error('BRIEF_REVISION', '/briefRevision', `plan pins brief revision ${plan.briefRevision} but the brief file is revision ${brief.revision}`);
        const treated = new Set(plan.requirements.map(r => r.id));
        for (const req of brief.requirements) {
            if (!treated.has(req.id))
                sink.error('REQUIREMENT_UNTREATED', '/requirements', `brief requirement ${req.id} has no teaser treatment`, 'every requirement needs included, hinted, deferred, or unresolved');
        }
        const known = new Set(brief.requirements.map(r => r.id));
        for (const id of treated)
            if (!known.has(id))
                sink.error('REQUIREMENT_UNKNOWN', '/requirements', `treatment for ${id}, which is not in the brief`);
    }
}
function checkInputs(loaded, root, sink, approvalsPath) {
    const { plan } = loaded;
    for (const role of ['brief', 'source-manifest', 'schema', 'context-packet']) {
        if (!plan.inputs.some(i => i.role === role))
            sink.error('INPUT_ROLE_MISSING', '/inputs', `plan must pin an input with role ${role}`);
    }
    if (!plan.inputs.some(i => i.role === 'evidence'))
        sink.error('INPUT_ROLE_MISSING', '/inputs', 'plan must pin at least one evidence input');
    plan.inputs.forEach((input, i) => {
        const path = `/inputs/${i}`;
        if (!isSafeRelativePath(input.path))
            return sink.error('PATH_UNSAFE', path, `input path ${JSON.stringify(input.path)} must be repository-relative`);
        if (input.path === loaded.relPath || input.path === approvalsPath || /(^|\/)(plan|approvals)\.json$/.test(input.path)) {
            return sink.error('INPUT_CYCLE', path, `input ${input.path} would hash the plan or approvals (hash cycle)`, 'the drafting packet holds inputs only');
        }
        const full = resolveUnder(root, input.path);
        if (!existsSync(full))
            return sink.error('INPUT_MISSING', path, `pinned input ${input.path} is missing`);
        const actual = readHashed(full);
        if (actual.sha256 !== input.sha256) {
            sink.error('INPUT_STALE', path, `input ${input.path} changed (pinned ${input.sha256.slice(0, 12)}, actual ${actual.sha256.slice(0, 12)})`, 'approvals are stale until a reviewed plan revision records the new input digests');
        }
    });
    for (const binding of requiredRoleBindings(plan.profile))
        checkRoleBinding(loaded, root, sink, binding);
    checkSchemaBinding(loaded, root, sink);
}
/**
 * W2.6 required-input role binding for brief, source manifest and frozen context packet. Exactly one input declares the
 * role and its path is the kit's documented current path for it. The current file is hashed and content-checked
 * unconditionally, whatever the plan declares, so substituting or re-pinning another file cannot hide an edit or
 * deletion of the real input. Not a cryptographic identity claim.
 */
function checkRoleBinding(loaded, root, sink, { role, tag, path }) {
    const declared = loaded.plan.inputs.map((input, index) => ({ input, index })).filter(({ input }) => input.role === role);
    if (declared.length > 1)
        sink.error(`INPUT_${tag}_ROLE_DUPLICATE`, '/inputs', `plan declares ${declared.length} ${role} inputs; exactly one ${path} is required`);
    for (const { input, index } of declared) {
        if (input.path !== path)
            sink.error(`INPUT_${tag}_ROLE_ALTERNATE`, `/inputs/${index}`, `${role} input ${JSON.stringify(input.path)} is not the current ${role} ${path}`, `the ${role} role may only bind ${path}`);
    }
    if (!declared.some(({ input }) => input.path === path))
        sink.error(`INPUT_${tag}_ROLE_MISSING`, '/inputs', `no ${role} input binds ${path}`);
    const full = resolveUnder(root, path);
    if (!existsSync(full))
        return sink.error(`INPUT_${tag}_FILE_MISSING`, '/inputs', `current ${role} ${path} is missing`);
    const bytes = readFileSync(full);
    const actual = sha256Hex(bytes);
    if (role === 'source-manifest') {
        try {
            const value = JSON.parse(bytes.toString('utf8'));
            if (typeof value !== 'object' || value === null || !Array.isArray(value.files))
                sink.error('INPUT_MANIFEST_INVALID', '/inputs', `${path} is not a source manifest (object with a files array)`);
        }
        catch {
            sink.error('INPUT_MANIFEST_INVALID', '/inputs', `${path} is not valid JSON`);
        }
    }
    if (role === 'context-packet' && bytes.toString('utf8').trim() === '')
        sink.error('INPUT_PACKET_INVALID', '/inputs', `${path} is empty`);
    for (const { input, index } of declared) {
        if (input.path === path && input.sha256 !== actual)
            sink.error(`INPUT_${tag}_PIN_MISMATCH`, `/inputs/${index}`, `${role} pin ${input.sha256.slice(0, 12)} differs from actual ${actual.slice(0, 12)}`);
    }
}
/**
 * Runtime linkage check (not a drafting input pin): the plan's caseId must equal the caseId of the current case record
 * under --root. The record is always read and validated; missing, malformed or mismatched records fail closed.
 */
function checkCaseBinding(plan, root, sink) {
    const full = resolveUnder(root, CASE_RECORD_PATH);
    if (!existsSync(full))
        return sink.error('CASE_RECORD_MISSING', '/caseId', `current case record ${CASE_RECORD_PATH} is missing`);
    const local = new DiagnosticSink();
    let record = null;
    try {
        record = validateCase(full, root, local);
    }
    catch (error) {
        local.error('CASE_RECORD_UNREADABLE', CASE_RECORD_PATH, `cannot validate ${CASE_RECORD_PATH}: ${error instanceof Error ? error.message : String(error)}`);
    }
    for (const item of local.items)
        if (item.severity === 'error')
            sink.error('CASE_RECORD_INVALID', '/caseId', `${CASE_RECORD_PATH}: [${item.code}] ${item.path} ${item.message}`);
    if (record === null)
        return;
    if (record.caseId !== plan.caseId)
        sink.error('CASE_ID_MISMATCH', '/caseId', `plan caseId ${JSON.stringify(plan.caseId)} does not match the current case record ${JSON.stringify(record.caseId)}`, `plan must reference ${record.caseId}`);
}
/**
 * W2.6 current-schema binding. Exactly one input has role "schema" and it is the canonical plan schema; that file's own
 * actual digest must equal the validator-generated schema identity. The canonical file is checked whatever the plan
 * declares, so re-pinning an unrelated file cannot hide a schema edit. Not a cryptographic identity claim.
 */
function checkSchemaBinding(loaded, root, sink) {
    const schemaPath = planSchemaPath(loaded.plan);
    const declared = loaded.plan.inputs.map((input, index) => ({ input, index })).filter(({ input }) => input.role === 'schema');
    if (declared.length > 1)
        sink.error('SCHEMA_ROLE_DUPLICATE', '/inputs', `plan declares ${declared.length} schema inputs; exactly one ${schemaPath} is required`);
    for (const { input, index } of declared) {
        if (input.path !== schemaPath)
            sink.error('SCHEMA_ROLE_ALTERNATE', `/inputs/${index}`, `schema input ${JSON.stringify(input.path)} is not the current plan schema ${schemaPath}`, 'the schema role may only bind the canonical plan schema');
    }
    if (!declared.some(({ input }) => input.path === schemaPath))
        sink.error('SCHEMA_ROLE_MISSING', '/inputs', `no schema-role input binds ${schemaPath}`);
    const full = resolveUnder(root, schemaPath);
    if (!existsSync(full))
        return sink.error('SCHEMA_MISSING', '/inputs', `${schemaPath} is missing`);
    const actual = readHashed(full).sha256;
    if (actual !== sha256Hex(schemaDocument(planSchemaName(loaded.plan)))) {
        sink.error('SCHEMA_DRIFT', '/inputs', `${schemaPath} (${actual.slice(0, 12)}) no longer matches the validator's schema`, `regenerate with: node kit/dist/src/main.js schema ${planSchemaName(loaded.plan)} > ${schemaPath}`);
    }
    for (const { input, index } of declared) {
        if (input.path === schemaPath && input.sha256 !== actual)
            sink.error('SCHEMA_PIN_MISMATCH', `/inputs/${index}`, `schema pin ${input.sha256.slice(0, 12)} differs from actual ${actual.slice(0, 12)}`);
    }
}
export function fingerprintTable(plan) {
    return [...allShotFingerprints(plan).values()].map(({ shotId, fingerprint }) => ({ shotId, fingerprint }));
}
