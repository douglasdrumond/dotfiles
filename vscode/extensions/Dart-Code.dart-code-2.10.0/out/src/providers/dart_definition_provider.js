"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const util = require("../utils");
class DartDefinitionProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideDefinition(document, position, token) {
        return new Promise((resolve, reject) => {
            this.analyzer.analysisGetNavigation({
                file: document.fileName,
                length: 0,
                offset: document.offsetAt(position),
            }).then((resp) => {
                if (resp.targets.length === 0)
                    resolve(null);
                else
                    resolve(resp.targets.map((t) => this.convertResult(t, resp.files[t.fileIndex])));
            }, (e) => { util.logError(e); reject(); });
        });
    }
    convertResult(target, file) {
        // HACK: We sometimes get a startColumn of 0 (should be 1-based). Just treat this as 1 for now.
        //     See https://github.com/Dart-Code/Dart-Code/issues/200
        if (target.startColumn === 0)
            target.startColumn = 1;
        return {
            range: util.toRange(target),
            uri: vscode_1.Uri.file(file),
        };
    }
}
exports.DartDefinitionProvider = DartDefinitionProvider;
//# sourceMappingURL=dart_definition_provider.js.map