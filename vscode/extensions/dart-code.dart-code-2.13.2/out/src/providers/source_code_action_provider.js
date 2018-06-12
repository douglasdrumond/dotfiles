"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const utils_1 = require("../utils");
const SourceSortMembers = vscode_1.CodeActionKind.Source.append("sortMembers");
class SourceCodeActionProvider {
    constructor(analyzer) {
        this.metadata = {
            providedCodeActionKinds: [vscode_1.CodeActionKind.SourceOrganizeImports, SourceSortMembers],
        };
        this.analyzer = analyzer;
    }
    provideCodeActions(document, range, context, token) {
        if (!utils_1.isAnalyzableAndInWorkspace(document))
            return null;
        return [{
                command: {
                    command: "_dart.organizeImports",
                    title: "Organize Imports",
                },
                kind: vscode_1.CodeActionKind.SourceOrganizeImports,
                title: "Organize Imports",
            }, {
                command: {
                    command: "dart.sortMembers",
                    title: "Sort Members",
                },
                kind: SourceSortMembers,
                title: "Sort Members",
            }];
    }
}
exports.SourceCodeActionProvider = SourceCodeActionProvider;
//# sourceMappingURL=source_code_action_provider.js.map