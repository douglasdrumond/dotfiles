"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const utils_1 = require("../utils");
const supportedRefactors = {
    EXTRACT_METHOD: "Extract Method",
    EXTRACT_WIDGET: "Extract Widget",
};
class RefactorCodeActionProvider {
    constructor(analyzer) {
        this.metadata = {
            providedCodeActionKinds: [vscode_1.CodeActionKind.Refactor],
        };
        this.analyzer = analyzer;
    }
    provideCodeActions(document, range, context, token) {
        if (!utils_1.isAnalyzableAndInWorkspace(document))
            return null;
        return new Promise((resolve, reject) => {
            this.analyzer.editGetAvailableRefactorings({
                file: utils_1.fsPath(document.uri),
                length: document.offsetAt(range.end) - document.offsetAt(range.start),
                offset: document.offsetAt(range.start),
            }).then((result) => {
                const availableRefactors = result.kinds.map((k) => this.getRefactorForKind(document, range, k)).filter((r) => r);
                resolve(availableRefactors);
            }, (e) => { utils_1.logError(e); reject(); });
        });
    }
    getRefactorForKind(document, range, k) {
        if (!supportedRefactors[k])
            return;
        const title = supportedRefactors[k];
        const action = new vscode_1.CodeAction(title, vscode_1.CodeActionKind.Refactor);
        action.command = {
            arguments: [document, range, k],
            command: "_dart.performRefactor",
            title,
        };
        return action;
    }
}
exports.RefactorCodeActionProvider = RefactorCodeActionProvider;
//# sourceMappingURL=refactor_code_action_provider.js.map