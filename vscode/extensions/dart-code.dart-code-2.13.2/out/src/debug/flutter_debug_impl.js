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
const path = require("path");
const vscode_debugadapter_1 = require("vscode-debugadapter");
const dart_debug_impl_1 = require("./dart_debug_impl");
const flutter_run_1 = require("./flutter_run");
const utils_1 = require("./utils");
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
        this.noDebug = args.noDebug;
        const debug = !args.noDebug;
        let appArgs = [];
        appArgs.push("-t");
        appArgs.push(this.sourceFileForArgs(args));
        if (args.deviceId) {
            appArgs.push("-d");
            appArgs.push(args.deviceId);
        }
        if (args.flutterMode === "profile") {
            appArgs.push("--profile");
        }
        else if (args.flutterMode === "release") {
            appArgs.push("--release");
        }
        if (debug) {
            appArgs.push("--start-paused");
        }
        if (args.args) {
            appArgs = appArgs.concat(args.args);
        }
        if (args.showMemoryUsage) {
            this.pollforMemoryMs = 1000;
        }
        // Normally for `flutter run` we don't allow terminating the pid we get from Observatory,
        // because it's on a remote device, however in the case of the flutter-tester, it is local
        // and otherwise might be left hanging around.
        this.allowTerminatingObservatoryVmPid = args.deviceId === "flutter-tester";
        this.flutter = new flutter_run_1.FlutterRun(args.flutterPath, args.cwd, appArgs, args.flutterRunLogFile);
        this.flutter.registerForUnhandledMessages((msg) => this.logToUser(msg));
        // Set up subscriptions.
        this.flutter.registerForAppStart((n) => this.currentRunningAppId = n.appId);
        this.flutter.registerForAppDebugPort((n) => { this.observatoryUri = n.wsUri; this.baseUri = n.baseUri; });
        this.flutter.registerForAppStarted((n) => { if (!args.noDebug && this.observatoryUri)
            this.initObservatory(this.observatoryUri); });
        this.flutter.registerForAppStop((n) => { this.currentRunningAppId = undefined; this.flutter.dispose(); });
        this.flutter.registerForAppProgress((e) => this.sendEvent(new vscode_debugadapter_1.Event("dart.progress", { message: e.message, finished: e.finished })));
        this.flutter.registerForError((err) => this.sendEvent(new vscode_debugadapter_1.OutputEvent(err, "stderr")));
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
        if (this.cwd) {
            const projectUri = utils_1.formatPathForVm(this.cwd);
            // Map any paths over to the device-local paths.
            allUris.slice().forEach((uri) => {
                if (uri.startsWith(projectUri)) {
                    const relativePath = uri.substr(projectUri.length);
                    const mappedPath = path.join(this.baseUri, relativePath);
                    const newUri = utils_1.formatPathForVm(mappedPath);
                    allUris.push(newUri);
                }
            });
        }
        return allUris;
    }
    convertVMUriToSourcePath(uri) {
        // Note: Flutter device paths (and baseUri) are always linux-y (not Windows) so we need to
        // force Linux format for remote paths.
        let localPath = super.convertVMUriToSourcePath(uri);
        const localPathLinux = super.convertVMUriToSourcePath(uri, false);
        // If the path is the baseUri given by flutter, we need to rewrite it into a local path for this machine.
        const basePath = utils_1.uriToFilePath(this.baseUri, false);
        if (localPathLinux.startsWith(basePath) && this.cwd)
            localPath = path.join(this.cwd, path.relative(basePath, localPathLinux));
        return localPath;
    }
    disconnectRequest(response, args) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            if (this.currentRunningAppId)
                yield this.flutter.stop(this.currentRunningAppId);
            _super("disconnectRequest").call(this, response, args);
        });
    }
    restartRequest(response, args) {
        this.performReload(false);
        // Notify the Extension we had a restart request so it's able to
        // log the hotReload.
        this.sendEvent(new vscode_debugadapter_1.Event("dart.restartRequest"));
        super.restartRequest(response, args);
    }
    performReload(hotRestart) {
        if (this.isReloadInProgress) {
            this.sendEvent(new vscode_debugadapter_1.OutputEvent("Reload already in progress, ignoring request", "stderr"));
            return;
        }
        this.isReloadInProgress = true;
        return this.flutter.restart(this.currentRunningAppId, !this.noDebug, hotRestart)
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
                        // tslint:disable-next-line:no-empty
                        .then((result) => { }, (error) => this.sendEvent(new vscode_debugadapter_1.OutputEvent(error, "stderr")));
                break;
            case "togglePlatform":
                if (this.currentRunningAppId)
                    this.flutter.callServiceExtension(this.currentRunningAppId, "ext.flutter.platformOverride", null).then((result) => {
                        this.flutter.callServiceExtension(this.currentRunningAppId, "ext.flutter.platformOverride", { value: result.value === "android" ? "iOS" : "android" })
                            // tslint:disable-next-line:no-empty
                            .then((result) => { }, (error) => this.sendEvent(new vscode_debugadapter_1.OutputEvent(error, "stderr")));
                    }, (error) => this.sendEvent(new vscode_debugadapter_1.OutputEvent(error, "stderr")));
                break;
            case "hotReload":
                if (this.currentRunningAppId)
                    this.performReload(false);
                break;
            case "hotRestart":
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