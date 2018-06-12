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
class EditCommands {
    constructor(context, analyzer) {
        this.commands = [];
        this.context = context;
        this.analyzer = analyzer;
        this.commands.push(vs.commands.registerCommand("_dart.organizeImports", this.organizeImports, this), vs.commands.registerCommand("dart.sortMembers", this.sortMembers, this), vs.commands.registerCommand("_dart.applySourceChange", this.applyEdits, this));
    }
    organizeImports() {
        return this.sendEdit(this.analyzer.editOrganizeDirectives, "Organize Imports");
    }
    sortMembers() {
        return this.sendEdit(this.analyzer.editSortMembers, "Sort Members");
    }
    sendEdit(f, commandName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!editors.hasActiveDartEditor()) {
                vs.window.showWarningMessage("No active Dart editor.");
                return;
            }
            const editor = vs.window.activeTextEditor;
            const document = editor.document;
            const documentVersion = document.version;
            f = f.bind(this.analyzer); // Yay JavaScript!
            try {
                const response = yield f({ file: utils_1.fsPath(document.uri) });
                const edit = response.edit;
                if (edit.edits.length === 0)
                    return;
                if (document.isClosed) {
                    vs.window.showErrorMessage(`Error running ${commandName}: Document has been closed.`);
                    return;
                }
                if (document.version !== document.version) {
                    vs.window.showErrorMessage(`Error running ${commandName}: Document has been modified.`);
                    return;
                }
                yield editor.edit((editBuilder) => {
                    edit.edits.forEach((edit) => {
                        const range = new vs.Range(document.positionAt(edit.offset), document.positionAt(edit.offset + edit.length));
                        editBuilder.replace(range, edit.replacement);
                    });
                });
            }
            catch (error) {
                vs.window.showErrorMessage(`Error running ${commandName}: ${error.message}.`);
            }
        });
    }
    dispose() {
        for (const command of this.commands)
            command.dispose();
    }
    applyEdits(initiatingDocument, change) {
        return __awaiter(this, void 0, void 0, function* () {
            // We can only apply with snippets if there's a single change.
            if (change.edits.length === 1 && change.linkedEditGroups != null && change.linkedEditGroups.length !== 0)
                return this.applyEditsWithSnippets(initiatingDocument, change);
            // Otherwise, just make all the edits without the snippets.
            const changes = new vs.WorkspaceEdit();
            for (const edit of change.edits) {
                for (const e of edit.edits) {
                    const uri = vs.Uri.file(edit.file);
                    const document = yield vs.workspace.openTextDocument(uri);
                    changes.replace(vs.Uri.file(edit.file), new vs.Range(document.positionAt(e.offset), document.positionAt(e.offset + e.length)), e.replacement);
                }
            }
            // Apply the edits.
            yield vs.workspace.applyEdit(changes);
            // Ensure original document is the active one.
            const ed = yield vs.window.showTextDocument(initiatingDocument);
            // Set the cursor position.
            if (change.selection) {
                const pos = initiatingDocument.positionAt(change.selection.offset);
                const selection = new vs.Selection(pos, pos);
                ed.selection = selection;
            }
        });
    }
    applyEditsWithSnippets(initiatingDocument, change) {
        return __awaiter(this, void 0, void 0, function* () {
            const edit = change.edits[0];
            const document = yield vs.workspace.openTextDocument(edit.file);
            const editor = yield vs.window.showTextDocument(document);
            // Apply of all of the edits.
            yield editor.edit((eb) => {
                edit.edits.forEach((e) => {
                    eb.replace(new vs.Range(document.positionAt(e.offset), document.positionAt(e.offset + e.length)), e.replacement);
                });
            });
            const documentText = editor.document.getText();
            // Create a list of all the placeholders.
            const placeholders = [];
            let placeholderNumber = 1;
            change.linkedEditGroups.forEach((leg) => {
                leg.positions.forEach((pos) => {
                    const defaultValue = documentText.substr(pos.offset, leg.length);
                    const choices = leg.suggestions ? leg.suggestions.map((s) => s.value) : null;
                    placeholders.push({ offset: pos.offset, length: leg.length, defaultValue, choices, placeholderNumber });
                });
                placeholderNumber++;
            });
            // Ensure they're in offset order so the next maths works!
            placeholders.sort((p1, p2) => p1.offset - p2.offset);
            const snippet = new vs.SnippetString();
            const firstPlaceholder = placeholders[0];
            const lastPlaceholder = placeholders[placeholders.length - 1];
            const startPos = firstPlaceholder.offset;
            const endPos = lastPlaceholder.offset + lastPlaceholder.length;
            let currentPos = startPos;
            placeholders.forEach((p) => {
                // Add the text from where we last were up to current placeholder.
                if (currentPos !== p.offset)
                    snippet.appendText(documentText.substring(currentPos, p.offset));
                // Add the choices / placeholder.
                // Uncomment for https://github.com/Dart-Code/Dart-Code/issues/569 when there's an API we can use
                if (p.choices && p.choices.length > 1)
                    snippet.appendText("").value += "${" + p.placeholderNumber + "|" + p.choices.map((c) => this.snippetStringEscape(c)).join(",") + "|}";
                else
                    snippet.appendPlaceholder(p.defaultValue, p.placeholderNumber);
                currentPos = p.offset + p.length;
            });
            // Replace the document.
            yield editor.insertSnippet(snippet, new vs.Range(document.positionAt(startPos), document.positionAt(endPos)));
            // Ensure original document is the active one.
            yield vs.window.showTextDocument(initiatingDocument);
        });
    }
    snippetStringEscape(value) {
        return value.replace(/\$|}|\\|,/g, "\\$&");
    }
}
exports.EditCommands = EditCommands;
//# sourceMappingURL=edit.js.map