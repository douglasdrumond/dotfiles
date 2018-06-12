"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const config_1 = require("../config");
const utils_1 = require("../utils");
class DartTypeFormattingEditProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideOnTypeFormattingEdits(document, position, ch, options, token) {
        return new Promise((resolve, reject) => {
            this.analyzer.editFormat({
                file: utils_1.fsPath(document.uri),
                lineLength: config_1.config.for(document.uri).lineLength,
                selectionLength: 0,
                selectionOffset: 0,
            }).then((resp) => {
                if (resp.edits.length === 0)
                    resolve(null);
                else
                    resolve(resp.edits.map((e) => this.convertData(document, e)));
            }, (e) => { reject(); });
        });
    }
    convertData(document, edit) {
        return new vscode_1.TextEdit(new vscode_1.Range(document.positionAt(edit.offset), document.positionAt(edit.offset + edit.length)), edit.replacement);
    }
}
exports.DartTypeFormattingEditProvider = DartTypeFormattingEditProvider;
//# sourceMappingURL=dart_type_formatting_edit_provider.js.map