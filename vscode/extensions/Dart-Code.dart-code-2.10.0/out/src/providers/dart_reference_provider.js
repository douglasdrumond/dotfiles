"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const util = require("../utils");
class DartReferenceProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideReferences(document, position, context, token) {
        return new Promise((resolve, reject) => {
            this.analyzer.searchFindElementReferencesResults({
                file: document.fileName,
                includePotential: true,
                offset: document.offsetAt(position),
            }).then((resp) => resolve(resp.results.map((r) => this.convertResult(r))), () => reject());
        });
    }
    convertResult(result) {
        return {
            range: util.toRange(result.location),
            uri: vscode_1.Uri.file(result.location.file),
        };
    }
}
exports.DartReferenceProvider = DartReferenceProvider;
//# sourceMappingURL=dart_reference_provider.js.map