"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dart_debug_impl_1 = require("./dart_debug_impl");
const utils_1 = require("./utils");
const flutter_run_1 = require("./flutter_run");
const vscode_debugadapter_1 = require("vscode-debugadapter");
const path = require("path");
class FlutterDebugSession extends dart_debug_impl_1.DartDebugSession {
    constructor() {
        super();
        this.sendStdOutToConsole = false;
    }
    initializeRequest(response, args) {
        response.body.supportsRestartRequest = true;
        super.initializeRequest(response, args);
    }
    spawnProcess(args) {
        const debug = !args.noDebug;
        let appArgs = [];
        if (this.sourceFile) {
            appArgs.push("-t");
            appArgs.push(this.sourceFile);
        }
        if (args.deviceId) {
            appArgs.push("-d");
            appArgs.push(args.deviceId);
        }
        if (args.previewDart2) {
            appArgs.push("--preview-dart-2");
        }
        if (debug) {
            appArgs.push("--start-paused");
        }
        if (args.args)
            appArgs = appArgs.concat(args.args);
        // TODO: Add log file.
        this.flutter = new flutter_run_1.FlutterRun(this.args.flutterPath, args.cwd, appArgs, this.args.flutterRunLogFile);
        this.flutter.registerForUnhandledMessages((msg) => this.log(msg));
        // Set up subscriptions.
        this.flutter.registerForAppStart((n) => this.currentRunningAppId = n.appId);
        this.flutter.registerForAppDebugPort((n) => { this.observatoryUri = n.wsUri; this.baseUri = n.baseUri; });
        this.flutter.registerForAppStarted((n) => { if (!args.noDebug)
            this.initObservatory(this.observatoryUri); });
        this.flutter.registerForAppStop((n) => { this.currentRunningAppId = undefined; this.flutter.dispose(); });
        this.flutter.registerForAppProgress((e) => this.sendEvent(new vscode_debugadapter_1.Event("dart.progress", { message: e.message, finished: e.finished })));
        return this.flutter.process;
    }
    /***
     * Converts a source path to an array of possible uris.
     *
     * For flutter we need to extend the Dart implementation by also providing uris
     * using the baseUri value returned from `flutter run` to match the fs path
     * on the device running the application in order for breakpoints to match the
     * patched `hot reload` code.
     */
    getPossibleSourceUris(sourcePath) {
        const allUris = super.getPossibleSourceUris(sourcePath);
        const projectUri = utils_1.formatPathForVm(this.args.cwd);
        // Map any paths over to the device-local paths.
        allUris.slice().forEach((uri) => {
            if (uri.startsWith(projectUri)) {
                const relativePath = uri.substr(projectUri.length);
                const mappedPath = path.join(this.baseUri, relativePath);
                const newUri = utils_1.formatPathForVm(mappedPath);
                allUris.push(newUri);
            }
        });
        return allUris;
    }
    convertVMUriToSourcePath(uri) {
        // Note: Flutter device paths (and baseUri) are always linux-y (not Windows) so we need to
        // force Linux format for remote paths.
        let localPath = super.convertVMUriToSourcePath(uri);
        const localPathLinux = super.convertVMUriToSourcePath(uri, false);
        // If the path is the baseUri given by flutter, we need to rewrite it into a local path for this machine.
        const basePath = utils_1.uriToFilePath(this.baseUri, false);
        if (localPathLinux.startsWith(basePath))
            localPath = path.join(this.args.cwd, path.relative(basePath, localPathLinux));
        return localPath;
    }
    disconnectRequest(response, args) {
        if (this.currentRunningAppId)
            this.flutter.stop(this.currentRunningAppId);
        super.disconnectRequest(response, args);
    }
    restartRequest(response, args) {
        this.performReload(false);
        // Notify the Extension we had a restart request so it's able to
        // log the hotReload.
        this.sendEvent(new vscode_debugadapter_1.Event("dart.restartRequest"));
        super.restartRequest(response, args);
    }
    performReload(fullRestart) {
        if (this.isReloadInProgress) {
            this.sendEvent(new vscode_debugadapter_1.OutputEvent("Reload already in progress, ignoring request", "stderr"));
            return;
        }
        this.isReloadInProgress = true;
        return this.flutter.restart(this.currentRunningAppId, !this.args.noDebug, fullRestart)
            .then((result) => {
            // If we get a hint, send it back over to the UI to do something appropriate.
            if (result && result.hintId)
                this.sendEvent(new vscode_debugadapter_1.Event("dart.hint", { hintId: result.hintId, hintMessage: result.hintMessage }));
        }, (error) => this.sendEvent(new vscode_debugadapter_1.OutputEvent(error, "stderr")))
            .then(() => this.isReloadInProgress = false);
    }
    customRequest(request, response, args) {
        switch (request) {
            case "serviceExtension":
                if (this.currentRunningAppId)
                    this.flutter.callServiceExtension(this.currentRunningAppId, args.type, args.params)
                        .then((result) => { }, (error) => this.sendEvent(new vscode_debugadapter_1.OutputEvent(error, "stderr")));
                break;
            case "togglePlatform":
                if (this.currentRunningAppId)
                    this.flutter.callServiceExtension(this.currentRunningAppId, "ext.flutter.platformOverride", null).then((result) => {
                        this.flutter.callServiceExtension(this.currentRunningAppId, "ext.flutter.platformOverride", { value: result.value === "android" ? "iOS" : "android" })
                            .then((result) => { }, (error) => this.sendEvent(new vscode_debugadapter_1.OutputEvent(error, "stderr")));
                    }, (error) => this.sendEvent(new vscode_debugadapter_1.OutputEvent(error, "stderr")));
                break;
            case "hotReload":
                if (this.currentRunningAppId)
                    this.performReload(false);
                break;
            case "fullRestart":
                if (this.currentRunningAppId)
                    this.performReload(true);
                break;
            default:
                super.customRequest(request, response, args);
                break;
        }
    }
    // Extension
    handleExtensionEvent(event) {
        if (event.kind === "Extension" && event.extensionKind === "Flutter.FirstFrame") {
            this.sendEvent(new vscode_debugadapter_1.Event("dart.flutter.firstFrame", {}));
        }
        else {
            super.handleExtensionEvent(event);
        }
    }
}
exports.FlutterDebugSession = FlutterDebugSession;
//# sourceMappingURL=flutter_debug_impl.js.map