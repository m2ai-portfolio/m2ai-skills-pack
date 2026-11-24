import { closeSync, constants, existsSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync, writeSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { sha256Hex } from './canon.js';
import { checkAcceptance, loadApprovals } from './approvals.js';
import { DiagnosticSink } from './diag.js';
import { isSafeRelativePath, parseDocument, prettyJson, readHashed } from './fsio.js';
import { committedSpec } from './model.js';
import { analyzePlan, loadPlan } from './plan.js';
import { CLAIMS, GENERATOR, checkRendered, extractFences, renderPack } from './render.js';
import { CSV_COLUMNS, parseCsv } from './csv.js';
export class ExportError extends Error {
    code;
    incompletePath;
    constructor(code, message, incompletePath) {
        super(message);
        this.code = code;
        this.incompletePath = incompletePath;
    }
}
/** Full accepted-state evaluation: plan validity + input freshness + approvals + semantic attestations. */
export function evaluateAccepted(root, planRel, approvalsPath, allowSynthetic, approvalsRel) {
    const sink = new DiagnosticSink();
    const loaded = loadPlan(root, planRel, sink);
    if (loaded === null)
        return { sink, loaded: null, approvals: null, acceptance: null };
    const planDiag = new DiagnosticSink();
    analyzePlan(loaded, root, planDiag, approvalsRel === undefined ? {} : { approvalsPath: approvalsRel });
    sink.items.push(...planDiag.items);
    if (loaded.plan.profile === 'observed')
        sink.error('OBSERVED_NOT_EXPORTABLE', '/profile', 'the observed baseline is diagnostic-only and can never produce an accepted pack');
    if (loaded.plan.requirements.some(r => r.treatment === 'unresolved'))
        sink.error('REQUIREMENT_UNRESOLVED', '/requirements', 'unresolved requirements block an accepted export');
    let approvals = null;
    if (approvalsPath !== null) {
        const doc = existsSync(approvalsPath) ? loadApprovals(approvalsPath, sink) : (sink.error('FILE_READ', 'approvals', `approvals file ${approvalsPath} does not exist`), null);
        if (doc !== null)
            approvals = { value: doc.value, sha256: doc.sha256 };
    }
    const acceptance = checkAcceptance(loaded.plan, loaded.sha256, approvals?.value ?? null, sink, { allowSynthetic });
    return { sink, loaded, approvals, acceptance };
}
function writeExclusive(path, content) {
    const fd = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o644);
    try {
        writeSync(fd, typeof content === 'string' ? Buffer.from(content, 'utf8') : content);
        fsyncSync(fd);
    }
    finally {
        closeSync(fd);
    }
}
/** Throws ExportError for filesystem/acceptance refusals; validation failures are returned via evaluation. */
export function exportPack(request, evaluation) {
    const { loaded, approvals, acceptance } = evaluation;
    if (!evaluation.sink.ok || loaded === null || approvals === null || acceptance === null)
        throw new ExportError('NOT_ACCEPTED', 'plan is invalid, stale or unapproved; nothing was written');
    const plan = loaded.plan;
    const synthetic = acceptance.synthetic;
    const labels = [acceptance.creative, acceptance.semantic].flatMap(r => (r?.synthetic === true && r.syntheticLabel !== undefined ? [r.syntheticLabel] : []));
    const rendered = renderPack(plan, { planSha256: loaded.sha256, synthetic, syntheticLabels: [...new Set(labels)] });
    const problems = checkRendered(plan, rendered);
    if (problems.length > 0)
        throw new ExportError('RENDER_INCONSISTENT', `rendered files are inconsistent: ${problems.join('; ')}`);
    const payload = [...rendered.entries()].map(([path, text]) => ({ path, bytes: Buffer.from(text, 'utf8') })).sort((a, b) => (a.path < b.path ? -1 : 1));
    for (const item of payload)
        if (!isSafeRelativePath(item.path) || item.path.includes('/') || item.path.startsWith('.'))
            throw new ExportError('OUTPUT_NAME', `unsafe output name ${item.path}`);
    const files = payload.map(item => ({ path: item.path, sha256: sha256Hex(item.bytes), bytes: item.bytes.length }));
    const committed = {
        schemaVersion: 1,
        kind: 'devastator.committed',
        generator: GENERATOR,
        planId: plan.planId,
        planRevision: plan.revision,
        planSha256: loaded.sha256,
        approvalsSha256: approvals.sha256,
        synthetic,
        syntheticNote: synthetic ? 'Receipts are synthetic automated test fixtures, not human creative approval.' : '',
        inputs: [...plan.inputs].sort((a, b) => (a.path < b.path ? -1 : 1)).map(i => ({ path: i.path, sha256: i.sha256 })),
        receipts: [acceptance.creative, acceptance.semantic].flatMap(r => (r === null ? [] : [{ type: r.type, receiptId: r.receiptId, synthetic: r.synthetic }])),
        files,
        claims: CLAIMS
    };
    const markerBytes = Buffer.from(prettyJson(committed), 'utf8');
    const destination = resolve(request.out);
    const parent = dirname(destination);
    if (!existsSync(parent) || !statSync(parent).isDirectory())
        throw new ExportError('DESTINATION_PARENT', `parent directory ${parent} does not exist`);
    try {
        mkdirSync(destination, { recursive: false, mode: 0o755 });
    }
    catch (error) {
        const code = error.code;
        if (code === 'EEXIST')
            throw new ExportError('DESTINATION_EXISTS', `${destination} already exists (any pre-existing file or directory, even empty, is refused)`);
        throw new ExportError('DESTINATION_UNUSABLE', `cannot reserve ${destination}: ${code ?? String(error)}`);
    }
    const staging = join(destination, '.staging');
    try {
        mkdirSync(staging, { mode: 0o700 });
        writeExclusive(join(staging, 'RESERVATION.json'), prettyJson({ tool: GENERATOR, planSha256: loaded.sha256, files: files.map(f => f.path) }));
        mkdirSync(join(staging, 'payload'), { mode: 0o700 });
        for (const item of payload)
            writeExclusive(join(staging, 'payload', item.path), item.bytes);
        writeExclusive(join(staging, 'COMMITTED.json'), markerBytes);
        for (const file of files) {
            const staged = readFileSync(join(staging, 'payload', file.path));
            if (sha256Hex(staged) !== file.sha256 || staged.length !== file.bytes)
                throw new ExportError('STAGING_MISMATCH', `staged ${file.path} does not match its expected hash`, destination);
        }
        const stagedNames = readdirSync(join(staging, 'payload')).sort();
        if (JSON.stringify(stagedNames) !== JSON.stringify(files.map(f => f.path)))
            throw new ExportError('STAGING_MISMATCH', 'staged file set differs from the expected set', destination);
        let published = 0;
        for (const item of payload) {
            writeExclusive(join(destination, item.path), item.bytes);
            published += 1;
            if (request.fault?.afterFiles !== undefined && published >= request.fault.afterFiles)
                throw new Error(`injected fault after ${published} published file(s)`);
        }
        for (const file of files) {
            if (sha256Hex(readFileSync(join(destination, file.path))) !== file.sha256)
                throw new ExportError('PUBLISH_MISMATCH', `published ${file.path} does not match`, destination);
        }
        if (request.fault?.beforeMarker === true)
            throw new Error('injected fault before COMMITTED marker');
        try {
            (request.linkFn ?? linkSync)(join(staging, 'COMMITTED.json'), join(destination, 'COMMITTED.json'));
        }
        catch (error) {
            throw new ExportError('MARKER_LINK_FAILED', `no-replace hard link for COMMITTED.json failed (${error.code ?? String(error)}); no accepted marker was written`, destination);
        }
    }
    catch (error) {
        if (error instanceof ExportError)
            throw new ExportError(error.code, `${error.message}; incomplete reservation left at ${destination}`, destination);
        throw new ExportError('EXPORT_INTERRUPTED', `${error instanceof Error ? error.message : String(error)}; incomplete reservation left at ${destination} (no COMMITTED.json; choose a new destination or run cleanup-incomplete)`, destination);
    }
    let cleanupWarning = null;
    try {
        rmSync(staging, { recursive: true, force: true });
    }
    catch (error) {
        cleanupWarning = `committed, but staging cleanup failed: ${String(error)}`;
    }
    return { destination, files, committedSha256: sha256Hex(markerBytes), synthetic, cleanupWarning };
}
/** Reader acceptance: marker exists, parses, every declared file exists with the declared hash, nothing undeclared. */
export function verifyPack(dir, plan) {
    const sink = new DiagnosticSink();
    const root = resolve(dir);
    const markerPath = join(root, 'COMMITTED.json');
    if (!existsSync(root) || !statSync(root).isDirectory()) {
        sink.error('PACK_MISSING', root, 'not a directory');
        return { sink, committed: null };
    }
    if (!existsSync(markerPath)) {
        sink.error('PACK_INCOMPLETE', root, 'COMMITTED.json is absent: this directory is explicitly incomplete, even if files are visible');
        return { sink, committed: null };
    }
    if (!lstatSync(markerPath).isFile()) {
        sink.error('MARKER_INVALID', markerPath, 'COMMITTED.json is not a regular file');
        return { sink, committed: null };
    }
    const doc = parseDocument(readFileSync(markerPath), committedSpec, 'COMMITTED.json', sink);
    if (doc === null)
        return { sink, committed: null };
    const committed = doc.value;
    const texts = new Map();
    const declared = new Set(committed.files.map(f => f.path));
    for (const file of committed.files) {
        if (!isSafeRelativePath(file.path) || file.path.includes('/')) {
            sink.error('MARKER_PATH_UNSAFE', file.path, 'declared path is not a plain file name');
            continue;
        }
        const full = join(root, file.path);
        if (!existsSync(full)) {
            sink.error('FILE_MISSING', file.path, 'declared file is missing');
            continue;
        }
        if (!lstatSync(full).isFile()) {
            sink.error('FILE_NOT_REGULAR', file.path, 'declared file is not a regular file');
            continue;
        }
        const actual = readHashed(full);
        if (actual.bytes.length !== file.bytes)
            sink.error('FILE_SIZE_MISMATCH', file.path, `declared ${file.bytes} bytes, found ${actual.bytes.length}`);
        if (actual.sha256 !== file.sha256)
            sink.error('FILE_HASH_MISMATCH', file.path, 'content hash differs from COMMITTED.json');
        texts.set(file.path, actual.bytes.toString('utf8'));
    }
    for (const entry of readdirSync(root)) {
        if (entry === 'COMMITTED.json')
            continue;
        if (entry === '.staging')
            sink.warn('STAGING_LEFTOVER', entry, 'tool staging directory still present');
        else if (!declared.has(entry))
            sink.error('UNDECLARED_ENTRY', entry, 'file is not declared by COMMITTED.json');
    }
    if (sink.ok) {
        const problems = plan === undefined ? selfConsistency(texts) : checkRendered(plan, texts);
        for (const problem of problems)
            sink.error('PACK_INCONSISTENT', root, problem);
        if (plan !== undefined && plan.planId !== committed.planId)
            sink.error('PACK_PLAN_MISMATCH', root, 'pack was committed for a different plan');
    }
    return { sink, committed };
}
/** Without the plan: every shots.csv description must equal the matching Markdown prompt (manifest order). */
function selfConsistency(texts) {
    const problems = [];
    const csv = texts.get('shots.csv');
    const manifestText = texts.get('devastator-manifest.json');
    if (csv === undefined || manifestText === undefined)
        return ['shots.csv or devastator-manifest.json is not declared'];
    const rows = parseCsv(csv).slice(1);
    const manifest = JSON.parse(manifestText);
    let r = 0;
    for (const scene of manifest.scenes) {
        const prompts = extractFences(texts.get(scene.file) ?? '');
        scene.shots.forEach((shot, i) => {
            const row = rows[r];
            r += 1;
            if (row === undefined || row.length !== CSV_COLUMNS.length)
                problems.push(`CSV row for ${shot.id} malformed`);
            else if (row[8] !== prompts[i] || row[9] !== prompts[i])
                problems.push(`CSV description for ${shot.id} differs from Markdown prompt`);
        });
    }
    if (r !== rows.length)
        problems.push(`CSV has ${rows.length} rows, manifest lists ${r} shots`);
    return problems;
}
/** Explicit, verified cleanup of a tool-owned incomplete reservation. Refuses anything it cannot prove it owns. */
export function cleanupIncomplete(dir) {
    const root = resolve(dir);
    if (!existsSync(root) || !lstatSync(root).isDirectory())
        throw new ExportError('CLEANUP_REFUSED', `${root} is not a directory`);
    if (existsSync(join(root, 'COMMITTED.json')))
        throw new ExportError('CLEANUP_REFUSED', `${root} has COMMITTED.json; committed packs are never cleaned up`);
    const refuse = (why) => { throw new ExportError('CLEANUP_REFUSED', `${why}; refusing cleanup`); };
    const stagingPath = join(root, '.staging');
    const reservationPath = join(stagingPath, 'RESERVATION.json');
    if (!existsSync(stagingPath))
        refuse(`${root} has no tool reservation record`);
    if (!lstatSync(stagingPath).isDirectory())
        refuse('.staging is not a real directory');
    if (!existsSync(reservationPath) || !lstatSync(reservationPath).isFile())
        refuse('RESERVATION.json is missing or not a regular file');
    let parsed;
    try {
        parsed = JSON.parse(readFileSync(reservationPath, 'utf8'));
    }
    catch {
        return refuse('RESERVATION.json is not valid JSON');
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
        return refuse('malformed reservation record');
    const reservation = parsed;
    const keys = Object.keys(reservation).sort().join(',');
    if (keys !== 'files,planSha256,tool')
        refuse('reservation record has unexpected fields');
    if (reservation['tool'] !== GENERATOR)
        refuse(`reservation tool ${JSON.stringify(reservation['tool'])} is not ${GENERATOR}`);
    if (typeof reservation['planSha256'] !== 'string' || !/^[0-9a-f]{64}$/.test(reservation['planSha256']))
        refuse('reservation planSha256 is malformed');
    const listed = reservation['files'];
    if (!Array.isArray(listed) || listed.length === 0)
        return refuse('reservation file list is malformed');
    const owned = new Set();
    for (const f of listed) {
        if (typeof f !== 'string' || !isSafeRelativePath(f) || f.includes('/') || f === '.staging')
            refuse('reservation lists an unsafe path');
        if (owned.has(f))
            refuse(`reservation lists ${String(f)} twice`);
        owned.add(f);
    }
    const entries = readdirSync(root);
    for (const entry of entries) {
        if (entry === '.staging')
            continue;
        if (!owned.has(entry))
            refuse(`unexpected entry ${entry}`);
        if (!lstatSync(join(root, entry)).isFile())
            refuse(`${entry} is not a regular file`);
    }
    const removed = [];
    for (const entry of entries) {
        if (entry === '.staging')
            continue;
        rmSync(join(root, entry));
        removed.push(entry);
    }
    rmSync(join(root, '.staging'), { recursive: true, force: true });
    removed.push('.staging');
    rmdirSync(root);
    return { removed };
}
