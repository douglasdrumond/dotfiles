"use strict";
const vscode = require('vscode');
const FlowLib_1 = require('./FlowLib');
const Path = require('path');
const mapToVSCodeType = (item) => {
    if (item.func_details !== null) {
        return vscode.CompletionItemKind.Function;
    }
    if (item.type && item.type.indexOf('[class: ') >= 0) {
        return vscode.CompletionItemKind.Class;
    }
    return vscode.CompletionItemKind.Variable;
};
const buildCodeSnippet = (item) => {
    let codeSnippet = item.name;
    const config = vscode.workspace.getConfiguration('flowide');
    if (config.get('use CodeSnippetsOnFunctionSuggest')) {
        if (item.func_details && item.func_details.params) {
            const suggestionArgumentNames = item.func_details.params
                .map((param) => `{{${param.name.replace('?', '')}}}`);
            if (suggestionArgumentNames.length > 0) {
                codeSnippet += '(' + suggestionArgumentNames.join(', ') + '){{}}';
            }
            else {
                codeSnippet += '()';
            }
        }
    }
    return codeSnippet;
};
class AutocompleteProvider {
    provideCompletionItems(document, position, token) {
        const fileContents = document.getText();
        const autocompletePromise = FlowLib_1.default.getAutocomplete(fileContents, document.uri.fsPath, position);
        return autocompletePromise.then((completions) => {
            return completions.result.map((item) => {
                const completionItem = new vscode.CompletionItem(item.name, mapToVSCodeType(item));
                completionItem.insertText = buildCodeSnippet(item);
                completionItem.detail = item.type ? item.type : Path.basename(item.path);
                return completionItem;
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AutocompleteProvider;
//# sourceMappingURL=AutocompleteProvider.js.map