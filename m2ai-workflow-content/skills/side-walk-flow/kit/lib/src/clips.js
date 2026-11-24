import { closeSync, constants, existsSync, fstatSync, openSync, readlinkSync, readSync, realpathSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, sep } from 'node:path';
import { allShotFingerprints } from './fingerprint.js';
import { isSafeRelativePath } from './fsio.js';
export class ClipError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
function within(root, target) {
    const prefix = root.endsWith(sep) ? root : root + sep;
    return target.startsWith(prefix) && target.length > prefix.length;
}
/**
 * Open once, fstat the descriptor, resolve the OPENED descriptor through /proc/self/fd, enforce path-component
 * containment against the canonical root, then hash and re-stat through that same descriptor. No pathname re-open.
 */
export function verifyClipFile(rootDir, rel, options = {}) {
    const procDir = options.procFdDir ?? '/proc/self/fd';
    if (process.platform !== 'linux' || !existsSync(procDir))
        throw new ClipError('CLIP_DESCRIPTOR_UNSUPPORTED', `descriptor-path verification is unavailable (${procDir}); failing closed without a pathname fallback`);
    if (!isSafeRelativePath(rel))
        throw new ClipError('CLIP_PATH_UNSAFE', `clip path ${JSON.stringify(rel)} must be relative to the allowed root without ".."`);
    let root;
    try {
        root = realpathSync(rootDir);
        if (!statSync(root).isDirectory())
            throw new Error('not a directory');
    }
    catch {
        throw new ClipError('CLIP_ROOT_INVALID', `allowed clip root ${rootDir} is not an existing directory`);
    }
    options.beforeOpen?.();
    let fd;
    try {
        fd = openSync(join(root, rel), constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOCTTY);
    }
    catch (error) {
        throw new ClipError('CLIP_FILE_UNREADABLE', `cannot open ${rel}: ${error.code ?? String(error)}`);
    }
    try {
        const before = fstatSync(fd);
        if (!before.isFile())
            throw new ClipError('CLIP_NOT_REGULAR', `${rel} is not a regular file`);
        const target = readlinkSync(join(procDir, String(fd)));
        if (target.endsWith(' (deleted)'))
            throw new ClipError('CLIP_OUTSIDE_ROOT', `${rel}: opened descriptor refers to a deleted path`);
        if (!within(root, target))
            throw new ClipError('CLIP_OUTSIDE_ROOT', `${rel}: opened descriptor resolves to ${target}, outside the allowed root ${root}`);
        const hash = createHash('sha256');
        const chunk = Buffer.allocUnsafe(options.chunkSize ?? 1 << 16);
        let position = 0;
        let index = 0;
        for (;;) {
            const n = readSync(fd, chunk, 0, chunk.length, position);
            if (n === 0)
                break;
            hash.update(chunk.subarray(0, n));
            position += n;
            options.afterChunk?.(index);
            index += 1;
        }
        const after = fstatSync(fd);
        const unchanged = after.size === before.size && after.mtimeMs === before.mtimeMs && after.ctimeMs === before.ctimeMs && after.ino === before.ino && after.dev === before.dev;
        if (!unchanged || position !== before.size)
            throw new ClipError('CLIP_MUTATED', `${rel}: file metadata or length changed while hashing`);
        if (readlinkSync(join(procDir, String(fd))) !== target)
            throw new ClipError('CLIP_OUTSIDE_ROOT', `${rel}: descriptor path changed during hashing`);
        const prefix = root.endsWith(sep) ? root : root + sep;
        return { file: rel, resolvedFile: target.slice(prefix.length), sha256: hash.digest('hex'), bytes: position };
    }
    finally {
        closeSync(fd);
    }
}
export function emptyClips(plan) {
    return { schemaVersion: 1, kind: 'devastator.clips', planId: plan.planId, selections: [], pending: [] };
}
function clone(clips) {
    return JSON.parse(JSON.stringify(clips));
}
function conflicts(clips, shotId, takeId, resolvedFile, sha256, sink) {
    for (const other of [...clips.selections, ...clips.pending]) {
        if (other.shotId === shotId)
            continue;
        if (other.takeId === takeId)
            sink.error('CLIP_DUPLICATE_TAKE', `/${shotId}`, `take ${takeId} is already used by shot ${other.shotId}`);
        if (other.resolvedFile === resolvedFile)
            sink.error('CLIP_DUPLICATE_TAKE', `/${shotId}`, `file ${resolvedFile} is already selected for shot ${other.shotId}`);
        else if (other.sha256 === sha256)
            sink.warn('CLIP_DUPLICATE_CONTENT', `/${shotId}`, `identical bytes already selected for shot ${other.shotId}`);
    }
}
function verifyInto(sink, shotId, root, file, options) {
    try {
        return verifyClipFile(root, file, options);
    }
    catch (error) {
        if (error instanceof ClipError)
            sink.error(error.code, `/${shotId}`, error.message);
        else
            throw error;
        return null;
    }
}
/** Add first selections. Never touches shots not named; existing selections need replace-clip. */
export function selectClips(plan, planSha256, current, root, inputs, sink, options = {}) {
    const next = clone(current);
    const prints = allShotFingerprints(plan);
    for (const input of inputs) {
        const shot = plan.shots.find(s => s.id === input.shotId);
        if (shot === undefined) {
            sink.error('CLIP_UNKNOWN_SHOT', `/${input.shotId}`, `unknown shot ${input.shotId}`);
            continue;
        }
        if (next.selections.some(s => s.shotId === shot.id)) {
            sink.error('CLIP_ALREADY_SELECTED', `/${shot.id}`, 'shot already has a selected take', 'use replace-clip, then confirm-replacement or cancel-replacement');
            continue;
        }
        const verified = verifyInto(sink, shot.id, root, input.file, options);
        if (verified === null)
            continue;
        const before = sink.errorCount;
        conflicts(next, shot.id, input.takeId, verified.resolvedFile, verified.sha256, sink);
        if (sink.errorCount > before)
            continue;
        const selection = {
            shotId: shot.id,
            shotFingerprint: prints.get(shot.id)?.fingerprint ?? '',
            planRevision: plan.revision,
            planSha256,
            takeId: input.takeId,
            file: verified.file,
            resolvedFile: verified.resolvedFile,
            sha256: verified.sha256,
            bytes: verified.bytes,
            silent: shot.dialogue.length === 0,
            expectedDurationSeconds: shot.durationSeconds,
            observedDurationSeconds: input.observedDurationSeconds ?? null,
            status: 'selected'
        };
        next.selections.push(selection);
    }
    next.selections.sort((a, b) => (a.shotId < b.shotId ? -1 : 1));
    return next;
}
export function stageReplacement(plan, current, root, input, sink, options = {}) {
    const next = clone(current);
    const prints = allShotFingerprints(plan);
    if (!plan.shots.some(s => s.id === input.shotId)) {
        sink.error('CLIP_UNKNOWN_SHOT', `/${input.shotId}`, `unknown shot ${input.shotId}`);
        return next;
    }
    if (!next.selections.some(s => s.shotId === input.shotId)) {
        sink.error('CLIP_NOT_SELECTED', `/${input.shotId}`, 'nothing to replace; select the shot first');
        return next;
    }
    const verified = verifyInto(sink, input.shotId, root, input.file, options);
    if (verified === null)
        return next;
    next.pending = next.pending.filter(p => p.shotId !== input.shotId);
    const before = sink.errorCount;
    const own = next.selections.find(s => s.shotId === input.shotId);
    if (own?.takeId === input.takeId)
        sink.error('CLIP_DUPLICATE_TAKE', `/${input.shotId}`, `replacement reuses the current take ID ${input.takeId}`);
    conflicts(next, input.shotId, input.takeId, verified.resolvedFile, verified.sha256, sink);
    if (sink.errorCount > before)
        return current;
    const pending = {
        shotId: input.shotId,
        forShotFingerprint: prints.get(input.shotId)?.fingerprint ?? '',
        takeId: input.takeId,
        file: verified.file,
        resolvedFile: verified.resolvedFile,
        sha256: verified.sha256,
        bytes: verified.bytes
    };
    next.pending.push(pending);
    return next;
}
/** Promotes the pending take; re-verifies the file first. Only the named shot's selection changes. */
export function confirmReplacement(plan, planSha256, current, root, shotId, sink, options = {}) {
    const next = clone(current);
    const pending = next.pending.find(p => p.shotId === shotId);
    const shot = plan.shots.find(s => s.id === shotId);
    if (pending === undefined || shot === undefined) {
        sink.error('CLIP_NO_PENDING', `/${shotId}`, 'no pending replacement for this shot');
        return current;
    }
    const fp = allShotFingerprints(plan).get(shotId)?.fingerprint;
    if (fp !== pending.forShotFingerprint) {
        sink.error('CLIP_PENDING_STALE', `/${shotId}`, 'the shot changed since the replacement was staged; restage it');
        return current;
    }
    const verified = verifyInto(sink, shotId, root, pending.file, options);
    if (verified === null)
        return current;
    if (verified.sha256 !== pending.sha256 || verified.resolvedFile !== pending.resolvedFile) {
        sink.error('CLIP_HASH_MISMATCH', `/${shotId}`, 'pending file changed since it was staged');
        return current;
    }
    const old = next.selections.find(s => s.shotId === shotId);
    next.selections = next.selections.filter(s => s.shotId !== shotId);
    next.selections.push({
        shotId,
        shotFingerprint: pending.forShotFingerprint,
        planRevision: plan.revision,
        planSha256,
        takeId: pending.takeId,
        file: pending.file,
        resolvedFile: pending.resolvedFile,
        sha256: pending.sha256,
        bytes: pending.bytes,
        silent: shot.dialogue.length === 0,
        expectedDurationSeconds: shot.durationSeconds,
        observedDurationSeconds: null,
        status: 'selected'
    });
    void old;
    next.pending = next.pending.filter(p => p.shotId !== shotId);
    next.selections.sort((a, b) => (a.shotId < b.shotId ? -1 : 1));
    return next;
}
export function cancelReplacement(current, shotId, sink) {
    if (!current.pending.some(p => p.shotId === shotId)) {
        sink.error('CLIP_NO_PENDING', `/${shotId}`, 'no pending replacement for this shot');
        return current;
    }
    const next = clone(current);
    next.pending = next.pending.filter(p => p.shotId !== shotId);
    return next;
}
/** Record the current plan revision on selections whose per-shot fingerprint is unchanged; stale ones are left untouched. */
export function rebaseClips(plan, planSha256, current) {
    const next = clone(current);
    const prints = allShotFingerprints(plan);
    const rebased = [];
    const stale = [];
    for (const selection of next.selections) {
        if (prints.get(selection.shotId)?.fingerprint === selection.shotFingerprint) {
            selection.planRevision = plan.revision;
            selection.planSha256 = planSha256;
            rebased.push(selection.shotId);
        }
        else
            stale.push(selection.shotId);
    }
    return { clips: next, rebased, stale };
}
/** Readiness checks for mappings: completeness, freshness, uniqueness and re-verified file bytes. */
export function evaluateClips(plan, clips, root, sink, options = {}) {
    const status = { fresh: [], stale: [], missing: [] };
    const prints = allShotFingerprints(plan);
    if (clips.planId !== plan.planId)
        sink.error('CLIP_PLAN_ID', '/planId', `clips are for ${clips.planId}, plan is ${plan.planId}`);
    const known = new Set(plan.shots.map(s => s.id));
    for (const selection of clips.selections)
        if (!known.has(selection.shotId))
            sink.error('CLIP_UNKNOWN_SHOT', `/${selection.shotId}`, `selection for unknown shot ${selection.shotId}`);
    const takeSeen = new Map();
    const fileSeen = new Map();
    for (const selection of clips.selections) {
        const priorTake = takeSeen.get(selection.takeId);
        if (priorTake !== undefined)
            sink.error('CLIP_DUPLICATE_TAKE', `/${selection.shotId}`, `take ${selection.takeId} is selected for both ${priorTake} and ${selection.shotId}`);
        takeSeen.set(selection.takeId, selection.shotId);
        const priorFile = fileSeen.get(selection.resolvedFile);
        if (priorFile !== undefined)
            sink.error('CLIP_DUPLICATE_TAKE', `/${selection.shotId}`, `file ${selection.resolvedFile} is selected for both ${priorFile} and ${selection.shotId}`);
        fileSeen.set(selection.resolvedFile, selection.shotId);
    }
    for (const shot of plan.shots) {
        const mine = clips.selections.filter(s => s.shotId === shot.id);
        if (mine.length === 0) {
            status.missing.push(shot.id);
            sink.error('CLIP_MISSING', `/${shot.id}`, `shot ${shot.id} has no selected take${shot.dialogue.length === 0 ? ' (silent shots need an explicit selection too)' : ''}`);
            continue;
        }
        if (mine.length > 1)
            sink.error('CLIP_DUPLICATE_SELECTION', `/${shot.id}`, `shot ${shot.id} has ${mine.length} selections`);
        const selection = mine[0];
        const now = prints.get(shot.id);
        if (now?.fingerprint !== selection.shotFingerprint) {
            status.stale.push(shot.id);
            sink.error('CLIP_STALE', `/${shot.id}`, `selection for ${shot.id} was made for an older shot fingerprint (shot or a dependent asset changed)`, 'select the take again after review');
            continue;
        }
        const before = sink.errorCount;
        const verified = verifyInto(sink, shot.id, root, selection.file, options);
        if (verified !== null) {
            if (verified.sha256 !== selection.sha256)
                sink.error('CLIP_HASH_MISMATCH', `/${shot.id}`, `bytes of ${selection.file} no longer match the recorded hash`);
            if (verified.bytes !== selection.bytes)
                sink.error('CLIP_HASH_MISMATCH', `/${shot.id}`, `length of ${selection.file} changed`);
            if (verified.resolvedFile !== selection.resolvedFile)
                sink.error('CLIP_PATH_CHANGED', `/${shot.id}`, `${selection.file} now resolves to ${verified.resolvedFile}, recorded ${selection.resolvedFile}`);
        }
        if (sink.errorCount === before)
            status.fresh.push(shot.id);
    }
    for (const pending of clips.pending)
        sink.info('CLIP_PENDING_REPLACEMENT', `/${pending.shotId}`, `pending replacement take ${pending.takeId} is not selected; the previous take stays active`);
    return status;
}
