"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const utils_1 = require("../utils");
class DartHoverProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideHover(document, position, token) {
        return new Promise((resolve, reject) => {
            this.analyzer.analysisGetHover({
                file: document.fileName,
                offset: document.offsetAt(position),
            }).then((resp) => {
                if (resp.hovers.length === 0) {
                    resolve(null);
                }
                else {
                    const hover = resp.hovers[0];
                    const data = this.getHoverData(hover);
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
    getHoverData(hover) {
        if (!hover.elementDescription)
            return null;
        const elementDescription = hover.elementDescription;
        const elementKind = hover.elementKind;
        const dartdoc = hover.dartdoc;
        const containingClassDescription = hover.containingClassDescription;
        const propagatedType = hover.propagatedType;
        const callable = (elementKind === "function" || elementKind === "method");
        const field = (elementKind === "getter" || elementKind === "setter" || elementKind === "field");
        const containingLibraryName = hover.containingLibraryName;
        let displayString = "";
        if (containingClassDescription && callable)
            displayString += containingClassDescription + ".";
        if (containingClassDescription && field)
            displayString += containingClassDescription + " ";
        if (elementDescription)
            displayString += (hover.isDeprecated ? "(deprecated) " : "") + `${elementDescription}\n`;
        if (propagatedType)
            displayString += `propogated type: ${propagatedType.trim()}`;
        let documentation = DartHoverProvider.cleanDartdoc(dartdoc);
        if (containingLibraryName)
            documentation = `_${containingLibraryName}_\r\n\r\n` + (documentation != null ? documentation : "");
        return {
            displayString: displayString.trim(),
            documentation,
        };
    }
    static cleanDartdoc(doc) {
        if (!doc)
            return null;
        // Clean up some dart.core dartdoc.
        const index = doc.indexOf("## Other resources");
        if (index !== -1)
            doc = doc.substring(0, index);
        // Remove colons from old-style references like [:foo:].
        doc = doc.replace(/\[:\S+:\]/g, (match) => `[${match.substring(2, match.length - 2)}]`);
        // Change any links without hyperlinks to just code syntax.
        // That is, anything in [squares] that isn't a [link](http://blah).
        // Note: To ensure we get things at the end, we need to match "not a paren or end of string"
        // and we need to put that character back in since the regex consumed it.
        doc = doc.replace(/\[(\S+)\]([^(]|$)/g, (match, one, two) => `\`${one}\`${two}`);
        return doc;
    }
}
exports.DartHoverProvider = DartHoverProvider;
//# sourceMappingURL=dart_hover_provider.js.map