"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const utils_1 = require("../utils");
const dart_diagnostic_provider_1 = require("./dart_diagnostic_provider");
class FixCodeActionProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideCodeActions(document, range, context, token) {
        // TODO: Should this just be isAnalyzable?
        if (!utils_1.isAnalyzableAndInWorkspace(document))
            return null;
        return new Promise((resolve, reject) => {
            this.analyzer.editGetFixes({
                file: document.fileName,
                offset: document.offsetAt(range.start),
            }).then((result) => {
                const allActions = new Array();
                for (const errorFix of result.fixes)
                    allActions.push(...errorFix.fixes.map((fix) => this.convertResult(document, fix, errorFix.error)));
                resolve(allActions);
            }, (e) => { utils_1.logError(e); reject(); });
        });
    }
    convertResult(document, change, error) {
        const title = change.message;
        const diagnostics = error ? [dart_diagnostic_provider_1.DartDiagnosticProvider.createDiagnostic(error)] : undefined;
        return {
            command: {
                arguments: [document, change],
                command: "_dart.applySourceChange",
                title,
            },
            diagnostics,
            kind: vscode_1.CodeActionKind.QuickFix,
            title,
        };
    }
}
exports.FixCodeActionProvider = FixCodeActionProvider;
//# sourceMappingURL=fix_code_action_provider.js.map