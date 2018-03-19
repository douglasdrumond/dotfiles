"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
class DartDocumentHighlightProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideDocumentHighlights(document, position, token) {
        const file = document.fileName;
        const offset = document.offsetAt(position);
        return new Promise((resolve, reject) => {
            const disposable = this.analyzer.registerForAnalysisOccurrences((n) => {
                if (n.file !== file)
                    return;
                disposable.dispose();
                const highlights = [];
                // The analysis server returns all items in the file that can have occurances, and
                // for each item, all the occurances of it in the file. We loop through each item
                // seeing if there's a match for the current cursor position. If there is, we create
                // highlights for those occurances, short circuit the search, and return the results.
                for (const occurrence of n.occurrences) {
                    this.buildOccurrences(highlights, document, offset, occurrence);
                    if (highlights.length > 0) {
                        resolve(highlights);
                        return;
                    }
                }
                resolve(highlights);
            });
            this.analyzer.forceNotificationsFor(file);
        });
    }
    buildOccurrences(highlights, document, position, occurrences) {
        const element = occurrences.element;
        const offsets = occurrences.offsets;
        const length = occurrences.length;
        for (const offset of offsets) {
            // Look for a match in any of the occurance ranges.
            if ((offset <= position) && (position < (offset + length))) {
                // If we get a match, then create highlights for all the items in the matching occurance.
                for (const offset of offsets) {
                    const range = new vscode_1.Range(document.positionAt(offset), document.positionAt(offset + length));
                    highlights.push(new vscode_1.DocumentHighlight(range));
                }
                return;
            }
        }
    }
}
exports.DartDocumentHighlightProvider = DartDocumentHighlightProvider;
//# sourceMappingURL=dart_highlighting_provider.js.map