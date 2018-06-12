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
const utils_1 = require("../utils");
exports.REFACTOR_FAILED_DOC_MODIFIED = "This refactor cannot be applied because the document has changed.";
exports.REFACTOR_ANYWAY = "Refactor Anyway";
const refactorOptions = {
    EXTRACT_METHOD: getExtractMethodArgs,
    EXTRACT_WIDGET: getExtractWidgetArgs,
};
class RefactorCommands {
    constructor(context, analyzer) {
        this.commands = [];
        this.context = context;
        this.analyzer = analyzer;
        this.commands.push(vs.commands.registerCommand("_dart.performRefactor", this.performRefactor, this));
    }
    performRefactor(document, range, refactorKind) {
        return __awaiter(this, void 0, void 0, function* () {
            // Ensure the document is still valid.
            if (!document || document.isClosed)
                return;
            const originalDocumentVersion = document.version;
            // Validate that there are no problems if we execute this refactor.
            const validationResult = yield this.getRefactor(document, refactorKind, range, true);
            if (this.shouldAbortRefactor(validationResult))
                return;
            // Request the options from the user.
            const options = yield refactorOptions[refactorKind](validationResult.feedback);
            if (!options)
                return;
            // Send the request for the refactor edits and prompt to apply if required.
            const editResult = yield this.getRefactor(document, refactorKind, range, false, options);
            const applyEdits = yield this.shouldApplyEdits(editResult, document, originalDocumentVersion);
            if (applyEdits)
                yield vs.commands.executeCommand("_dart.applySourceChange", document, editResult.change);
        });
    }
    getRefactor(document, refactorKind, range, validateOnly, options) {
        return this.analyzer.editGetRefactoring({
            file: utils_1.fsPath(document.uri),
            kind: refactorKind,
            length: document.offsetAt(range.end) - document.offsetAt(range.start),
            offset: document.offsetAt(range.start),
            options,
            validateOnly,
        });
    }
    shouldAbortRefactor(validationResult) {
        const validationProblems = validationResult.initialProblems
            .concat(validationResult.optionsProblems)
            .concat(validationResult.finalProblems)
            .filter((e) => e.severity === "FATAL");
        if (validationProblems.length) {
            vs.window.showErrorMessage(validationProblems[0].message);
            return true;
        }
        return false;
    }
    shouldApplyEdits(editResult, document, originalDocumentVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            const allProblems = editResult.initialProblems
                .concat(editResult.optionsProblems)
                .concat(editResult.finalProblems);
            const editFatals = allProblems.filter((e) => e.severity === "FATAL");
            const editWarnings = allProblems.filter((e) => e.severity === "ERROR" || e.severity === "WARNING");
            const hasErrors = !!allProblems.find((e) => e.severity === "ERROR");
            // Fatal errors can never be applied, just tell the user and quit.
            if (editFatals.length) {
                vs.window.showErrorMessage(utils_1.unique(editFatals.map((e) => e.message)).join("\n\n") + "\n\nYour refactor was not applied.");
                return false;
            }
            // If we somehow got here with no change, we also cannot apply them.
            if (!editResult.change)
                return false;
            let applyEdits = true;
            // If we have warnings/errors, the user can decide whether to go ahead.
            if (editWarnings.length) {
                const show = hasErrors ? vs.window.showErrorMessage : vs.window.showWarningMessage;
                applyEdits = (exports.REFACTOR_ANYWAY === (yield show(utils_1.unique(editWarnings.map((w) => w.message)).join("\n\n"), exports.REFACTOR_ANYWAY)));
            }
            // If we're trying to apply changes but the document is modified, we have to quit.
            if (applyEdits && document.version !== originalDocumentVersion) {
                vs.window.showErrorMessage(exports.REFACTOR_FAILED_DOC_MODIFIED);
                return false;
            }
            return applyEdits;
        });
    }
    dispose() {
        for (const command of this.commands)
            command.dispose();
    }
}
exports.RefactorCommands = RefactorCommands;
function getExtractMethodArgs(f) {
    return __awaiter(this, void 0, void 0, function* () {
        const feedback = f;
        const suggestedName = feedback.names && feedback.names.length ? feedback.names[0] : undefined;
        const name = yield vs.window.showInputBox({ prompt: "Enter a name for the method", value: suggestedName });
        if (!name)
            return;
        return {
            createGetter: false,
            extractAll: false,
            name,
            parameters: feedback.parameters,
            returnType: feedback.returnType,
        };
    });
}
function getExtractWidgetArgs(f) {
    return __awaiter(this, void 0, void 0, function* () {
        const name = yield vs.window.showInputBox({ prompt: "Enter a name for the widget" });
        return name ? { name } : undefined;
    });
}
//# sourceMappingURL=refactor.js.map