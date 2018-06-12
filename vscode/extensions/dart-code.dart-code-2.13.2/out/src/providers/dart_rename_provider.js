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
const channels = require("../commands/channels");
const utils_1 = require("../utils");
class DartRenameProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideRenameEdits(document, position, newName, token) {
        return this.doRename(document, position, newName, token);
    }
    prepareRename(document, position, token) {
        return this.getLocation(document, position);
    }
    doRename(document, position, newName, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const outputChannel = channels.getChannel("Refactorings");
            outputChannel.appendLine("");
            const resp = yield this.analyzer.editGetRefactoring({
                file: utils_1.fsPath(document.uri),
                kind: "RENAME",
                length: 1,
                offset: document.offsetAt(position),
                options: {
                    newName,
                },
                validateOnly: false,
            });
            const workspaceEdit = new vscode_1.WorkspaceEdit();
            if (resp.change && resp.change.message)
                outputChannel.appendLine(`[INFO] ${resp.change.message}…`);
            const hasError = this.handleProblem(resp.initialProblems
                .concat(resp.optionsProblems)
                .concat(resp.finalProblems), outputChannel);
            const promises = [];
            resp.change.edits.forEach((changeEdit) => {
                changeEdit.edits.forEach((fileEdit) => {
                    const uri = vscode_1.Uri.file(changeEdit.file);
                    const promise = vscode_1.workspace.openTextDocument(uri);
                    promises.push(promise.then((document) => workspaceEdit.replace(uri, new vscode_1.Range(document.positionAt(fileEdit.offset), document.positionAt(fileEdit.offset + fileEdit.length)), fileEdit.replacement)));
                });
            });
            // TODO: This class is inconsistent with other refactors (which are silent when they work, for ex).
            // We should review what we can extract share (though note that this method must return the edit whereas
            // the other refactors apply them).
            // Wait all openTextDocument to finish
            yield Promise.all(promises);
            outputChannel.appendLine("[INFO] Rename successful.");
            return workspaceEdit;
        });
    }
    handleProblem(problems, outputChannel) {
        // Log all in output channel.
        problems.forEach((problem) => outputChannel.appendLine(`[${problem.severity}] ${problem.message}`));
        const errors = problems
            .filter((p) => p.severity !== "INFO" && p.severity !== "WARNING")
            .sort((p1, p2) => p2.severity.localeCompare(p1.severity));
        if (errors.length === 0)
            return false;
        outputChannel.appendLine("[INFO] Rename aborted.");
        // Popups just the first error.
        throw errors[0].message;
    }
    getLocation(document, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const resp = yield this.analyzer.editGetRefactoring({
                file: utils_1.fsPath(document.uri),
                kind: "RENAME",
                length: 0,
                offset: document.offsetAt(position),
                validateOnly: true,
            });
            const feedback = resp.feedback;
            // VS Code will reject the rename if our range doesn't span the position it gave us, but sometimes this isn't the case
            // such as `import "x" as y` when invoking rename on `import`, so we just it back the position is asked for.
            if (feedback) {
                return {
                    placeholder: feedback.oldName,
                    range: new vscode_1.Range(position, position),
                };
            }
            else {
                const fatalProblems = resp.initialProblems
                    .concat(resp.optionsProblems)
                    .concat(resp.finalProblems)
                    .filter((p) => p.severity === "FATAL");
                if (fatalProblems && fatalProblems.length) {
                    throw new Error(fatalProblems[0].message);
                }
                else {
                    throw new Error("This rename is not supported.");
                }
            }
        });
    }
}
exports.DartRenameProvider = DartRenameProvider;
//# sourceMappingURL=dart_rename_provider.js.map