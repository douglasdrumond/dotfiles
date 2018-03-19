"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const utils_1 = require("../utils");
const config_1 = require("../config");
class DartDiagnosticProvider {
    constructor(analyzer, diagnostics) {
        this.analyzer = analyzer;
        this.diagnostics = diagnostics;
        this.analyzer.registerForAnalysisErrors((es) => this.handleErrors(es));
        // Fired when files are deleted
        this.analyzer.registerForAnalysisFlushResults((es) => this.flushResults(es));
    }
    handleErrors(notification) {
        let errors = notification.errors;
        if (!config_1.config.showTodos)
            errors = errors.filter((error) => error.type !== "TODO");
        this.diagnostics.set(vscode_1.Uri.file(notification.file), errors.map((e) => DartDiagnosticProvider.createDiagnostic(e)));
    }
    static createDiagnostic(error) {
        return {
            code: error.code,
            message: ((error.type === "HINT" || error.type === "LINT") && config_1.config.showLintNames ? `${error.code}: ` : "") + error.message,
            range: utils_1.toRange(error.location),
            severity: DartDiagnosticProvider.getSeverity(error.severity, error.type),
            source: "dart",
        };
    }
    static getSeverity(severity, type) {
        switch (severity) {
            case "ERROR":
                return vscode_1.DiagnosticSeverity.Error;
            case "WARNING":
                return vscode_1.DiagnosticSeverity.Warning;
            case "INFO":
                switch (type) {
                    case "TODO":
                        return vscode_1.DiagnosticSeverity.Hint;
                    default:
                        return vscode_1.DiagnosticSeverity.Information;
                }
            default:
                throw new Error("Unknown severity type: " + severity);
        }
    }
    flushResults(notification) {
        const entries = notification.files.map((file) => [vscode_1.Uri.file(file), undefined]);
        this.diagnostics.set(entries);
    }
}
exports.DartDiagnosticProvider = DartDiagnosticProvider;
//# sourceMappingURL=dart_diagnostic_provider.js.map