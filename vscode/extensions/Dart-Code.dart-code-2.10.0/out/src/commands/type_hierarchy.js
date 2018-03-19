"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const editors = require("../editors");
const vs = require("vscode");
const utils_1 = require("../utils");
class TypeHierarchyCommand {
    constructor(context, analyzer) {
        this.commands = [];
        this.context = context;
        this.analyzer = analyzer;
        this.commands.push(vs.commands.registerTextEditorCommand("dart.showTypeHierarchy", this.showTypeHierarchy, this));
    }
    showTypeHierarchy(editor, editBuilder) {
        if (!editors.hasActiveDartEditor()) {
            vs.window.showWarningMessage("No active Dart editor.");
            return;
        }
        const document = editor.document;
        this.analyzer.searchGetTypeHierarchy({
            file: document.fileName,
            offset: document.offsetAt(editor.selection.active),
        }).then((response) => {
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
            vs.window.showQuickPick(tree.map((item) => itemToPick(item, items)), options).then((result) => {
                if (result) {
                    const location = result.location;
                    vs.workspace.openTextDocument(location.file).then((document) => {
                        vs.window.showTextDocument(document).then((editor) => {
                            const range = utils_1.toRange(location);
                            editor.revealRange(range, vs.TextEditorRevealType.InCenterIfOutsideViewport);
                            editor.selection = new vs.Selection(range.end, range.start);
                        });
                    });
                }
            });
        });
    }
    dispose() {
        for (const command of this.commands)
            command.dispose();
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