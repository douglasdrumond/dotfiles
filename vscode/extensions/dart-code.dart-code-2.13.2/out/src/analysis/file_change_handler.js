"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vs = require("vscode");
const util = require("../utils");
const utils_1 = require("../utils");
class FileChangeHandler {
    constructor(analyzer) {
        this.disposables = [];
        this.analyzer = analyzer;
        this.disposables.push(vs.workspace.onDidOpenTextDocument((td) => this.onDidOpenTextDocument(td)), vs.workspace.onDidChangeTextDocument((e) => this.onDidChangeTextDocument(e)), vs.workspace.onDidCloseTextDocument((td) => this.onDidCloseTextDocument(td)));
        // Handle already-open files.
        vs.workspace.textDocuments.forEach((td) => this.onDidOpenTextDocument(td));
    }
    onDidOpenTextDocument(document) {
        if (!util.isAnalyzable(document))
            return;
        const files = {};
        files[utils_1.fsPath(document.uri)] = {
            content: document.getText(),
            type: "add",
        };
        this.analyzer.analysisUpdateContent({ files });
    }
    onDidChangeTextDocument(e) {
        if (!util.isAnalyzable(e.document))
            return;
        if (e.contentChanges.length === 0) // This event fires for metadata changes (dirty?) so don't need to notify AS then.
            return;
        const files = {};
        files[utils_1.fsPath(e.document.uri)] = {
            edits: e.contentChanges.map((c) => this.convertChange(e.document, c)),
            type: "change",
        };
        this.analyzer.analysisUpdateContent({ files });
    }
    onDidCloseTextDocument(document) {
        if (!util.isAnalyzable(document))
            return;
        const files = {};
        files[utils_1.fsPath(document.uri)] = {
            type: "remove",
        };
        this.analyzer.analysisUpdateContent({ files });
    }
    convertChange(document, change) {
        return {
            id: "",
            length: change.rangeLength,
            offset: change.rangeOffset,
            replacement: change.text,
        };
    }
    dispose() {
        this.disposables.forEach((d) => d.dispose());
    }
}
exports.FileChangeHandler = FileChangeHandler;
//# sourceMappingURL=file_change_handler.js.map