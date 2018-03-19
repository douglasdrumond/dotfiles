"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const util = require("./utils");
class OpenFileTracker {
    constructor(analyzer) {
        this.lastPriorityFiles = [];
        this.analyzer = analyzer;
    }
    updatePriorityFiles() {
        // Within visible/otherActive we sort by name so we get the same results if files are in a different
        // order; this is to reduce changing too much in the AS (causing more work) since we don't really care about
        // about the relative difference within these groups.
        const visibleDocuments = vscode_1.window.visibleTextEditors.map((e) => e.document).sort((d1, d2) => d1.fileName.localeCompare(d2.fileName));
        const otherOpenDocuments = vscode_1.workspace.textDocuments.filter((doc) => visibleDocuments.indexOf(doc) === -1).sort((d1, d2) => d1.fileName.localeCompare(d2.fileName));
        const priorityDocuments = visibleDocuments.concat(otherOpenDocuments).filter((d) => this.analyzer.capabilities.supportsPriorityFilesOutsideAnalysisRoots ? util.isAnalyzable(d) : util.isAnalyzableAndInWorkspace(d));
        const priorityFiles = priorityDocuments.map((doc) => doc.fileName);
        // Check the files have changed before sending the results.
        const filesHaveChanged = this.lastPriorityFiles.length !== priorityFiles.length
            || this.lastPriorityFiles.some((f, i) => f !== priorityFiles[i]);
        if (!filesHaveChanged)
            return;
        // Keep track of files to compare next time.
        this.lastPriorityFiles = priorityFiles;
        // Set priority files.
        this.analyzer.analysisSetPriorityFiles({
            files: priorityFiles,
        }).then(() => { }, util.logError);
        // Set subscriptions.
        if (this.analyzer.capabilities.supportsClosingLabels) {
            this.analyzer.analysisSetSubscriptions({
                subscriptions: {
                    CLOSING_LABELS: priorityFiles,
                    OCCURRENCES: priorityFiles,
                    OUTLINE: priorityFiles,
                },
            });
        }
        else {
            this.analyzer.analysisSetSubscriptions({
                subscriptions: {
                    HIGHLIGHTS: priorityFiles,
                    OCCURRENCES: priorityFiles,
                    OUTLINE: priorityFiles,
                },
            });
        }
    }
}
exports.OpenFileTracker = OpenFileTracker;
//# sourceMappingURL=open_file_tracker.js.map