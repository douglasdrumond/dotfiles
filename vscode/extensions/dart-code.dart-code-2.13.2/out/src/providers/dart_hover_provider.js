"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const dartdocs_1 = require("../dartdocs");
const package_map_1 = require("../debug/package_map");
const utils_1 = require("../utils");
class DartHoverProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideHover(document, position, token) {
        return new Promise((resolve, reject) => {
            this.analyzer.analysisGetHover({
                file: utils_1.fsPath(document.uri),
                offset: document.offsetAt(position),
            }).then((resp) => {
                if (resp.hovers.length === 0) {
                    resolve(null);
                }
                else {
                    const hover = resp.hovers[0];
                    const data = this.getHoverData(document.uri, hover);
                    if (data) {
                        const range = new vscode_1.Range(document.positionAt(hover.offset), document.positionAt(hover.offset + hover.length));
                        resolve(new vscode_1.Hover([{ language: "dart", value: data.displayString }, data.documentation || undefined], range));
                    }
                    else {
                        resolve(null);
                    }
                }
            }, (e) => { utils_1.logError(e); reject(); });
        });
    }
    getHoverData(documentUri, hover) {
        if (!hover.elementDescription)
            return null;
        // Import prefix tooltips are not useful currently.
        // https://github.com/dart-lang/sdk/issues/32735
        if (hover.elementKind === "import prefix")
            return null;
        const elementDescription = hover.elementDescription;
        const elementKind = hover.elementKind;
        const dartdoc = hover.dartdoc;
        const containingClassDescription = hover.containingClassDescription;
        const propagatedType = hover.propagatedType;
        const callable = (elementKind === "function" || elementKind === "method");
        const field = (elementKind === "getter" || elementKind === "setter" || elementKind === "field");
        const containingLibraryName = hover.containingLibraryName;
        const containingLibraryPath = hover.containingLibraryPath;
        let displayString = "";
        if (elementDescription)
            displayString += (hover.isDeprecated ? "(deprecated) " : "") + `${elementDescription}\n`;
        if (propagatedType)
            displayString += `propogated type: ${propagatedType.trim()}`;
        let documentation = dartdocs_1.cleanDartdoc(dartdoc);
        if (containingLibraryName) {
            documentation = `*${containingLibraryName}*\n\n` + documentation;
        }
        else if (containingLibraryPath) {
            const packageMap = DartHoverProvider.getPackageMapFor(documentUri);
            const packagePath = packageMap && packageMap.convertFileToPackageUri(containingLibraryPath, false);
            const packageName = packagePath && packagePath.split("/")[0];
            if (packageName)
                documentation = `*${packageName}*\n\n` + documentation;
        }
        return {
            displayString: displayString.trim(),
            documentation,
        };
    }
    static getPackageMapFor(uri) {
        const path = utils_1.fsPath(uri);
        if (this.packageMaps[path])
            return this.packageMaps[path];
        const packagesFile = package_map_1.PackageMap.findPackagesFile(path);
        const map = packagesFile && new package_map_1.PackageMap(packagesFile);
        if (map)
            this.packageMaps[path] = map;
        return map;
    }
    // TODO: Don't expose this publicly, subsribe to some event to clear it.
    static clearPackageMapCaches() {
        this.packageMaps = {};
    }
}
// TODO: Update this when things change?
DartHoverProvider.packageMaps = {};
exports.DartHoverProvider = DartHoverProvider;
//# sourceMappingURL=dart_hover_provider.js.map