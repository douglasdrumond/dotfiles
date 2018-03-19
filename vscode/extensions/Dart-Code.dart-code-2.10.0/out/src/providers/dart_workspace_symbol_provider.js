"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const analyzer_1 = require("../analysis/analyzer");
const utils_1 = require("../utils");
class DartWorkspaceSymbolProvider {
    constructor(analyzer) {
        this.badChars = new RegExp("[^0-9a-z\-]", "gi");
        this.analyzer = analyzer;
    }
    provideWorkspaceSymbols(query, token) {
        return __awaiter(this, void 0, void 0, function* () {
            if (query.length === 0)
                return null;
            // Turn query into a case-insensitive fuzzy search.
            const pattern = ".*" + query.replace(this.badChars, "").split("").map((c) => `[${c.toUpperCase()}${c.toLowerCase()}]`).join(".*") + ".*";
            const results = yield this.analyzer.searchGetElementDeclarations({ pattern });
            return results.declarations.map((d) => this.convertResult(d, results.files[d.fileIndex]));
        });
    }
    convertResult(result, file) {
        return {
            containerName: result.className,
            kind: analyzer_1.getSymbolKindForElementKind(result.kind),
            location: {
                range: utils_1.toRange({ startLine: result.line, startColumn: result.column, length: 0 }),
                uri: vscode_1.Uri.file(file),
            },
            name: result.name,
        };
    }
}
exports.DartWorkspaceSymbolProvider = DartWorkspaceSymbolProvider;
//# sourceMappingURL=dart_workspace_symbol_provider.js.map