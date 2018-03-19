"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const utils_1 = require("../utils");
class AssistCodeActionProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideCodeActions(document, range, context, token) {
        // TODO: Should this just be isAnalyzable?
        if (!utils_1.isAnalyzableAndInWorkspace(document))
            return null;
        return new Promise((resolve, reject) => {
            this.analyzer.editGetAssists({
                file: document.fileName,
                length: range.end.character - range.start.character,
                offset: document.offsetAt(range.start),
            }).then((assists) => {
                const actions = assists.assists.map((assist) => this.convertResult(document, assist));
                resolve(actions);
            }, (e) => { utils_1.logError(e); reject(); });
        });
    }
    convertResult(document, change) {
        const title = change.message;
        const refactorId = change.id
            ? vscode_1.CodeActionKind.Refactor.append(change.id.replace("dart.assist.", ""))
            : vscode_1.CodeActionKind.Refactor;
        return {
            command: {
                arguments: [document, change],
                command: "_dart.applySourceChange",
                title,
            },
            kind: refactorId,
            title,
        };
    }
}
exports.AssistCodeActionProvider = AssistCodeActionProvider;
//# sourceMappingURL=assist_code_action_provider.js.map