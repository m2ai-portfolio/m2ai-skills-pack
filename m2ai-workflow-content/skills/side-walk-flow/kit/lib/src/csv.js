/** The first nine columns match the observed Digital Maker CSV; prompt_text and continuity_note are appended. */
export const CSV_COLUMNS = ['scene', 'shot', 'type', 'location', 'characters', 'dialogue', 'duration_seconds', 'references', 'description', 'prompt_text', 'continuity_note'];
/** RFC 4180 style: every field quoted, embedded quotes doubled, LF record separator, multiline/Unicode preserved. */
export function csvField(value) {
    return `"${value.replace(/"/g, '""')}"`;
}
export function csvRecord(fields) {
    return `${fields.map(csvField).join(',')}\n`;
}
/** Strict parser for the files this kit writes (quoted fields only). */
export function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
    while (i < text.length) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i += 2;
                    continue;
                }
                inQuotes = false;
                i += 1;
                continue;
            }
            field += ch;
            i += 1;
            continue;
        }
        if (ch === '"')
            inQuotes = true;
        else if (ch === ',') {
            row.push(field);
            field = '';
        }
        else if (ch === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        }
        else if (ch !== '\r')
            field += ch;
        i += 1;
    }
    if (inQuotes)
        throw new Error('unterminated quoted CSV field');
    if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}
