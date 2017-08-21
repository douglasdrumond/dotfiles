"use strict";
const vscode = require('vscode');
const FlowLib_1 = require('./FlowLib');
const beautify = require('js-beautify').js_beautify;
class HoverProvider {
    provideHover(document, position, token) {
        const wordPosition = document.getWordRangeAtPosition(position);
        if (!wordPosition)
            return new Promise((resolve) => resolve());
        const word = document.getText(wordPosition);
        return FlowLib_1.default.getTypeAtPos(document.getText(), document.uri.fsPath, position).then((typeAtPos) => {
            const beautifiedData = beautify(typeAtPos.type, { indent_size: 4 });
            return new vscode.Hover([
                'Flow-IDE',
                { language: 'javascriptreact', value: `${word}: ${beautifiedData}` }
            ]);
        }).catch((e) => {
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HoverProvider;
//# sourceMappingURL=HoverProvider.js.map