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
const path = require("path");
const vscode_1 = require("vscode");
const analyzer_1 = require("../analysis/analyzer");
const utils_1 = require("../utils");
class DartSymbolProvider {
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
            return results.declarations.map((d) => this.convertResult(d, results.files[d.fileIndex], true));
        });
    }
    provideDocumentSymbols(document, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = yield this.analyzer.searchGetElementDeclarations({ file: utils_1.fsPath(document.uri) });
            return results.declarations.map((d) => this.convertResult(d, results.files[d.fileIndex], false));
        });
    }
    convertResult(result, file, includeFilename) {
        let name = result.name;
        // Constructors don't come prefixed with class name, so add them for a nice display:
        //    () => MyClass()
        //    named() => MyClass.named()
        let nameIsPrefixedWithClass = false;
        if (result.kind === "CONSTRUCTOR" && result.className) {
            if (name) {
                nameIsPrefixedWithClass = true;
                name = `${result.className}.${name}`;
            }
            else {
                name = result.className;
            }
        }
        if (result.parameters && result.kind !== "SETTER")
            name += result.parameters;
        let containerName = "";
        if (includeFilename) {
            containerName = this.createDisplayPath(file);
            if (result.className && !nameIsPrefixedWithClass)
                name = `${result.className}.${name}`;
        }
        else {
            containerName = result.className || "";
        }
        return new vscode_1.SymbolInformation(name, analyzer_1.getSymbolKindForElementKind(result.kind), containerName, new vscode_1.Location(vscode_1.Uri.file(file), utils_1.toRangeOnLine({ startLine: result.line, startColumn: result.column, length: 0 })));
    }
    createDisplayPath(inputPath) {
        // HACK: The AS returns paths to the PUB_CACHE folder, which Code can't
        // convert to relative paths (so they look terrible). If the file exists in
        // workspace.rootPath we rewrite the path to there which gives us a nice
        // relative path.
        // Currently I only do this for "hosted\pub.dartlang.org" as I'm not sure of the
        // rules for these paths!
        const pubCachePath = "hosted" + path.sep + "pub.dartlang.org";
        const pubCachePathIndex = inputPath.indexOf(pubCachePath);
        if (pubCachePathIndex > -1) {
            const relativePath = inputPath.substring(pubCachePathIndex + pubCachePath.length + 1);
            // Packages in pubcache are versioned so trim the "-x.x.x" off the end of the foldername.
            const pathComponents = relativePath.split(path.sep);
            pathComponents[0] = pathComponents[0].split("-")[0];
            // Symlink goes into the lib folder, so strip that out of the path.
            if (pathComponents[1] === "lib")
                pathComponents.splice(1, 1);
            // Return 'package:foo/bar.dart'.
            inputPath = `package:${pathComponents[0]}/${pathComponents.slice(1).join("/")}`;
        }
        else {
            const root = vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.file(inputPath));
            inputPath = root && path.relative(utils_1.fsPath(root.uri), inputPath);
        }
        return inputPath;
    }
}
exports.DartSymbolProvider = DartSymbolProvider;
//# sourceMappingURL=dart_symbol_provider.js.map