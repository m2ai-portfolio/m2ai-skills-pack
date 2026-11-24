import { DiagnosticSink } from './diag.js';
export const str = (o = {}) => ({ k: 'str', ...o });
export const num = (o = {}) => ({ k: 'num', ...o });
export const bool = { k: 'bool' };
export const nul = { k: 'null' };
export const lit = (v) => ({ k: 'lit', v });
export const arr = (of, min) => (min === undefined ? { k: 'arr', of } : { k: 'arr', of, min });
export const obj = (props, optional = [], description) => description === undefined ? { k: 'obj', props, optional } : { k: 'obj', props, optional, description };
export const rec = (of) => ({ k: 'rec', of });
export const json = { k: 'json' };
export const union = (...of) => ({ k: 'union', of });
export const nullable = (of) => union(of, nul);
export const oneOf = (...values) => str({ enum: values });
export const ID_PATTERN = '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$';
export const id = str({ pattern: ID_PATTERN, description: 'Stable ID; also safe as a file-name component.' });
export const sha = str({ pattern: '^[0-9a-f]{64}$', description: 'Lowercase SHA-256 hex.' });
export const text = str({ nonEmpty: true });
function typeName(value) {
    if (value === null)
        return 'null';
    if (Array.isArray(value))
        return 'array';
    return typeof value;
}
/** Returns true when value satisfies spec (no diagnostics escape). */
function matches(spec, value) {
    const probe = new DiagnosticSink();
    validateSpec(spec, value, '', probe);
    return probe.ok;
}
export function validateSpec(spec, value, path, sink) {
    switch (spec.k) {
        case 'str':
            if (typeof value !== 'string')
                return sink.error('SCHEMA_TYPE', path, `expected string, found ${typeName(value)}`);
            if (spec.nonEmpty && value.trim() === '')
                sink.error('SCHEMA_EMPTY', path, 'must not be empty');
            if (spec.pattern !== undefined && !new RegExp(spec.pattern).test(value))
                sink.error('SCHEMA_PATTERN', path, `value ${JSON.stringify(value)} does not match ${spec.pattern}`);
            if (spec.enum !== undefined && !spec.enum.includes(value))
                sink.error('SCHEMA_ENUM', path, `value ${JSON.stringify(value)} is not one of ${spec.enum.join(', ')}`);
            return;
        case 'num':
            if (typeof value !== 'number' || !Number.isFinite(value))
                return sink.error('SCHEMA_TYPE', path, `expected finite number, found ${typeName(value)}`);
            if (spec.int && !Number.isInteger(value))
                sink.error('SCHEMA_RANGE', path, 'must be an integer');
            if (spec.positive && !(value > 0))
                sink.error('SCHEMA_RANGE', path, 'must be positive');
            if (spec.min !== undefined && value < spec.min)
                sink.error('SCHEMA_RANGE', path, `must be >= ${spec.min}`);
            return;
        case 'bool':
            if (typeof value !== 'boolean')
                sink.error('SCHEMA_TYPE', path, `expected boolean, found ${typeName(value)}`);
            return;
        case 'null':
            if (value !== null)
                sink.error('SCHEMA_TYPE', path, `expected null, found ${typeName(value)}`);
            return;
        case 'lit':
            if (value !== spec.v)
                sink.error('SCHEMA_CONST', path, `expected ${JSON.stringify(spec.v)}`, 'unsupported schemaVersion/kind values are rejected');
            return;
        case 'arr':
            if (!Array.isArray(value))
                return sink.error('SCHEMA_TYPE', path, `expected array, found ${typeName(value)}`);
            if (spec.min !== undefined && value.length < spec.min)
                sink.error('SCHEMA_RANGE', path, `needs at least ${spec.min} item(s)`);
            value.forEach((item, index) => validateSpec(spec.of, item, `${path}/${index}`, sink));
            return;
        case 'rec':
            if (typeof value !== 'object' || value === null || Array.isArray(value))
                return sink.error('SCHEMA_TYPE', path, `expected object, found ${typeName(value)}`);
            for (const [key, item] of Object.entries(value))
                validateSpec(spec.of, item, `${path}/${key}`, sink);
            return;
        case 'obj': {
            if (typeof value !== 'object' || value === null || Array.isArray(value))
                return sink.error('SCHEMA_TYPE', path, `expected object, found ${typeName(value)}`);
            const record = value;
            for (const key of Object.keys(record)) {
                if (!Object.hasOwn(spec.props, key))
                    sink.error('SCHEMA_UNKNOWN_FIELD', `${path}/${key}`, `unknown field "${key}"`, `allowed fields: ${Object.keys(spec.props).join(', ')}`);
            }
            for (const [key, child] of Object.entries(spec.props)) {
                if (!Object.hasOwn(record, key)) {
                    if (!spec.optional.includes(key))
                        sink.error('SCHEMA_MISSING_FIELD', `${path}/${key}`, `missing required field "${key}"`);
                    continue;
                }
                validateSpec(child, record[key], `${path}/${key}`, sink);
            }
            return;
        }
        case 'json':
            return;
        case 'union':
            if (!spec.of.some(option => matches(option, value)))
                sink.error('SCHEMA_UNION', path, `value matches none of the allowed shapes (found ${typeName(value)})`);
            return;
    }
}
export function toJsonSchema(spec) {
    switch (spec.k) {
        case 'str': {
            const out = { type: 'string' };
            if (spec.pattern !== undefined)
                out['pattern'] = spec.pattern;
            if (spec.enum !== undefined)
                out['enum'] = [...spec.enum];
            if (spec.nonEmpty)
                out['minLength'] = 1;
            if (spec.description !== undefined)
                out['description'] = spec.description;
            return out;
        }
        case 'num': {
            const out = { type: spec.int ? 'integer' : 'number' };
            if (spec.positive)
                out['exclusiveMinimum'] = 0;
            if (spec.min !== undefined)
                out['minimum'] = spec.min;
            if (spec.description !== undefined)
                out['description'] = spec.description;
            return out;
        }
        case 'bool':
            return { type: 'boolean' };
        case 'null':
            return { type: 'null' };
        case 'lit':
            return { const: spec.v };
        case 'arr': {
            const out = { type: 'array', items: toJsonSchema(spec.of) };
            if (spec.min !== undefined)
                out['minItems'] = spec.min;
            return out;
        }
        case 'rec':
            return { type: 'object', additionalProperties: toJsonSchema(spec.of) };
        case 'obj': {
            const properties = {};
            for (const [key, child] of Object.entries(spec.props))
                properties[key] = toJsonSchema(child);
            const out = {
                type: 'object',
                additionalProperties: false,
                required: Object.keys(spec.props).filter(key => !spec.optional.includes(key)),
                properties
            };
            if (spec.description !== undefined)
                out['description'] = spec.description;
            return out;
        }
        case 'json':
            return {};
        case 'union':
            return { anyOf: spec.of.map(toJsonSchema) };
    }
}
