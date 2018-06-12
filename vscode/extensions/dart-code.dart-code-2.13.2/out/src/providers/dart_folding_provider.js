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
const open_file_tracker_1 = require("../analysis/open_file_tracker");
class DartFoldingProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideFoldingRanges(document, context, token) {
        return __awaiter(this, void 0, void 0, function* () {
            // Wait for any current analysis to complete (eg. if we've just opened a project it
            // may take a while to get the results).
            yield this.analyzer.currentAnalysis;
            // Wait up to another few seconds after analysis completed (it might be that we opened a new
            // file and there was no analysis, in which case we're just waiting for the server to process
            // the newly added subscription and send results).
            let foldingRegions;
            for (let i = 0; i < 5; i++) {
                foldingRegions = open_file_tracker_1.OpenFileTracker.getFoldingRegionsFor(document.uri);
                if (foldingRegions)
                    break;
                yield new Promise((resolve, reject) => setTimeout(resolve, i * 1000));
            }
            if (!foldingRegions)
                return;
            return foldingRegions.map((f) => new vscode_1.FoldingRange(document.positionAt(f.offset).line, document.positionAt(f.offset + f.length).line, this.getKind(f.kind)));
        });
    }
    getKind(kind) {
        switch (kind) {
            case "COMMENT":
            case "DOCUMENTATION_COMMENT":
                return vscode_1.FoldingRangeKind.Comment;
            case "DIRECTIVES":
                return vscode_1.FoldingRangeKind.Imports;
        }
    }
}
exports.DartFoldingProvider = DartFoldingProvider;
//# sourceMappingURL=dart_folding_provider.js.map