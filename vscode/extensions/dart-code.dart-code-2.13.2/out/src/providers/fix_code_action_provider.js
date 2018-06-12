"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const utils_1 = require("../utils");
const dart_diagnostic_provider_1 = require("./dart_diagnostic_provider");
class FixCodeActionProvider {
    constructor(analyzer) {
        this.metadata = {
            providedCodeActionKinds: [vscode_1.CodeActionKind.QuickFix],
        };
        this.analyzer = analyzer;
    }
    provideCodeActions(document, range, context, token) {
        if (!utils_1.isAnalyzableAndInWorkspace(document))
            return null;
        return new Promise((resolve, reject) => {
            this.analyzer.editGetFixes({
                file: utils_1.fsPath(document.uri),
                offset: document.offsetAt(range.start),
            }).then((result) => {
                // Because fixes may be the same for multiple errors, we'll de-dupe them based on their edit.
                const allActions = {};
                for (const errorFix of result.fixes) {
                    for (const fix of errorFix.fixes) {
                        allActions[JSON.stringify(fix.edits)] = this.convertResult(document, fix, errorFix.error);
                    }
                }
                resolve(Object.keys(allActions).map((a) => allActions[a]));
            }, (e) => { utils_1.logError(e); reject(); });
        });
    }
    convertResult(document, change, error) {
        const title = change.message;
        const diagnostics = error ? [dart_diagnostic_provider_1.DartDiagnosticProvider.createDiagnostic(error)] : undefined;
        const action = new vscode_1.CodeAction(title, vscode_1.CodeActionKind.QuickFix);
        action.command = {
            arguments: [document, change],
            command: "_dart.applySourceChange",
            title,
        };
        action.diagnostics = diagnostics;
        return action;
    }
}
exports.FixCodeActionProvider = FixCodeActionProvider;
//# sourceMappingURL=fix_code_action_provider.js.map