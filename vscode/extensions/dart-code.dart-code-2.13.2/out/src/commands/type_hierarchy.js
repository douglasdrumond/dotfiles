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
const editors = require("../editors");
const utils_1 = require("../utils");
class TypeHierarchyCommand {
    constructor(analyzer) {
        this.disposables = [];
        this.analyzer = analyzer;
        this.disposables.push(vs.commands.registerCommand("dart.showTypeHierarchy", this.showTypeHierarchy, this));
    }
    showTypeHierarchy() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!editors.hasActiveDartEditor()) {
                vs.window.showWarningMessage("No active Dart editor.");
                return;
            }
            const editor = vs.window.activeTextEditor;
            const document = editor.document;
            const response = yield this.analyzer.searchGetTypeHierarchy({
                file: utils_1.fsPath(document.uri),
                offset: document.offsetAt(editor.selection.active),
            });
            const items = response.hierarchyItems;
            if (!items) {
                vs.window.showInformationMessage("Type hierarchy not available.");
                return;
            }
            const options = { placeHolder: name(items, 0) };
            // TODO: How / where to show implements?
            const tree = [];
            const startItem = items[0];
            tree.push(startItem);
            addParents(items, tree, startItem);
            addChildren(items, tree, startItem);
            const result = yield vs.window.showQuickPick(tree.map((item) => itemToPick(item, items)), options);
            if (result) {
                // TODO: extract out so we have one way of jumping to code
                // Currently we have Type Hierarchy, Go To Super, Flutter Outline
                const location = result.location;
                const document = yield vs.workspace.openTextDocument(location.file);
                const editor = yield vs.window.showTextDocument(document);
                const range = utils_1.toRangeOnLine(location);
                editor.revealRange(range, vs.TextEditorRevealType.InCenterIfOutsideViewport);
                editor.selection = new vs.Selection(range.end, range.start);
            }
        });
    }
    dispose() {
        this.disposables.forEach((d) => d.dispose());
    }
}
exports.TypeHierarchyCommand = TypeHierarchyCommand;
function addParents(items, tree, item) {
    if (item.superclass) {
        const parent = items[item.superclass];
        if (parent.classElement.name !== "Object") {
            tree.unshift(parent);
            addParents(items, tree, parent);
        }
    }
}
function addChildren(items, tree, item) {
    // Handle direct children.
    for (const index of item.subclasses) {
        const child = items[index];
        tree.push(child);
    }
    // Handle grandchildren.
    for (const index of item.subclasses) {
        const child = items[index];
        if (child.subclasses.length > 0)
            addChildren(items, tree, child);
    }
}
function itemToPick(item, items) {
    let desc = "";
    // extends
    if (item.superclass !== undefined && name(items, item.superclass) !== "Object")
        desc += `extends ${name(items, item.superclass)}`;
    // implements
    if (item.interfaces.length > 0) {
        if (desc.length > 0)
            desc += ", ";
        desc += `implements ${item.interfaces.map((i) => name(items, i)).join(", ")}`;
    }
    // with
    if (item.mixins.length > 0) {
        if (desc.length > 0)
            desc += ", ";
        desc += `with ${item.mixins.map((i) => name(items, i)).join(", ")}`;
    }
    const result = {
        description: desc,
        label: item.classElement.name,
        location: item.classElement.location,
    };
    return result;
}
function name(items, index) {
    return items[index].classElement.name;
}
//# sourceMappingURL=type_hierarchy.js.map