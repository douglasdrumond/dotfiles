"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const analyzer_1 = require("../analysis/analyzer");
const utils_1 = require("../utils");
class LegacyDartDocumentSymbolProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideDocumentSymbols(document, token) {
        const file = utils_1.fsPath(document.uri);
        return new Promise((resolve, reject) => {
            const disposable = this.analyzer.registerForAnalysisOutline((n) => {
                if (n.file !== file)
                    return;
                disposable.dispose();
                const symbols = [];
                for (const element of n.outline.children)
                    this.transcribeOutline(document, symbols, null, element);
                resolve(symbols);
            });
            this.analyzer.forceNotificationsFor(file);
        });
    }
    transcribeOutline(document, symbols, parent, outline) {
        const element = outline.element;
        // Don't show these (#656).
        if (element.kind === "CONSTRUCTOR_INVOCATION" || element.kind === "FUNCTION_INVOCATION")
            return;
        let name = element.name;
        if (element.parameters && element.kind !== "SETTER")
            name = `${name}${element.parameters}`;
        symbols.push(new vscode_1.SymbolInformation(name, analyzer_1.getSymbolKindForElementKind(element.kind), parent && parent.name, new vscode_1.Location(vscode_1.Uri.file(element.location.file), this.getRange(document, outline))));
        if (outline.children) {
            for (const child of outline.children)
                this.transcribeOutline(document, symbols, element, child);
        }
    }
    getRange(document, outline) {
        // The outline's location includes whitespace before the block but the elements
        // location only includes the small range declaring the element. To give the best
        // experience to the user (perfectly highlight the range) we take the start point
        // from the element but the end point from the outline.
        const startPos = document.positionAt(outline.element.location.offset);
        const endPos = document.positionAt(outline.offset + outline.length);
        return new vscode_1.Range(startPos, endPos);
    }
}
exports.LegacyDartDocumentSymbolProvider = LegacyDartDocumentSymbolProvider;
//# sourceMappingURL=legacy_dart_document_symbol_provider.js.map