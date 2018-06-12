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
const config_1 = require("../config");
const utils_1 = require("../debug/utils");
const utils_2 = require("../utils");
const analyzer_gen_1 = require("./analyzer_gen");
class AnalyzerCapabilities {
    constructor(analyzerVersion) {
        this.version = analyzerVersion;
    }
    get mayRequiresPackageFolderWorkaround() { return !utils_2.versionIsAtLeast(this.version, "1.20.1"); }
    get supportsAnalyzingHtmlFiles() { return utils_2.versionIsAtLeast(this.version, "1.18.5"); }
    get supportsPriorityFilesOutsideAnalysisRoots() { return utils_2.versionIsAtLeast(this.version, "1.18.2"); }
    get supportsDiagnostics() { return utils_2.versionIsAtLeast(this.version, "1.18.1"); }
    get supportsClosingLabels() { return utils_2.versionIsAtLeast(this.version, "1.18.4"); }
    get supportsCustomFolding() { return utils_2.versionIsAtLeast(this.version, "1.20.3"); }
    get supportsGetDeclerations() { return utils_2.versionIsAtLeast(this.version, "1.18.7"); }
    get supportsGetDeclerationsForFile() { return utils_2.versionIsAtLeast(this.version, "1.19.0"); }
    get isDart2() { return utils_2.versionIsAtLeast(this.version, "1.19.0"); }
    // TODO: Remove this after next beta update, it's to stop tests failing on
    // "stable"(beta) builds because of an upcoming change.
    get hasUpdatedWidgetSnippets() { return utils_2.versionIsAtLeast(this.version, "1.20.1"); }
    // TODO: Remove this after next beta update, it's to stop tests failing on
    // "stable"(beta) builds because of no flutter test device.
    get flutterHasTestDevice() { return utils_2.versionIsAtLeast(this.version, "1.20.1"); }
}
exports.AnalyzerCapabilities = AnalyzerCapabilities;
class Analyzer extends analyzer_gen_1.AnalyzerGen {
    constructor(dartVMPath, analyzerPath) {
        super(() => config_1.config.analyzerLogFile);
        this.isAnalyzing = false;
        this.capabilities = new AnalyzerCapabilities("0.0.1");
        this.resolvedPromise = Promise.resolve();
        let args = [];
        // Optionally start Observatory for the analyzer.
        if (config_1.config.analyzerObservatoryPort)
            args.push(`--observe=${config_1.config.analyzerObservatoryPort}`);
        args.push(analyzerPath);
        // Optionally start the analyzer's diagnostic web server on the given port.
        if (config_1.config.analyzerDiagnosticsPort)
            args.push(`--port=${config_1.config.analyzerDiagnosticsPort}`);
        // Add info about the extension that will be collected for crash reports etc.
        args.push(`--client-id=Dart-Code.dart-code`);
        args.push(`--client-version=${utils_2.extensionVersion}`);
        // The analysis server supports a verbose instrumentation log file.
        if (config_1.config.analyzerInstrumentationLogFile)
            args.push(`--instrumentation-log-file=${config_1.config.analyzerInstrumentationLogFile}`);
        // Allow arbitrary args to be passed to the analysis server.
        if (config_1.config.analyzerAdditionalArgs)
            args = args.concat(config_1.config.analyzerAdditionalArgs);
        this.launchArgs = args;
        // Hook error subscriptions so we can try and get diagnostic info if this happens.
        this.registerForServerError((e) => this.requestDiagnosticsUpdate());
        this.registerForRequestError((e) => this.requestDiagnosticsUpdate());
        // Register for version.
        this.registerForServerConnected((e) => { this.version = e.version; this.capabilities.version = this.version; });
        this.createProcess(undefined, dartVMPath, args);
        this.serverSetSubscriptions({
            subscriptions: ["STATUS"],
        });
        this.registerForServerStatus((n) => {
            if (n.analysis) {
                if (n.analysis.isAnalyzing) {
                    this.isAnalyzing = true;
                }
                else {
                    this.isAnalyzing = false;
                    if (this.currentAnalysisCompleter) {
                        this.currentAnalysisCompleter.resolve();
                        this.currentAnalysisCompleter = null;
                    }
                }
            }
        });
    }
    get currentAnalysis() {
        // If we're analyzing and don't already have a completer, set one up
        // for the analyzer to signal when done. We do this here so it's lazy, so
        // we're not needlessly creating them on every analysis (which can be on
        // every key press).
        if (this.isAnalyzing && !this.currentAnalysisCompleter) {
            this.currentAnalysisCompleter = new utils_1.PromiseCompleter();
        }
        return this.isAnalyzing
            ? this.currentAnalysisCompleter.promise
            : this.resolvedPromise;
    }
    sendMessage(json) {
        try {
            super.sendMessage(json);
        }
        catch (e) {
            const message = this.version
                ? "The Dart Analyzer has terminated."
                : "The Dart Analyzer could not be started. Please set the `dart.analyzerLog` option and review the log file for errors.";
            utils_2.reloadExtension(message);
            throw e;
        }
    }
    shouldHandleMessage(message) {
        // This will include things like Observatory output and some analyzer logging code.
        return !message.startsWith("--- ") && !message.startsWith("+++ ");
    }
    requestDiagnosticsUpdate() {
        return __awaiter(this, void 0, void 0, function* () {
            this.lastDiagnostics = null;
            if (!this.capabilities.supportsDiagnostics)
                return;
            this.lastDiagnostics = (yield this.diagnosticGetDiagnostics()).contexts;
        });
    }
    getLastDiagnostics() {
        return this.lastDiagnostics;
    }
    getAnalyzerLaunchArgs() {
        return this.launchArgs;
    }
    forceNotificationsFor(file) {
        // Send a dummy edit (https://github.com/dart-lang/sdk/issues/30238)
        const files = {};
        files[file] = {
            edits: [{ offset: 0, length: 0, replacement: "", id: "" }],
            type: "change",
        };
        this.analysisUpdateContent({ files });
    }
    // Wraps completionGetSuggestions to return the final result automatically in the original promise
    // to avoid race conditions.
    // https://github.com/Dart-Code/Dart-Code/issues/471
    completionGetSuggestionsResults(request) {
        return this.requestWithStreamedResults(() => this.completionGetSuggestions(request), this.registerForCompletionResults);
    }
    // Wraps searchFindElementReferences to return the final result automatically in the original promise
    // to avoid race conditions.
    // https://github.com/Dart-Code/Dart-Code/issues/471
    searchFindElementReferencesResults(request) {
        return this.requestWithStreamedResults(() => this.searchFindElementReferences(request), this.registerForSearchResults);
    }
    // Wraps searchFindTopLevelDeclarations to return the final result automatically in the original promise
    // to avoid race conditions.
    // https://github.com/Dart-Code/Dart-Code/issues/471
    searchFindTopLevelDeclarationsResults(request) {
        return this.requestWithStreamedResults(() => this.searchFindTopLevelDeclarations(request), this.registerForSearchResults);
    }
    // Wraps searchFindMemberDeclarations to return the final result automatically in the original promise
    // to avoid race conditions.
    // https://github.com/Dart-Code/Dart-Code/issues/471
    searchFindMemberDeclarationsResults(request) {
        return this.requestWithStreamedResults(() => this.searchFindMemberDeclarations(request), this.registerForSearchResults);
    }
    // We need to subscribe before we send the request to avoid races in registering
    // for results (see https://github.com/Dart-Code/Dart-Code/issues/471).
    // Since we don't have the ID yet, we'll have to buffer them for the duration
    // and check inside the buffer when we get the ID back.
    requestWithStreamedResults(sendRequest, registerForResults) {
        return new Promise((resolve, reject) => {
            const buffer = []; // Buffer to store results that come in before we're ready.
            let searchResultsID = null; // ID that'll be set once we get it back.
            const disposable = registerForResults.bind(this)((notification) => {
                // If we know our ID and this is it, and it's the last result, then resolve.
                if (searchResultsID && notification.id === searchResultsID && notification.isLast) {
                    disposable.dispose();
                    resolve(notification);
                }
                else if (!searchResultsID && notification.isLast) // Otherwise if we didn't know our ID and this might be what we want, stash it.
                    buffer.push(notification);
            });
            // Now we have the above handler set up, send the actual request.
            sendRequest.bind(this)().then((resp) => {
                if (!resp.id) {
                    disposable.dispose();
                    reject();
                }
                // When the ID comes back, stash it...
                searchResultsID = resp.id;
                // And also check the buffer.
                const result = buffer.find((b) => b.id === searchResultsID);
                if (result) {
                    disposable.dispose();
                    resolve(result);
                }
            }, () => reject());
        });
    }
}
exports.Analyzer = Analyzer;
function getSymbolKindForElementKind(kind) {
    switch (kind) {
        case "CLASS":
        case "CLASS_TYPE_ALIAS":
            return vs.SymbolKind.Class;
        case "COMPILATION_UNIT":
            return vs.SymbolKind.Module;
        case "CONSTRUCTOR":
        case "CONSTRUCTOR_INVOCATION":
            return vs.SymbolKind.Constructor;
        case "ENUM":
        case "ENUM_CONSTANT":
            return vs.SymbolKind.Enum;
        case "FIELD":
            return vs.SymbolKind.Field;
        case "FILE":
            return vs.SymbolKind.File;
        case "FUNCTION":
        case "FUNCTION_INVOCATION":
        case "FUNCTION_TYPE_ALIAS":
            return vs.SymbolKind.Function;
        case "GETTER":
            return vs.SymbolKind.Property;
        case "LABEL":
            return vs.SymbolKind.Module;
        case "LIBRARY":
            return vs.SymbolKind.Namespace;
        case "LOCAL_VARIABLE":
            return vs.SymbolKind.Variable;
        case "METHOD":
            return vs.SymbolKind.Method;
        case "PARAMETER":
        case "PREFIX":
            return vs.SymbolKind.Variable;
        case "SETTER":
            return vs.SymbolKind.Property;
        case "TOP_LEVEL_VARIABLE":
        case "TYPE_PARAMETER":
            return vs.SymbolKind.Variable;
        case "UNIT_TEST_GROUP":
            return vs.SymbolKind.Module;
        case "UNIT_TEST_TEST":
            return vs.SymbolKind.Method;
        case "UNKNOWN":
            return vs.SymbolKind.Object;
        default:
            utils_2.logError({ message: "Unknown kind: " + kind });
            return vs.SymbolKind.Object;
    }
}
exports.getSymbolKindForElementKind = getSymbolKindForElementKind;
//# sourceMappingURL=analyzer.js.map