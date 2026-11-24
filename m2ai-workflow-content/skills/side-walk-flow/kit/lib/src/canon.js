import { createHash } from 'node:crypto';
export function sha256Hex(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}
/**
 * Stable JSON serialization used for every fingerprint (docs: kit/README.md, "Serialization").
 * - UTF-8, no insignificant whitespace.
 * - Object keys sorted by UTF-16 code unit order, recursively.
 * - Arrays keep their order (callers sort sets explicitly before serializing).
 * - Non-finite numbers, undefined, functions and symbols are rejected.
 */
export function canonicalJson(value) {
    if (value === null)
        return 'null';
    switch (typeof value) {
        case 'boolean':
            return value ? 'true' : 'false';
        case 'number':
            if (!Number.isFinite(value))
                throw new Error('canonicalJson: non-finite number');
            return JSON.stringify(value);
        case 'string':
            return JSON.stringify(value);
        case 'object': {
            if (Array.isArray(value))
                return `[${value.map(canonicalJson).join(',')}]`;
            const record = value;
            const keys = Object.keys(record).sort();
            const parts = [];
            for (const key of keys) {
                if (record[key] === undefined)
                    throw new Error(`canonicalJson: undefined at ${key}`);
                parts.push(`${JSON.stringify(key)}:${canonicalJson(record[key])}`);
            }
            return `{${parts.join(',')}}`;
        }
        default:
            throw new Error(`canonicalJson: unsupported ${typeof value}`);
    }
}
export function fingerprint(value) {
    return sha256Hex(canonicalJson(value));
}
