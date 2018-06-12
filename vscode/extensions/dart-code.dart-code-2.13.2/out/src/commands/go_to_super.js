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
const vs = require("vscode");
const open_file_tracker_1 = require("../analysis/open_file_tracker");
const editors = require("../editors");
const utils_1 = require("../utils");
class GoToSuperCommand {
    constructor(analyzer) {
        this.disposables = [];
        this.analyzer = analyzer;
        this.disposables.push(vs.commands.registerCommand("dart.goToSuper", this.goToSuper, this));
    }
    goToSuper() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!editors.hasActiveDartEditor()) {
                vs.window.showWarningMessage("No active Dart editor.");
                return;
            }
            const editor = vs.window.activeTextEditor;
            const document = editor.document;
            const offset = document.offsetAt(editor.selection.start);
            const outline = open_file_tracker_1.OpenFileTracker.getOutlineFor(document.uri);
            if (!outline) {
                vs.window.showWarningMessage("Outline not available.");
                return;
            }
            const outlineNode = this.findNode([outline], offset);
            if (!outlineNode) {
                vs.window.showWarningMessage("Go to Super Method only works for methods, getters and setters.");
                return;
            }
            const hierarchy = yield this.analyzer.searchGetTypeHierarchy({
                file: utils_1.fsPath(document.uri),
                offset: outlineNode.element.location.offset,
                superOnly: true,
            });
            if (!hierarchy || !hierarchy.hierarchyItems || !hierarchy.hierarchyItems.length || hierarchy.hierarchyItems.length === 1)
                return;
            // The first item is the current node, so skip that one and walk up till we find a matching member.
            const item = hierarchy.hierarchyItems.slice(1).find((h) => !!h.memberElement);
            const element = item && item.memberElement;
            if (!element)
                return;
            // TODO: extract out so we have one way of jumping to code
            // Currently we have Type Hierarchy, Go To Super, Flutter Outline
            {
                const location = element.location;
                const document = yield vs.workspace.openTextDocument(location.file);
                const editor = yield vs.window.showTextDocument(document);
                const range = utils_1.toRangeOnLine(location);
                editor.revealRange(range, vs.TextEditorRevealType.InCenterIfOutsideViewport);
                editor.selection = new vs.Selection(range.end, range.start);
            }
        });
    }
    findNode(outlines, offset) {
        for (const outline of outlines) {
            const outlineStart = outline.offset;
            const outlineEnd = outline.offset + outline.length;
            // Bail if this node is not spanning us.
            if (outlineStart > offset || outlineEnd < offset)
                continue;
            if (outline.element.kind === "METHOD" || outline.element.kind === "GETTER" || outline.element.kind === "SETTER")
                return outline;
            else if (outline.children)
                return this.findNode(outline.children, offset);
        }
    }
    dispose() {
        this.disposables.forEach((d) => d.dispose());
    }
}
exports.GoToSuperCommand = GoToSuperCommand;
//# sourceMappingURL=go_to_super.js.map