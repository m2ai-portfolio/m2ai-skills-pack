// Persona mechanism for the side-walk script writer. Pure data and one selection seam; no I/O, no network.
// Exactly one persona exists (neutral). Later Jev routing replaces `selectPersona` only; callers never name a creator.
export const DEFAULT_PERSONA_ID = 'neutral';
export const NEUTRAL_PERSONA = Object.freeze({
    id: DEFAULT_PERSONA_ID,
    label: 'Neutral narrator',
    voice: 'Plain, concrete, present-tense. Short sentences. Describe what is seen and said; no imitation of any real person or creator.',
    // Frozen too: the registry entry is shared by every caller, so its rules must not be mutable.
    avoid: Object.freeze(['imitating a named person or creator', 'catchphrases', 'invented facts beyond the brief and its trend records'])
});
const REGISTRY = Object.freeze([NEUTRAL_PERSONA]);
export function listPersonas() {
    return REGISTRY;
}
/** The single selection seam. Future Jev routing supplies its own PersonaSelector to `writerPersona`. */
export const selectPersona = request => {
    const wanted = request.requestedId ?? DEFAULT_PERSONA_ID;
    const found = REGISTRY.find(p => p.id === wanted);
    if (found === undefined)
        throw new Error(`unknown persona "${wanted}"; available: ${REGISTRY.map(p => p.id).join(', ')}`);
    return found;
};
/** Resolve the persona for a brief. A custom selector must still return a persona from the registry. */
export function writerPersona(request = {}, selector = selectPersona) {
    const chosen = selector(request);
    const canonical = REGISTRY.find(p => p.id === chosen.id);
    if (canonical === undefined)
        throw new Error(`selector returned unregistered persona "${chosen.id}"`);
    // Return the registry entry, never the selector's object, so a forged voice/label cannot pass through.
    return canonical;
}
