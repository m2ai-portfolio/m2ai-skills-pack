export class DiagnosticSink {
    items = [];
    add(severity, code, path, message, hint) {
        const item = { code, severity, path, message };
        if (hint !== undefined)
            item.hint = hint;
        this.items.push(item);
    }
    error(code, path, message, hint) {
        this.add('error', code, path, message, hint);
    }
    warn(code, path, message, hint) {
        this.add('warning', code, path, message, hint);
    }
    info(code, path, message, hint) {
        this.add('info', code, path, message, hint);
    }
    get errorCount() {
        return this.items.filter(item => item.severity === 'error').length;
    }
    get ok() {
        return this.errorCount === 0;
    }
    codes(severity) {
        return this.items.filter(item => severity === undefined || item.severity === severity).map(item => item.code);
    }
}
export function formatDiagnostics(items) {
    return items
        .map(item => `${item.severity.toUpperCase()} ${item.code} ${item.path || '/'}: ${item.message}${item.hint ? ` (hint: ${item.hint})` : ''}`)
        .join('\n');
}
