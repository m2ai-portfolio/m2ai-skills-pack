import { fingerprint } from './canon.js';
/**
 * Dependency-aware shot fingerprint (kit/README.md "Shot fingerprint").
 * Included: shot id, scene id, type, duration, location, beats, camera, final composition, dialogue (ordered),
 *           prompt text, provenance, references and visible sets (sorted), and the COMPLETE definition of every
 *           dependent asset: referenced + visible + dialogue speakers + the voice asset of each dependent character.
 * Excluded: presentation order only (shot.order, scene.order, array position of shots/scenes).
 */
export function dependentAssetIds(plan, shot) {
    const byId = new Map(plan.assets.map(asset => [asset.id, asset]));
    const ids = new Set([shot.locationId, ...shot.references, ...shot.visible, ...shot.dialogue.map(line => line.speakerId)]);
    for (const assetId of [...ids]) {
        const voice = byId.get(assetId)?.voiceAssetId;
        if (voice !== undefined)
            ids.add(voice);
    }
    return [...ids].filter(assetId => byId.has(assetId)).sort();
}
export function assetFingerprint(asset) {
    return fingerprint(asset);
}
export function shotFingerprint(plan, shot) {
    const byId = new Map(plan.assets.map(asset => [asset.id, asset]));
    const assetIds = dependentAssetIds(plan, shot);
    const assets = [];
    const assetFingerprints = {};
    for (const assetId of assetIds) {
        const asset = byId.get(assetId);
        if (asset === undefined)
            continue;
        assets.push(asset);
        assetFingerprints[assetId] = assetFingerprint(asset);
    }
    const { order: _order, ...content } = shot;
    void _order;
    const body = {
        shot: { ...content, references: [...shot.references].sort(), visible: [...shot.visible].sort() },
        assets
    };
    return { shotId: shot.id, fingerprint: fingerprint(body), assetFingerprints };
}
export function allShotFingerprints(plan) {
    return new Map(plan.shots.map(shot => [shot.id, shotFingerprint(plan, shot)]));
}
/** Shots whose fingerprint depends on the asset (what must be re-reviewed and re-selected after an asset edit). */
export function dependentShotIds(plan, assetId) {
    return plan.shots.filter(shot => dependentAssetIds(plan, shot).includes(assetId)).map(shot => shot.id);
}
