"use strict";
const vscode = require('vscode');
const FlowLib_1 = require('./FlowLib');
class DefinitionProvider {
    provideDefinition(document, position, token) {
        const fileContents = document.getText();
        const definitionPromise = FlowLib_1.default.getDefinition(fileContents, document.uri.fsPath, position);
        return definitionPromise.then((definition) => {
            if (definition) {
                const startPosition = new vscode.Position(definition.line - 1, definition.start - 1);
                const endPosition = new vscode.Position(definition.endline - 1, definition.end - 1);
                const uri = vscode.Uri.file(definition.path);
                return new vscode.Location(uri, new vscode.Range(startPosition, endPosition));
            }
            return null;
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DefinitionProvider;
//# sourceMappingURL=DefinitionProvider.js.map