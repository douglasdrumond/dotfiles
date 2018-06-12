"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const os = require("os");
const path = require("path");
const vscode_1 = require("vscode");
const config_1 = require("../config");
const utils_1 = require("../debug/utils");
const utils_2 = require("../utils");
const maxErrorReportCount = 3;
const sendFakeErrorAtStartup = false;
let errorCount = 0;
class AnalyzerStatusReporter {
    constructor(analyzer, sdks, analytics) {
        this.analyzer = analyzer;
        this.sdks = sdks;
        this.analytics = analytics;
        analyzer.registerForServerStatus((n) => this.handleServerStatus(n));
        analyzer.registerForServerError((e) => this.handleServerError(e));
        analyzer.registerForRequestError((e) => this.handleRequestError(e));
        if (sendFakeErrorAtStartup) {
            setTimeout(() => {
                this.handleServerError({
                    isFatal: false,
                    message: "This is a fake error for testing the error reporting!",
                    stackTrace: new Error().stack,
                }, "testError");
            }, 5000);
        }
    }
    handleServerStatus(status) {
        if (!status.analysis)
            return;
        this.analysisInProgress = status.analysis.isAnalyzing;
        if (this.analysisInProgress) {
            // Debounce short analysis times.
            setTimeout(() => {
                // When the timeout fires, we need to check analysisInProgress again in case
                // analysis has already finished.
                if (this.analysisInProgress && !this.analyzingPromise) {
                    this.analyzingPromise = new utils_1.PromiseCompleter();
                    vscode_1.window.withProgress({ location: vscode_1.ProgressLocation.Window, title: "Analyzing…" }, (_) => this.analyzingPromise.promise);
                }
            }, 500);
        }
        else {
            if (this.analyzingPromise) {
                this.analyzingPromise.resolve();
                this.analyzingPromise = null;
            }
        }
    }
    handleRequestError(error) {
        // Map this request error to a server error to reuse the shared code.
        this.handleServerError({
            isFatal: false,
            message: error.message,
            stackTrace: error.stackTrace,
        }, error.method);
    }
    handleServerError(error, method) {
        // Always log to the console.
        console.error(error.message);
        if (error.stackTrace)
            console.error(error.stackTrace);
        this.analytics.logAnalyzerError((method ? `(${method}) ` : "") + error.message, error.isFatal);
        errorCount++;
        // Offer to report the error.
        if (config_1.config.reportAnalyzerErrors && errorCount <= maxErrorReportCount && this.shouldReportErrors()) {
            const shouldReport = "Generate error report";
            vscode_1.window.showErrorMessage(`Exception from the Dart analysis server: ${error.message}`, shouldReport).then((res) => {
                if (res === shouldReport)
                    this.reportError(error, method);
            });
        }
    }
    shouldReportErrors() {
        if (this.sdks.projectType === utils_2.ProjectType.Flutter && this.sdks.flutter)
            return !utils_2.isStableSdk(utils_2.getSdkVersion(this.sdks.flutter));
        else
            return !utils_2.isStableSdk(utils_2.getSdkVersion(this.sdks.dart));
    }
    reportError(error, method) {
        const sdkVersion = utils_2.getSdkVersion(this.sdks.dart);
        const flutterSdkVersion = utils_2.getSdkVersion(this.sdks.flutter);
        // Attempt to get the last diagnostics
        const diagnostics = this.analyzer.getLastDiagnostics();
        const analyzerArgs = this.analyzer.getAnalyzerLaunchArgs();
        const data = `
Please review the below report for any information you do not wish to share and report to
  https://github.com/dart-lang/sdk/issues/new

Exception from analysis server (running from VSCode / Dart Code)

### What I was doing

(please describe what you were doing when this exception occurred)
${method ? "\n### Request\n\nWhile responding to request: `" + method + "`\n" : ""}
### Versions

- ${flutterSdkVersion ? `Flutter SDK ${flutterSdkVersion}` : `Dart SDK ${sdkVersion}`}
- ${vscode_1.env.appName} ${vscode_1.version}
- Dart Code ${utils_2.extensionVersion}

### Analyzer Info

The analyzer was launched using the arguments:

\`\`\`text
${analyzerArgs.join("\n")}
\`\`\`

### Exception${error.isFatal ? " (fatal)" : ""}

${error.message}

\`\`\`text
${error.stackTrace.trim()}
\`\`\`
${diagnostics ? "\nDiagnostics requested after the error occurred are:\n\n```js\n" + JSON.stringify(diagnostics, null, 4) + "\n```\n" : ""}
`;
        const fileName = `bug-${getRandomInt(0x1000, 0x10000).toString(16)}.md`;
        const tempPath = path.join(os.tmpdir(), fileName);
        fs.writeFileSync(tempPath, data);
        vscode_1.workspace.openTextDocument(tempPath).then((document) => {
            vscode_1.window.showTextDocument(document);
        });
    }
}
exports.AnalyzerStatusReporter = AnalyzerStatusReporter;
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}
//# sourceMappingURL=analyzer_status_reporter.js.map