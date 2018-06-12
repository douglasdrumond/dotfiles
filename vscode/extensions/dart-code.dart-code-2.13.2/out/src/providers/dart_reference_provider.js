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
const util = require("../utils");
const utils_1 = require("../utils");
class DartReferenceProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideReferences(document, position, context, token) {
        return __awaiter(this, void 0, void 0, function* () {
            // If we want to include the decleration, kick off a request for that.
            const definition = context.includeDeclaration
                ? this.provideDefinition(document, position, token)
                : null;
            const resp = yield this.analyzer.searchFindElementReferencesResults({
                file: utils_1.fsPath(document.uri),
                includePotential: true,
                offset: document.offsetAt(position),
            });
            const locations = resp.results.map((result) => {
                return new vscode_1.Location(vscode_1.Uri.file(result.location.file), util.toRangeOnLine(result.location));
            });
            return definition
                ? locations.concat(yield definition)
                : locations;
        });
    }
    provideDefinition(document, position, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const resp = yield this.analyzer.analysisGetNavigation({
                file: utils_1.fsPath(document.uri),
                length: 0,
                offset: document.offsetAt(position),
            });
            return resp.targets.map((target) => {
                // HACK: We sometimes get a startColumn of 0 (should be 1-based). Just treat this as 1 for now.
                //     See https://github.com/Dart-Code/Dart-Code/issues/200
                if (target.startColumn === 0)
                    target.startColumn = 1;
                return new vscode_1.Location(vscode_1.Uri.file(resp.files[target.fileIndex]), util.toRangeOnLine(target));
            });
        });
    }
}
exports.DartReferenceProvider = DartReferenceProvider;
//# sourceMappingURL=dart_reference_provider.js.map