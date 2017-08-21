"use strict";
const vscode = require('vscode');
const FlowLib_1 = require('./FlowLib');
class SignatureProvider {
    provideSignatureHelp(document, position, token) {
        let theCall = this.walkBackwardsToBeginningOfCall(document, position);
        if (theCall == null) {
            return Promise.resolve(null);
        }
        let callerRange = this.previousTokenPosition(document, theCall.openParen);
        let callerPos = callerRange.end;
        let callerPosStart = callerRange.start;
        const fileContents = document.getText();
        const currentPosOffset = document.offsetAt(position);
        const callerEndPosOffset = document.offsetAt(callerPos);
        const callerStartPosOffset = document.offsetAt(callerPosStart);
        const callerName = fileContents.slice(callerStartPosOffset, callerEndPosOffset);
        const strToAutocomplete = fileContents.slice(0, callerEndPosOffset) + fileContents.slice(currentPosOffset);
        const autocompletePromise = FlowLib_1.default.getAutocomplete(strToAutocomplete, document.uri.fsPath, callerPos);
        return autocompletePromise.then((completions) => {
            const res = completions.result;
            const item = res.find((c) => c.func_details !== null && c.name === callerName);
            if (!item) {
                return null;
            }
            const signatureHelp = new vscode.SignatureHelp();
            const sig = new vscode.SignatureInformation(callerName + item.type, '');
            sig.parameters = item.func_details.params.map((detail) => {
                return new vscode.ParameterInformation(`${detail.name}:${detail.type}`);
            });
            signatureHelp.signatures = [sig];
            signatureHelp.activeParameter = Math.min(theCall.commas.length - 1, item.func_details.params.length - 1);
            signatureHelp.activeSignature = 0;
            return signatureHelp;
        });
    }
    previousTokenPosition(document, position) {
        while (position.character > 0) {
            let word = document.getWordRangeAtPosition(position);
            if (word) {
                return word;
            }
            position = position.translate(0, -1);
        }
        return null;
    }
    walkBackwardsToBeginningOfCall(document, position) {
        let currentLine = document.lineAt(position.line).text.substring(0, position.character);
        let parenBalance = 0;
        let commas = [];
        for (let char = position.character; char >= 0; char--) {
            switch (currentLine[char]) {
                case '(':
                    parenBalance--;
                    if (parenBalance < 0) {
                        return {
                            openParen: new vscode.Position(position.line, char),
                            commas: commas
                        };
                    }
                    break;
                case ')':
                    parenBalance++;
                    break;
                case ',':
                    if (parenBalance === 0) {
                        commas.push(new vscode.Position(position.line, char));
                    }
            }
        }
        return null;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SignatureProvider;
//# sourceMappingURL=SignatureProvider.js.map