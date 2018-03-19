"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const analyzer_1 = require("../analysis/analyzer");
class DartDocumentSymbolProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideDocumentSymbols(document, token) {
        const file = document.fileName;
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
        let name = element.name;
        if (element.parameters && element.kind !== "SETTER")
            name = `${name}${element.parameters}`;
        if (parent && parent.name)
            name = `${parent.name}.${name}`;
        // For properties, show if get/set.
        const propertyType = element.kind === "SETTER" ? "set" : element.kind === "GETTER" ? "get" : null;
        symbols.push({
            containerName: propertyType,
            kind: analyzer_1.getSymbolKindForElementKind(element.kind),
            location: {
                range: this.getRange(document, outline),
                uri: vscode_1.Uri.file(element.location.file),
            },
            name,
        });
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
exports.DartDocumentSymbolProvider = DartDocumentSymbolProvider;
//# sourceMappingURL=dart_document_symbol_provider.js.map