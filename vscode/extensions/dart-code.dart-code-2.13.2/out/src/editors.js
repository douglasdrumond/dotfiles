"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vs = require("vscode");
function hasActiveDartEditor() {
    if (!vs.window.activeTextEditor)
        return false;
    return vs.window.activeTextEditor.document.languageId === "dart";
}
exports.hasActiveDartEditor = hasActiveDartEditor;
//# sourceMappingURL=editors.js.map