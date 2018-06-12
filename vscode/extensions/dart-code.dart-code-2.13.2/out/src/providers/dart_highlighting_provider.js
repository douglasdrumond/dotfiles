"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const open_file_tracker_1 = require("../analysis/open_file_tracker");
class DartDocumentHighlightProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideDocumentHighlights(document, position, token) {
        const offset = document.offsetAt(position);
        const occurrences = open_file_tracker_1.OpenFileTracker.getOccurrencesFor(document.uri);
        if (!occurrences)
            return;
        for (const occurrence of occurrences) {
            // If an occurence spans our position, then we don't need to look at any others.
            if (occurrence.offsets.find((o) => o <= offset && o + occurrence.length >= offset)) {
                return occurrence.offsets.map((o) => new vscode_1.DocumentHighlight(new vscode_1.Range(document.positionAt(o), document.positionAt(o + occurrence.length))));
            }
        }
    }
}
exports.DartDocumentHighlightProvider = DartDocumentHighlightProvider;
//# sourceMappingURL=dart_highlighting_provider.js.map