"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./utils");
class FileChangeHandler {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    onDidOpenTextDocument(document) {
        if (!util.isAnalyzable(document))
            return;
        const files = {};
        files[document.fileName] = {
            content: document.getText(),
            type: "add",
        };
        this.analyzer.analysisUpdateContent({ files });
    }
    onDidChangeTextDocument(e) {
        if (!util.isAnalyzable(e.document))
            return;
        if (e.contentChanges.length === 0)
            return;
        // TODO: Fix this...
        // HACK: e.document.offsetAt appears to return the wrong offset when there are
        // multiple edits (since it uses the current document state which can include
        // earlier edits, offsetting the values!)
        //   See https://github.com/Microsoft/vscode/issues/10047
        //
        // As a workaround, we just send the full contents if there was more than one edit.
        if (e.contentChanges.length === 1) {
            const files = {};
            files[e.document.fileName] = {
                edits: e.contentChanges.map((c) => this.convertChange(e.document, c)),
                type: "change",
            };
            this.analyzer.analysisUpdateContent({ files });
        }
        else {
            // TODO: Remove this block when the bug is fixed (or we figure out it's not a bug).
            const files = {};
            files[e.document.fileName] = {
                content: e.document.getText(),
                type: "add",
            };
            this.analyzer.analysisUpdateContent({ files });
        }
    }
    onDidCloseTextDocument(document) {
        if (!util.isAnalyzable(document))
            return;
        const files = {};
        files[document.fileName] = {
            type: "remove",
        };
        this.analyzer.analysisUpdateContent({ files });
    }
    convertChange(document, change) {
        return {
            id: "",
            length: change.rangeLength,
            offset: document.offsetAt(change.range.start),
            replacement: change.text,
        };
    }
}
exports.FileChangeHandler = FileChangeHandler;
//# sourceMappingURL=file_change_handler.js.map