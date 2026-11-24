import { existsSync, linkSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { creativeTemplate, semanticTemplate } from './approvals.js';
import { cancelReplacement, confirmReplacement, emptyClips, evaluateClips, rebaseClips, selectClips, stageReplacement } from './clips.js';
import { DiagnosticSink, formatDiagnostics } from './diag.js';
import { cleanupIncomplete, evaluateAccepted, exportPack, ExportError, verifyPack } from './exporter.js';
import { dependentShotIds, allShotFingerprints } from './fingerprint.js';
import { loadDocument, prettyJson } from './fsio.js';
import { clipsSpec, SPECS } from './model.js';
import { diagnoseObserved, verifySources } from './observed.js';
import { analyzePlan, loadPlan, schemaDocument } from './plan.js';
import { checkPromptRunSheet, parsePromptRunSheet } from './prompt-check.js';
import { validateBrief, validateCase, validateTrends } from './records.js';
import { buildFlowRunsheet, buildFlowRunsheetFromShots, renderFlowRunsheetJson, renderFlowRunsheetMarkdown } from './runsheet.js';
import { sha256Hex } from './canon.js';
/** Exit statuses: 0 ok, 1 invalid/stale/unapproved/not ready, 2 usage, 3 filesystem refusal (collision, interrupted), 4 internal. */
export const EXIT = { ok: 0, invalid: 1, usage: 2, filesystem: 3, internal: 4 };
const USAGE = `devastator <command> [options]   (all commands are offline; paths are relative to --root, default cwd)

  sources                                   verify the 19 portable source copies and the original manifest hashes
  validate <plan> [--approvals f] [--accepted] [--allow-synthetic] [--json] [--verbose]
  diagnose-observed <observed-plan>         report the known defects of the supplied sample (diagnostic only)
  impact <plan> --asset <id>                list shots whose prompts/clips depend on an asset
  fingerprints <plan>                       print per-shot fingerprints
  review-template <plan> --type semantic|creative
  export <plan> --approvals f --out <new-directory> [--allow-synthetic] [--receipt f]
  verify-pack <directory> [--plan p]        accept a pack only if COMMITTED.json and every declared hash match
  flow-runsheet <pack-dir> [--out f] [--json] accepted pack -> per-shot Flow run sheet (Markdown; --json)
  flow-runsheet --shots <file.json> [--out f] [--json] plain shot list -> the same Flow run sheet
  flow-prompt-check <run-sheet.json>        lint every shot prompt (60-135 words, no em dash, no quotes, one Camera: sentence with one move, Avoid tail)
  cleanup-incomplete <directory>            remove a tool-owned incomplete reservation (never a committed pack)
  map-clips <plan> --clip-root d --clips f --select shot=path@take [...]
  replace-clip <plan> --clip-root d --clips f --shot id --file path --take id
  confirm-replacement|cancel-replacement <plan> --clip-root d --clips f --shot id
  rebase-clips <plan> --clips f             record the current plan revision on unchanged selections
  readiness <plan> --approvals f --clips f --clip-root d [--allow-synthetic] [--out ready.json]
  validate-case|validate-trends|validate-brief <file>
  schema <plan|approvals|clips|brief|case|trends|committed>
`;
function parseArgs(argv) {
    const positional = [];
    const flags = new Map();
    const booleans = new Set(['json', 'accepted', 'allow-synthetic', 'help', 'verbose']);
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg.startsWith('--')) {
            const name = arg.slice(2);
            const list = flags.get(name) ?? [];
            if (booleans.has(name))
                list.push('true');
            else {
                const value = argv[i + 1];
                if (value === undefined)
                    throw new UsageError(`--${name} needs a value`);
                list.push(value);
                i += 1;
            }
            flags.set(name, list);
        }
        else
            positional.push(arg);
    }
    return { positional, flags };
}
class UsageError extends Error {
}
const flag = (a, name) => a.flags.get(name)?.[a.flags.get(name).length - 1];
const need = (a, name) => {
    const v = flag(a, name);
    if (v === undefined)
        throw new UsageError(`missing --${name}`);
    return v;
};
const has = (a, name) => a.flags.has(name);
function emit(io, args, sink, extra = {}) {
    if (has(args, 'json'))
        io.out(`${JSON.stringify({ ok: sink.ok, diagnostics: sink.items, ...extra }, null, 2)}\n`);
    else {
        const lines = formatDiagnostics(has(args, 'verbose') ? sink.items : sink.items.filter(item => item.severity !== 'info'));
        if (lines !== '')
            io.out(`${lines}\n`);
    }
}
function writeAtomicJson(path, value) {
    const dir = dirname(path);
    const tmp = join(mkdtempSync(join(dir, '.tmp-')), 'next.json');
    writeFileSync(tmp, prettyJson(value), { flag: 'wx' });
    renameSync(tmp, path);
    rmSync(dirname(tmp), { recursive: true, force: true });
}
function loadClips(path, plan, sink, allowNew) {
    if (!existsSync(path)) {
        if (allowNew)
            return emptyClips(plan);
        sink.error('FILE_READ', 'clips', `${path} does not exist`);
        return null;
    }
    return loadDocument(path, clipsSpec, 'clips', sink)?.value ?? null;
}
function parseSelect(spec) {
    const m = /^([^=]+)=(.+)@([^@]+)$/.exec(spec);
    if (m === null)
        throw new UsageError(`--select expects shot=relative/path@take, got ${spec}`);
    return { shotId: m[1], file: m[2], takeId: m[3] };
}
export function run(argv, io, cwd) {
    const args = parseArgs(argv);
    const [command, ...rest] = args.positional;
    if (command === undefined || has(args, 'help')) {
        io.out(USAGE);
        return has(args, 'help') ? EXIT.ok : EXIT.usage;
    }
    const root = resolve(cwd, flag(args, 'root') ?? '.');
    const target = rest[0];
    const sink = new DiagnosticSink();
    const done = (extra = {}) => {
        emit(io, args, sink, extra);
        return sink.ok ? EXIT.ok : EXIT.invalid;
    };
    switch (command) {
        case 'schema': {
            if (target === undefined || !Object.hasOwn(SPECS, target))
                throw new UsageError(`schema needs one of ${Object.keys(SPECS).join(', ')}`);
            io.out(schemaDocument(target));
            return EXIT.ok;
        }
        case 'sources': {
            const check = verifySources(root);
            sink.items.push(...check.sink.items);
            io.out(`verified ${check.verified.length} source copies\n`);
            return done({ verified: check.verified });
        }
        case 'validate': {
            if (target === undefined)
                throw new UsageError('validate needs a plan path');
            const approvals = flag(args, 'approvals');
            if (has(args, 'accepted') || approvals !== undefined) {
                const ev = evaluateAccepted(root, target, approvals === undefined ? null : resolve(root, approvals), has(args, 'allow-synthetic'), approvals);
                sink.items.push(...ev.sink.items);
                return done({ planSha256: ev.loaded?.sha256 ?? null, accepted: sink.ok });
            }
            const loaded = loadPlan(root, target, sink);
            if (loaded !== null)
                analyzePlan(loaded, root, sink);
            return done({ planSha256: loaded?.sha256 ?? null, accepted: false, note: 'draft validation only; no approval state was evaluated' });
        }
        case 'diagnose-observed': {
            if (target === undefined)
                throw new UsageError('diagnose-observed needs the observed plan path');
            const report = diagnoseObserved(root, target);
            io.out(`observed rows: ${report.rows}, planned seconds: ${report.observedSeconds}\n`);
            io.out(`known defects reported (not repaired): ${report.known.length}\n${formatDiagnostics(report.known)}\n`);
            for (const missing of report.missingKnown)
                sink.error('KNOWN_DEFECT_NOT_REPORTED', '', `expected defect ${missing.code} ${missing.contains} was not reported`);
            for (const item of report.unexpected)
                sink.error('UNEXPECTED_OBSERVED_DIAGNOSTIC', item.path, `${item.code}: ${item.message}`);
            for (const problem of report.transcriptionProblems)
                sink.error('TRANSCRIPTION', '', problem);
            sink.items.push(...report.sink.items.filter(i => i.code === 'JSON_PARSE' || i.code.startsWith('SCHEMA_') || i.code.startsWith('INPUT_')));
            return done({ rows: report.rows, observedSeconds: report.observedSeconds, knownDefects: report.known.length });
        }
        case 'fingerprints':
        case 'impact': {
            if (target === undefined)
                throw new UsageError(`${command} needs a plan path`);
            const loaded = loadPlan(root, target, sink);
            if (loaded === null)
                return done();
            if (command === 'fingerprints')
                io.out(prettyJson([...allShotFingerprints(loaded.plan).values()]));
            else {
                const asset = need(args, 'asset');
                if (!loaded.plan.assets.some(a => a.id === asset))
                    sink.error('UNKNOWN_ASSET', asset, 'no such asset');
                else
                    io.out(`${dependentShotIds(loaded.plan, asset).join('\n')}\n`);
            }
            return done();
        }
        case 'review-template': {
            if (target === undefined)
                throw new UsageError('review-template needs a plan path');
            const loaded = loadPlan(root, target, sink);
            if (loaded === null)
                return done();
            const type = need(args, 'type');
            if (type !== 'semantic' && type !== 'creative')
                throw new UsageError('--type must be semantic or creative');
            io.out(prettyJson(type === 'semantic' ? semanticTemplate(loaded.plan, loaded.sha256) : creativeTemplate(loaded.sha256)));
            return EXIT.ok;
        }
        case 'export': {
            if (target === undefined)
                throw new UsageError('export needs a plan path');
            const approvals = need(args, 'approvals');
            const out = need(args, 'out');
            const ev = evaluateAccepted(root, target, resolve(root, approvals), has(args, 'allow-synthetic'), approvals);
            sink.items.push(...ev.sink.items);
            if (!sink.ok) {
                emit(io, args, sink);
                io.err('export refused: plan is invalid, stale or unapproved; nothing was written\n');
                return EXIT.invalid;
            }
            const faultSpec = flag(args, 'inject-fault');
            const fault = faultSpec === undefined ? undefined : faultSpec === 'before-marker' ? { beforeMarker: true } : { afterFiles: Number(faultSpec.replace('after-files:', '')) };
            try {
                const outcome = exportPack({ root, planRel: target, approvalsPath: resolve(root, approvals), approvalsRel: approvals, out: resolve(cwd, out), allowSynthetic: has(args, 'allow-synthetic'), ...(fault === undefined ? {} : { fault }) }, ev);
                emit(io, args, sink, { destination: outcome.destination });
                io.out(`COMMITTED ${outcome.destination} (${outcome.files.length} files, marker sha256 ${outcome.committedSha256})${outcome.synthetic ? ' [SYNTHETIC receipts]' : ''}\n`);
                const receipt = flag(args, 'receipt');
                if (receipt !== undefined) {
                    writeFileSync(resolve(cwd, receipt), prettyJson({ kind: 'devastator.export-receipt', exportedAt: new Date().toISOString(), destination: outcome.destination, planSha256: ev.loaded?.sha256, committedSha256: outcome.committedSha256, files: outcome.files, synthetic: outcome.synthetic }), { flag: 'wx' });
                }
                if (outcome.cleanupWarning !== null)
                    io.err(`${outcome.cleanupWarning}\n`);
                return EXIT.ok;
            }
            catch (error) {
                if (error instanceof ExportError) {
                    io.err(`export failed [${error.code}]: ${error.message}\n`);
                    return error.code === 'NOT_ACCEPTED' ? EXIT.invalid : EXIT.filesystem;
                }
                throw error;
            }
        }
        case 'verify-pack': {
            if (target === undefined)
                throw new UsageError('verify-pack needs a directory');
            let plan;
            const planPath = flag(args, 'plan');
            if (planPath !== undefined) {
                const loaded = loadPlan(root, planPath, sink);
                if (loaded === null)
                    return done();
                plan = loaded.plan;
            }
            const result = verifyPack(resolve(cwd, target), plan);
            sink.items.push(...result.sink.items);
            if (sink.ok)
                io.out(`ACCEPTED pack ${resolve(cwd, target)} (plan ${result.committed?.planSha256})${result.committed?.synthetic ? ' [SYNTHETIC receipts]' : ''}\n`);
            return done();
        }
        case 'flow-runsheet': {
            const shotsPath = flag(args, 'shots');
            let sheet;
            if (shotsPath !== undefined) {
                if (target !== undefined)
                    throw new UsageError('flow-runsheet accepts a pack directory or --shots, not both');
                let shotsText;
                try {
                    shotsText = readFileSync(resolve(cwd, shotsPath), 'utf8');
                }
                catch (error) {
                    sink.error('FILE_READ', shotsPath, `cannot read ${resolve(cwd, shotsPath)}: ${error instanceof Error ? error.message : String(error)}`);
                    return done();
                }
                sheet = buildFlowRunsheetFromShots(shotsText, sink);
            }
            else {
                if (target === undefined)
                    throw new UsageError('flow-runsheet needs a pack directory or --shots');
                const packDir = resolve(cwd, target);
                const verified = verifyPack(packDir);
                sink.items.push(...verified.sink.items);
                if (!sink.ok)
                    return done();
                let csvText;
                let manifestText;
                try {
                    csvText = readFileSync(join(packDir, 'shots.csv'), 'utf8');
                    manifestText = readFileSync(join(packDir, 'devastator-manifest.json'), 'utf8');
                }
                catch (error) {
                    sink.error('FILE_READ', packDir, `cannot read shots.csv or devastator-manifest.json: ${error instanceof Error ? error.message : String(error)}`);
                    return done();
                }
                sheet = buildFlowRunsheet(manifestText, csvText, sink);
            }
            if (sheet === null)
                return done();
            const text = has(args, 'json') ? renderFlowRunsheetJson(sheet) : renderFlowRunsheetMarkdown(sheet);
            const out = flag(args, 'out');
            if (out !== undefined) {
                try {
                    writeFileSync(resolve(cwd, out), text, 'utf8');
                }
                catch (error) {
                    sink.error('RUNSHEET_WRITE', out, `cannot write ${resolve(cwd, out)}: ${error instanceof Error ? error.message : String(error)}`);
                    emit(io, args, sink);
                    return EXIT.filesystem;
                }
                return EXIT.ok;
            }
            io.out(text);
            return EXIT.ok;
        }
        case 'flow-prompt-check': {
            if (target === undefined)
                throw new UsageError('flow-prompt-check needs a run sheet JSON file');
            let text;
            try {
                text = readFileSync(resolve(cwd, target), 'utf8');
            }
            catch (error) {
                sink.error('FILE_READ', target, `cannot read ${resolve(cwd, target)}: ${error instanceof Error ? error.message : String(error)}`);
                return done();
            }
            const shots = parsePromptRunSheet(text, sink);
            if (shots === null)
                return done({ checked: 0, failed: 0 });
            const result = checkPromptRunSheet(shots, sink);
            const code = done({ checked: shots.length, failed: result.failedShotIds.length });
            if (!has(args, 'json'))
                io.out(`flow-prompt-check: ${shots.length} shot(s), ${result.failedShotIds.length} failed\n`);
            return code;
        }
        case 'cleanup-incomplete': {
            if (target === undefined)
                throw new UsageError('cleanup-incomplete needs a directory');
            try {
                const { removed } = cleanupIncomplete(resolve(cwd, target));
                io.out(`removed ${removed.join(', ')}\n`);
                return EXIT.ok;
            }
            catch (error) {
                if (error instanceof ExportError) {
                    io.err(`cleanup refused: ${error.message}\n`);
                    return EXIT.filesystem;
                }
                throw error;
            }
        }
        case 'map-clips':
        case 'replace-clip':
        case 'confirm-replacement':
        case 'cancel-replacement':
        case 'rebase-clips': {
            if (target === undefined)
                throw new UsageError(`${command} needs a plan path`);
            const loaded = loadPlan(root, target, sink);
            if (loaded === null)
                return done();
            const clipsPath = resolve(root, need(args, 'clips'));
            const clips = loadClips(clipsPath, loaded.plan, sink, command === 'map-clips');
            if (clips === null)
                return done();
            const clipRoot = command === 'rebase-clips' || command === 'cancel-replacement' ? '' : resolve(root, need(args, 'clip-root'));
            let next = clips;
            if (command === 'map-clips') {
                const picks = (args.flags.get('select') ?? []).map(parseSelect);
                if (picks.length === 0)
                    throw new UsageError('map-clips needs at least one --select');
                next = selectClips(loaded.plan, loaded.sha256, clips, clipRoot, picks, sink);
            }
            else if (command === 'replace-clip')
                next = stageReplacement(loaded.plan, clips, clipRoot, { shotId: need(args, 'shot'), file: need(args, 'file'), takeId: need(args, 'take') }, sink);
            else if (command === 'confirm-replacement')
                next = confirmReplacement(loaded.plan, loaded.sha256, clips, clipRoot, need(args, 'shot'), sink);
            else if (command === 'cancel-replacement')
                next = cancelReplacement(clips, need(args, 'shot'), sink);
            else {
                const result = rebaseClips(loaded.plan, loaded.sha256, clips);
                next = result.clips;
                io.out(`rebased: ${result.rebased.join(', ') || 'none'}; stale (not rebased): ${result.stale.join(', ') || 'none'}\n`);
            }
            if (!sink.ok) {
                emit(io, args, sink);
                io.err(`${command} failed; ${clipsPath} was not modified\n`);
                return EXIT.invalid;
            }
            writeAtomicJson(clipsPath, next);
            io.out(`${command} ok; ${next.selections.length} selection(s), ${next.pending.length} pending\n`);
            return done();
        }
        case 'readiness': {
            if (target === undefined)
                throw new UsageError('readiness needs a plan path');
            const approvals = need(args, 'approvals');
            const ev = evaluateAccepted(root, target, resolve(root, approvals), has(args, 'allow-synthetic'), approvals);
            const approvalDiag = ev.sink.items;
            const clipSink = new DiagnosticSink();
            let status = null;
            if (ev.loaded !== null) {
                const clips = loadClips(resolve(root, need(args, 'clips')), ev.loaded.plan, clipSink, false);
                if (clips !== null)
                    status = evaluateClips(ev.loaded.plan, clips, resolve(root, need(args, 'clip-root')), clipSink);
            }
            sink.items.push(...approvalDiag, ...clipSink.items);
            const approvalsOk = !approvalDiag.some(d => d.severity === 'error');
            const clipsOk = !clipSink.items.some(d => d.severity === 'error');
            io.out(`approvals: ${approvalsOk ? 'current' : 'NOT current'}; clip mappings: ${clipsOk ? 'complete and fresh' : 'NOT ready'}${status === null ? '' : ` (fresh ${status.fresh.length}, stale ${status.stale.length}, missing ${status.missing.length})`}\n`);
            if (sink.ok && ev.loaded !== null) {
                const out = flag(args, 'out');
                if (out !== undefined) {
                    const clipsDoc = readFileSync(resolve(root, need(args, 'clips')));
                    const staged = resolve(cwd, `${out}.staged-${process.pid}`);
                    writeFileSync(staged, prettyJson({ kind: 'devastator.ready-manifest', planId: ev.loaded.plan.planId, planSha256: ev.loaded.sha256, clipsSha256: sha256Hex(clipsDoc), synthetic: ev.acceptance?.synthetic ?? false, claims: 'Hashes prove file bytes only; no audiovisual content, rendering or import success is claimed.' }), { flag: 'wx' });
                    try {
                        linkSync(staged, resolve(cwd, out));
                    }
                    finally {
                        rmSync(staged, { force: true });
                    }
                    io.out(`ready manifest written: ${out}\n`);
                }
            }
            return done({ ready: sink.ok });
        }
        case 'validate-case':
        case 'validate-trends':
        case 'validate-brief': {
            if (target === undefined)
                throw new UsageError(`${command} needs a file`);
            const path = resolve(root, target);
            if (command === 'validate-case')
                validateCase(path, root, sink);
            else if (command === 'validate-trends')
                validateTrends(path, root, sink);
            else
                validateBrief(path, sink);
            return done();
        }
        default:
            throw new UsageError(`unknown command ${command}`);
    }
}
export function main(argv) {
    const io = { out: text => void process.stdout.write(text), err: text => void process.stderr.write(text) };
    try {
        return run(argv, io, process.cwd());
    }
    catch (error) {
        if (error instanceof UsageError) {
            io.err(`usage error: ${error.message}\n\n${USAGE}`);
            return EXIT.usage;
        }
        io.err(`internal error: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
        return EXIT.internal;
    }
}
