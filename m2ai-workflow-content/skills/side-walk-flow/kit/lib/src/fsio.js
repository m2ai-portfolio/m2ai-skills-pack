import { readFileSync } from 'node:fs';
import { isAbsolute, join, normalize, sep } from 'node:path';
import { sha256Hex } from './canon.js';
import { DiagnosticSink } from './diag.js';
import { validateSpec } from './spec.js';
/** Repository-relative POSIX path: no absolute path, no "..", no backslash, no NUL, no empty parts. */
export function isSafeRelativePath(rel) {
    if (rel === '' || rel.includes('\0') || rel.includes('\\') || isAbsolute(rel))
        return false;
    const parts = rel.split('/');
    return parts.every(part => part !== '' && part !== '.' && part !== '..');
}
export function resolveUnder(root, rel) {
    if (!isSafeRelativePath(rel))
        throw new Error(`unsafe relative path: ${JSON.stringify(rel)}`);
    return join(root, normalize(rel).split('/').join(sep));
}
export function readHashed(path) {
    const bytes = readFileSync(path);
    return { bytes, sha256: sha256Hex(bytes) };
}
/** Parse JSON bytes and apply a Spec. Returns null and records errors when the document is unusable. */
export function parseDocument(bytes, spec, label, sink) {
    let value;
    try {
        value = JSON.parse(bytes.toString('utf8'));
    }
    catch (error) {
        sink.error('JSON_PARSE', label, `not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
    const local = new DiagnosticSink();
    validateSpec(spec, value, '', local);
    for (const item of local.items)
        sink.items.push({ ...item, path: `${label}${item.path}` });
    if (!local.ok)
        return null;
    return { value: value, bytes, sha256: sha256Hex(bytes) };
}
export function loadDocument(path, spec, label, sink) {
    let bytes;
    try {
        bytes = readFileSync(path);
    }
    catch (error) {
        sink.error('FILE_READ', label, `cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
    return parseDocument(bytes, spec, label, sink);
}
/** Documented pretty JSON for generated artifacts: 2-space indent, sorted keys, trailing newline. */
export function prettyJson(value) {
    return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}
function sortKeys(value) {
    if (Array.isArray(value))
        return value.map(sortKeys);
    if (value !== null && typeof value === 'object') {
        const out = {};
        for (const key of Object.keys(value).sort())
            Object.defineProperty(out, key, { value: sortKeys(value[key]), enumerable: true, writable: true, configurable: true });
        return out;
    }
    return value;
}
