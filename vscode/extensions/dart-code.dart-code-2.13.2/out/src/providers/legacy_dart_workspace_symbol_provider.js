"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode_1 = require("vscode");
const analyzer_1 = require("../analysis/analyzer");
const utils_1 = require("../utils");
class LegacyDartWorkspaceSymbolProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideWorkspaceSymbols(query, token) {
        if (query.length === 0)
            return null;
        query = this.sanitizeUserQuery(query);
        const pattern = this.makeCaseInsensitiveFuzzyRegex(query);
        return new Promise((resolve, reject) => {
            Promise.all([
                this.analyzer.searchFindTopLevelDeclarationsResults({ pattern }),
                this.analyzer.searchFindMemberDeclarationsResults({ name: pattern }),
            ]).then((results) => resolve(this.combineResults(results)), () => reject());
        });
    }
    combineResults(results) {
        return results[0].results.concat(results[1].results)
            .filter((r) => this.shouldIncludeResult(r))
            .map((r) => this.convertResult(r));
    }
    searchTopLevelSymbols(query) {
        const pattern = this.makeCaseInsensitiveFuzzyRegex(query);
        return this.analyzer.searchFindTopLevelDeclarationsResults({ pattern })
            .then((resp) => resp.results);
    }
    searchMemberDeclarations(query) {
        const pattern = this.makeCaseInsensitiveFuzzyRegex(query);
        return this.analyzer.searchFindMemberDeclarationsResults({ name: pattern })
            .then((resp) => resp.results);
    }
    sanitizeUserQuery(query) {
        let chars = Array.from(query);
        // Filter out special chars that will break regex.
        // searchFindTopLevelDeclarations supports regex, but we build the pattern with the output of this.
        // searchMemberDeclarations is not intended to support regex but does.
        chars = chars.filter((c) => {
            return "[](){}\\|./<>?+".indexOf(c) === -1;
        });
        return chars.join("");
    }
    makeCaseInsensitiveFuzzyRegex(query) {
        let chars = Array.from(query);
        chars = chars.map((c) => {
            if (c.toUpperCase() === c.toLowerCase())
                return c;
            return `[${c.toUpperCase()}${c.toLowerCase()}]`;
        });
        const pattern = chars.join(".*");
        return `.*${pattern}.*`;
    }
    shouldIncludeResult(result) {
        // Must be either:
        //   1. Public (not start with an underscore).
        //   2. In our project.
        const isPrivate = result.path[0].name.startsWith("_") || result.path[1].name.startsWith("_");
        return utils_1.isWithinWorkspace(result.location.file) || !isPrivate;
    }
    convertResult(result) {
        // Rewrite the filename for best display.
        const containerName = this.createDisplayPath(result.location.file);
        // Remove the library and compilation unit parent elements; concatenate names.
        let elementPathDescription = result.path
            .slice(0, result.path.length - 2)
            .reverse()
            .map((e) => e.name)
            .join(".");
        // For properties, show if get/set.
        if (result.path[0].kind === "SETTER")
            elementPathDescription += " set";
        if (result.path[0].kind === "GETTER")
            elementPathDescription += " get";
        const parameters = result.path[0].parameters && result.path[0].kind !== "SETTER"
            ? result.path[0].parameters
            : "";
        return new vscode_1.SymbolInformation(elementPathDescription + parameters, analyzer_1.getSymbolKindForElementKind(result.path[0].kind), containerName, new vscode_1.Location(vscode_1.Uri.file(result.location.file), utils_1.toRangeOnLine(result.location)));
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
exports.LegacyDartWorkspaceSymbolProvider = LegacyDartWorkspaceSymbolProvider;
//# sourceMappingURL=legacy_dart_workspace_symbol_provider.js.map