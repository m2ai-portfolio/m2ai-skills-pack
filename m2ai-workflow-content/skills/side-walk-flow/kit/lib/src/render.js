import { fingerprint } from './canon.js';
import { CSV_COLUMNS, csvRecord, parseCsv } from './csv.js';
import { allShotFingerprints } from './fingerprint.js';
import { prettyJson } from './fsio.js';
import { shotContinuityNote } from './veo.js';
export const GENERATOR = 'devastator-kit 0.1.0';
export const CLAIMS = 'Offline planning pack. No rendered video, Digital Maker import compatibility, or audiovisual result is claimed.';
const byOrder = (items) => [...items].sort((a, b) => a.order - b.order);
export function orderedScenes(plan) {
    return byOrder(plan.scenes).map(scene => ({ scene, shots: byOrder(plan.shots.filter(s => s.sceneId === scene.id)) }));
}
function fence(text) {
    const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map(run => run.length));
    const mark = '`'.repeat(longest + 1);
    return `${mark}\n${text}\n${mark}`;
}
const label = (provenance) => (provenance === 'authored' ? 'supplied by creator' : provenance === 'generated' ? 'generated addition' : 'provenance unknown');
function assetBlock(asset) {
    const voice = asset.voiceAssetId === undefined ? '' : `\n**Voice asset:** ${asset.voiceAssetId}`;
    return `## ${asset.name} (${asset.id})\n\n**Provenance:** ${asset.provenance} (${label(asset.provenance)}) - ${asset.provenanceNote}${voice}\n\n**Description**\n\n${fence(asset.description)}\n`;
}
function banner(ctx) {
    if (!ctx.synthetic)
        return '';
    return `> SYNTHETIC TEST RECEIPTS (${ctx.syntheticLabels.join('; ')}). This pack was produced from automated fixtures. It is NOT human creative approval.\n\n`;
}
export function renderPack(plan, ctx) {
    const files = new Map();
    const scenes = orderedScenes(plan);
    const nameOf = new Map(plan.assets.map(a => [a.id, a.name]));
    const name = (assetId) => nameOf.get(assetId) ?? assetId;
    const total = plan.shots.reduce((sum, s) => sum + s.durationSeconds, 0);
    const treatmentRows = plan.requirements
        .map(r => `| ${r.id} | ${r.treatment} | ${r.shotIds.join(', ') || '-'} | ${r.rationale.replace(/\|/g, '\\|').replace(/\n/g, ' ') || '-'} |`)
        .join('\n');
    const additions = plan.additions.length === 0 ? '- none' : plan.additions.map(a => `- ${a.id} (${a.provenance}${a.material ? ', material' : ''}): ${a.description} [${a.shotIds.join(', ')}]`).join('\n');
    files.set('README.md', `# ${plan.title}\n\n${banner(ctx)}Plan \`${plan.planId}\` revision ${plan.revision}, plan SHA-256 \`${ctx.planSha256}\`.\n\n` +
        `Duration policy: ${plan.durationPolicy.mode}, target ${plan.durationPolicy.targetSeconds}s, planned total ${total}s. These are planned durations, not measured runtime.\n\n` +
        `${CLAIMS}\n\n## Order to work in\n\n1. Cast: \`00-cast.md\`.\n2. Locations and recurring objects: \`01-locations.md\`.\n3. Shoot scene files \`02-scene-<id>.md\` in listed order.\n4. Map selected takes explicitly with the kit's \`map-clips\` command.\n\n` +
        `Output preferences: subtitles ${plan.output.subtitles}, music ${plan.output.music}, audio leveling ${plan.output.audioLeveling}. Generation settings: ${plan.output.generationSettings}\n\n` +
        `## Scenes\n\n${scenes.map(({ scene, shots }) => `- ${scene.id}: ${scene.title} (${shots.length} shots, ${shots.reduce((s, x) => s + x.durationSeconds, 0)}s)`).join('\n')}\n\n` +
        `## Requirement treatment\n\n| Requirement | Treatment | Shots | Rationale |\n| --- | --- | --- | --- |\n${treatmentRows}\n\n## Additions beyond the creator brief\n\n${additions}\n`);
    const characters = plan.assets.filter(a => a.kind === 'character');
    const voices = plan.assets.filter(a => a.kind === 'voice');
    files.set('00-cast.md', `# Cast - ${plan.title}\n\n${banner(ctx)}Visible characters first. Voices are audio-only and never visible cast members.\n\n${characters.map(assetBlock).join('\n') || '_No characters._\n'}\n# Voices (off-screen only)\n\n${voices.map(assetBlock).join('\n') || '_No voices._\n'}`);
    const locations = plan.assets.filter(a => a.kind === 'location');
    const objects = plan.assets.filter(a => a.kind === 'object');
    files.set('01-locations.md', `# Locations and recurring objects - ${plan.title}\n\n${banner(ctx)}# Locations\n\n${locations.map(assetBlock).join('\n') || '_None._\n'}\n# Recurring objects and vehicles\n\n${objects.map(assetBlock).join('\n') || '_None._\n'}`);
    for (const { scene, shots } of scenes) {
        const attach = [...new Set(shots.flatMap(s => s.references))].map(name);
        const parts = [
            `# Scene ${scene.id} - ${scene.title}\n\n${banner(ctx)}- **Location profile:** ${name(scene.locationId)}\n- **Attach these profiles:** ${attach.join(', ')}\n- **Shots:** ${shots.length} - ${shots.reduce((s, x) => s + x.durationSeconds, 0)}s planned\n- **Provenance:** ${scene.provenance}\n\n> ${scene.summary}\n`,
            `## Beat coverage\n\n${scene.beats.map(b => `- ${b.id}: ${b.text} -> ${b.excludedRationale !== undefined ? `EXCLUDED: ${b.excludedRationale}` : b.support.map(s => `${s.shotId}/${s.beatId}`).join(', ')}`).join('\n')}\n`
        ];
        shots.forEach((shot, index) => {
            const dialogue = shot.dialogue.length === 0 ? 'none (silent shot)' : shot.dialogue.map(l => `${name(l.speakerId)}${l.offscreen ? ' (off-screen)' : ''}: ${l.text}`).join(' / ');
            parts.push(`## Shot ${index + 1} - ${shot.type} - ${shot.durationSeconds}s - ${shot.id}\n\nAttach: ${shot.references.map(name).join(', ')}\n\nVisible: ${shot.visible.map(name).join(', ') || 'none'}\n\nProvenance: ${shot.provenance}\n\nCamera: opening ${shot.camera.opening}; motion ${shot.camera.motion || 'none'}; ending ${shot.camera.ending || 'unspecified'}\n\nDialogue: ${dialogue}\n\n${shot.voiceover !== undefined && shot.voiceover !== '' ? `Voiceover: ${shot.voiceover}\n\n` : ''}${fence(shot.promptText)}\n`);
        });
        files.set(`02-scene-${scene.id}.md`, `${parts.join('\n')}`);
    }
    let csv = csvRecord([...CSV_COLUMNS]);
    scenes.forEach(({ shots }, si) => {
        shots.forEach((shot, index) => {
            csv += csvRecord([
                String(si + 1),
                String(index + 1),
                shot.type,
                name(shot.locationId),
                shot.visible.filter(v => plan.assets.find(a => a.id === v)?.kind === 'character').map(name).join('; '),
                shot.dialogue.map(l => l.text).join(' '),
                String(shot.durationSeconds),
                shot.references.map(name).join('; '),
                shot.promptText,
                shot.promptText,
                shotContinuityNote(shot, plan.assets)
            ]);
        });
    });
    files.set('shots.csv', csv);
    const prints = allShotFingerprints(plan);
    files.set('devastator-manifest.json', prettyJson({
        schemaVersion: 1,
        kind: 'devastator.pack-manifest',
        generator: GENERATOR,
        planId: plan.planId,
        planRevision: plan.revision,
        planSha256: ctx.planSha256,
        synthetic: ctx.synthetic,
        assets: plan.assets.map(a => ({ id: a.id, kind: a.kind, name: a.name, provenance: a.provenance, descriptionSha256: fingerprint(a.description) })),
        scenes: scenes.map(({ scene, shots }, si) => ({
            id: scene.id,
            csvScene: si + 1,
            file: `02-scene-${scene.id}.md`,
            provenance: scene.provenance,
            shots: shots.map((shot, index) => ({ id: shot.id, csvShot: index + 1, provenance: shot.provenance, durationSeconds: shot.durationSeconds, fingerprint: prints.get(shot.id)?.fingerprint ?? '' }))
        })),
        requirements: plan.requirements,
        additions: plan.additions,
        claims: CLAIMS
    }));
    return files;
}
/** Fence extraction mirrors fence(): longest-run delimiter, content verbatim. */
export function extractFences(markdown) {
    const lines = markdown.split('\n');
    const out = [];
    for (let i = 0; i < lines.length; i += 1) {
        const open = /^(`{3,})$/.exec(lines[i]);
        if (open === null)
            continue;
        const mark = open[1];
        const body = [];
        i += 1;
        while (i < lines.length && lines[i] !== mark) {
            body.push(lines[i]);
            i += 1;
        }
        out.push(body.join('\n'));
    }
    return out;
}
/** Self-check used before publication and by pack readers: prompts == CSV descriptions; cast text == canonical assets. */
export function checkRendered(plan, files) {
    const problems = [];
    const csv = files.get('shots.csv');
    if (csv === undefined)
        return ['shots.csv missing'];
    const rows = parseCsv(csv);
    const header = rows[0] ?? [];
    if (header.join(',') !== CSV_COLUMNS.join(','))
        problems.push('shots.csv header does not match the expected columns');
    const scenes = orderedScenes(plan);
    const expectedRows = scenes.reduce((n, s) => n + s.shots.length, 0);
    if (rows.length - 1 !== expectedRows)
        problems.push(`shots.csv has ${rows.length - 1} rows, expected ${expectedRows}`);
    let r = 1;
    for (const { scene, shots } of scenes) {
        const md = files.get(`02-scene-${scene.id}.md`);
        if (md === undefined) {
            problems.push(`scene file for ${scene.id} missing`);
            continue;
        }
        const prompts = extractFences(md);
        shots.forEach((shot, i) => {
            const row = rows[r];
            r += 1;
            if (row === undefined || row.length !== CSV_COLUMNS.length)
                return void problems.push(`CSV row for ${shot.id} malformed`);
            if (row[8] !== shot.promptText)
                problems.push(`CSV description for ${shot.id} differs from plan prompt`);
            if (row[9] !== shot.promptText)
                problems.push(`CSV prompt_text for ${shot.id} differs from plan prompt`);
            if (row[10] !== shotContinuityNote(shot, plan.assets))
                problems.push(`CSV continuity_note for ${shot.id} differs from the plan assets`);
            if (prompts[i] !== shot.promptText)
                problems.push(`Markdown prompt for ${shot.id} differs from plan prompt`);
            if (row[6] !== String(shot.durationSeconds))
                problems.push(`CSV duration for ${shot.id} differs`);
        });
    }
    const cast = files.get('00-cast.md') ?? '';
    const castFences = new Set(extractFences(cast));
    for (const asset of plan.assets.filter(a => a.kind === 'character' || a.kind === 'voice')) {
        if (!castFences.has(asset.description))
            problems.push(`cast description for ${asset.id} differs from the canonical asset`);
    }
    const places = new Set(extractFences(files.get('01-locations.md') ?? ''));
    for (const asset of plan.assets.filter(a => a.kind === 'location' || a.kind === 'object')) {
        if (!places.has(asset.description))
            problems.push(`location/object description for ${asset.id} differs from the canonical asset`);
    }
    return problems;
}
