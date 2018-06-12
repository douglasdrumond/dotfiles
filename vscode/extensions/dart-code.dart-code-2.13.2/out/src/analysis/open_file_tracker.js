"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const util = require("../utils");
const utils_1 = require("../utils");
const outlines = {};
const occurrences = {};
const folding = {};
class OpenFileTracker {
    constructor(analyzer) {
        this.disposables = [];
        this.lastPriorityFiles = [];
        this.analyzer = analyzer;
        this.disposables.push(vscode_1.workspace.onDidOpenTextDocument((td) => this.updatePriorityFiles()));
        this.disposables.push(vscode_1.workspace.onDidCloseTextDocument((td) => {
            delete outlines[utils_1.fsPath(td.uri)];
            delete occurrences[utils_1.fsPath(td.uri)];
            delete folding[utils_1.fsPath(td.uri)];
            this.updatePriorityFiles();
        }));
        this.disposables.push(vscode_1.window.onDidChangeActiveTextEditor((e) => this.updatePriorityFiles()));
        this.disposables.push(this.analyzer.registerForAnalysisOutline((o) => outlines[o.file] = o.outline));
        this.disposables.push(this.analyzer.registerForAnalysisOccurrences((o) => occurrences[o.file] = o.occurrences));
        this.disposables.push(this.analyzer.registerForAnalysisFolding((f) => folding[f.file] = f.regions));
        this.updatePriorityFiles(); // Handle already-open files.
    }
    updatePriorityFiles() {
        // Within visible/otherActive we sort by name so we get the same results if files are in a different
        // order; this is to reduce changing too much in the AS (causing more work) since we don't really care about
        // about the relative difference within these groups.
        const visibleDocuments = vscode_1.window.visibleTextEditors.map((e) => e.document).sort((d1, d2) => utils_1.fsPath(d1.uri).localeCompare(utils_1.fsPath(d2.uri)));
        const otherOpenDocuments = vscode_1.workspace.textDocuments
            .filter((doc) => !doc.isClosed)
            .filter((doc) => visibleDocuments.indexOf(doc) === -1)
            .sort((d1, d2) => utils_1.fsPath(d1.uri).localeCompare(utils_1.fsPath(d2.uri)));
        const priorityDocuments = visibleDocuments.concat(otherOpenDocuments).filter((d) => this.analyzer.capabilities.supportsPriorityFilesOutsideAnalysisRoots ? util.isAnalyzable(d) : util.isAnalyzableAndInWorkspace(d));
        const priorityFiles = priorityDocuments.map((doc) => utils_1.fsPath(doc.uri));
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
        }).then(() => { }, util.logError); // tslint:disable-line:no-empty
        // Set subscriptions.
        if (this.analyzer.capabilities.supportsClosingLabels) {
            this.analyzer.analysisSetSubscriptions({
                subscriptions: {
                    CLOSING_LABELS: priorityFiles,
                    FOLDING: priorityFiles,
                    OCCURRENCES: priorityFiles,
                    OUTLINE: priorityFiles,
                },
            }).then(() => { }, util.logError); // tslint:disable-line:no-empty
        }
        else {
            this.analyzer.analysisSetSubscriptions({
                subscriptions: {
                    FOLDING: priorityFiles,
                    HIGHLIGHTS: priorityFiles,
                    OCCURRENCES: priorityFiles,
                    OUTLINE: priorityFiles,
                },
            }).then(() => { }, util.logError); // tslint:disable-line:no-empty
        }
    }
    static getOutlineFor(file) {
        return outlines[utils_1.fsPath(file)];
    }
    static getOccurrencesFor(file) {
        return occurrences[utils_1.fsPath(file)];
    }
    static getFoldingRegionsFor(file) {
        return folding[utils_1.fsPath(file)];
    }
    dispose() {
        this.disposables.forEach((d) => d.dispose());
    }
}
exports.OpenFileTracker = OpenFileTracker;
//# sourceMappingURL=open_file_tracker.js.map