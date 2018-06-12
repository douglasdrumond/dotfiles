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
const fs = require("fs");
const net = require("net");
const path = require("path");
const vs = require("vscode");
const vscode_1 = require("vscode");
const config_1 = require("../config");
const dart_debug_impl_1 = require("../debug/dart_debug_impl");
const flutter_debug_impl_1 = require("../debug/flutter_debug_impl");
const flutter_test_debug_impl_1 = require("../debug/flutter_test_debug_impl");
const utils_1 = require("../debug/utils");
const project_1 = require("../project");
const utils_2 = require("../utils");
class DebugConfigProvider {
    constructor(sdks, analytics, deviceManager) {
        this.debugServers = {};
        this.sdks = sdks;
        this.analytics = analytics;
        this.deviceManager = deviceManager;
    }
    provideDebugConfigurations(folder, token) {
        const isFlutter = utils_2.isFlutterWorkspaceFolder(folder);
        return [{
                name: isFlutter ? "Flutter" : "Dart",
                program: isFlutter ? undefined : "bin/main.dart",
                request: "launch",
                type: "dart",
            }];
    }
    resolveDebugConfiguration(folder, debugConfig, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const openFile = vscode_1.window.activeTextEditor && vscode_1.window.activeTextEditor.document ? utils_2.fsPath(vscode_1.window.activeTextEditor.document.uri) : null;
            function resolveVariables(input) {
                if (!input)
                    return input;
                if (input === "${file}")
                    return openFile;
                if (!folder)
                    return input;
                return input.replace(/\${workspaceFolder}/, utils_2.fsPath(folder.uri));
            }
            debugConfig.program = resolveVariables(debugConfig.program);
            debugConfig.cwd = resolveVariables(debugConfig.cwd);
            if (openFile && !folder)
                folder = vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.file(openFile));
            const isAttachRequest = debugConfig.request === "attach";
            if (!isAttachRequest) {
                // If there's no program set, try to guess one.
                debugConfig.program = debugConfig.program || this.guessBestEntryPoint(openFile, folder);
                // If we still don't have an entry point, the user will have to provide it.
                if (!debugConfig.program) {
                    // Set type=null which causes launch.json to open.
                    debugConfig.type = null;
                    vscode_1.window.showInformationMessage("Set the 'program' value in your launch config (eg 'bin/main.dart') then launch again");
                    return debugConfig;
                }
            }
            else {
                // For attaching, the Observatory address must be specified. If it's not provided already, prompt for it.
                debugConfig.observatoryUri = yield this.getObservatoryUri(debugConfig.observatoryUri);
                if (!debugConfig.observatoryUri) {
                    // Set type=null which causes launch.json to open.
                    debugConfig.type = null;
                    vscode_1.window.showInformationMessage("You must provide an Observatory URI/port to attach a debugger");
                    return debugConfig;
                }
            }
            // If we don't have a cwd then find the best one from the project root.
            if (!debugConfig.cwd && folder) {
                debugConfig.cwd = utils_2.fsPath(folder.uri);
                // If we have an entry point, see if we can make this more specific by finding a .packages file
                if (debugConfig.program) {
                    const bestProjectRoot = project_1.locateBestProjectRoot(debugConfig.program);
                    if (bestProjectRoot) {
                        if (!folder || utils_1.isWithinPath(bestProjectRoot, utils_2.fsPath(folder.uri)))
                            debugConfig.cwd = bestProjectRoot;
                    }
                }
            }
            // Ensure we have a full path.
            if (debugConfig.program && debugConfig.cwd && !path.isAbsolute(debugConfig.program))
                debugConfig.program = path.join(debugConfig.cwd, debugConfig.program);
            // Disable Flutter mode for attach.
            // TODO: Update FlutterDebugSession to understand attach mode, and remove this limitation.
            const isFlutter = debugConfig.cwd && utils_2.isFlutterProjectFolder(debugConfig.cwd) && !isAttachRequest;
            const isTest = debugConfig.program && utils_2.isTestFile(resolveVariables(debugConfig.program));
            const debugType = isFlutter
                ? (isTest ? DebuggerType.FlutterTest : DebuggerType.Flutter)
                : DebuggerType.Dart;
            // Ensure we have a device
            const deviceId = this.deviceManager && this.deviceManager.currentDevice ? this.deviceManager.currentDevice.id : null;
            if (isFlutter && !isTest && !deviceId && this.deviceManager && debugConfig.deviceId !== "flutter-tester") {
                // Fetch a list of emulators
                if (!(yield this.deviceManager.promptForAndLaunchEmulator())) {
                    // Set type=null which causes launch.json to open.
                    debugConfig.type = null;
                    vscode_1.window.showInformationMessage("Cannot launch without an active device");
                    return debugConfig;
                }
            }
            // TODO: This cast feels nasty?
            this.setupDebugConfig(folder, debugConfig, isFlutter, deviceId);
            // Debugger always uses uppercase drive letters to ensure our paths have them regardless of where they came from.
            debugConfig.program = utils_1.forceWindowsDriveLetterToUppercase(debugConfig.program);
            debugConfig.cwd = utils_1.forceWindowsDriveLetterToUppercase(debugConfig.cwd);
            // Start port listener on launch of first debug session.
            const debugServer = this.getDebugServer(debugType, debugConfig.debugServer);
            // Make VS Code connect to debug server instead of launching debug adapter.
            // TODO: Why do we need this cast? The node-mock-debug does not?
            debugConfig.debugServer = debugServer.address().port;
            this.analytics.logDebuggerStart(folder && folder.uri);
            return debugConfig;
        });
    }
    guessBestEntryPoint(openFile, workspaceFolder) {
        if (utils_2.isTestFile(openFile) || utils_2.isInsideFolderNamed(openFile, "bin") || utils_2.isInsideFolderNamed(openFile, "tool")) {
            return openFile;
        }
        else {
            // Use the open file as a clue to find the best project root, then search from there.
            const commonLaunchPaths = [
                path.join(utils_2.fsPath(workspaceFolder.uri), "lib", "main.dart"),
                path.join(utils_2.fsPath(workspaceFolder.uri), "bin", "main.dart"),
            ];
            for (const launchPath of commonLaunchPaths) {
                if (fs.existsSync(launchPath)) {
                    return launchPath;
                }
            }
        }
    }
    getObservatoryUri(observatoryUri) {
        return __awaiter(this, void 0, void 0, function* () {
            observatoryUri = observatoryUri || (yield vs.window.showInputBox({
                ignoreFocusOut: true,
                placeHolder: "Paste an Observatory URI or port",
                prompt: "Enter Observatory URI",
                validateInput: (input) => {
                    if (!input)
                        return;
                    input = input.trim();
                    if (Number.isInteger(parseFloat(input)))
                        return;
                    // Uri.parse doesn't seem to work as expected, so do our own basic validation
                    // https://github.com/Microsoft/vscode/issues/49818
                    if (!input.startsWith("http://") && !input.startsWith("https://"))
                        return "Please enter a valid Observatory URI or port number";
                },
            }));
            observatoryUri = observatoryUri && observatoryUri.trim();
            // If the input is just a number, treat is as a localhost port.
            if (observatoryUri && /^[0-9]+$/.exec(observatoryUri)) {
                observatoryUri = `http://127.0.0.1:${observatoryUri}`;
            }
            return observatoryUri;
        });
    }
    getDebugServer(debugType, port) {
        switch (debugType) {
            case DebuggerType.Flutter:
                return this.spawnOrGetServer("flutter", port, () => new flutter_debug_impl_1.FlutterDebugSession());
            case DebuggerType.FlutterTest:
                return this.spawnOrGetServer("flutterTest", port, () => new flutter_test_debug_impl_1.FlutterTestDebugSession());
            case DebuggerType.Dart:
                return this.spawnOrGetServer("dart", port, () => new dart_debug_impl_1.DartDebugSession());
            default:
                throw new Error("Unknown debugger type");
        }
    }
    spawnOrGetServer(type, port = 0, create) {
        // Start port listener on launch of first debug session.
        if (!this.debugServers[type]) {
            // Start listening on a random port.
            this.debugServers[type] = net.createServer((socket) => {
                const session = create();
                session.setRunAsServer(true);
                session.start(socket, socket);
            }).listen(port);
        }
        return this.debugServers[type];
    }
    setupDebugConfig(folder, debugConfig, isFlutter, deviceId) {
        const dartExec = utils_1.isWin ? "dart.exe" : "dart";
        const flutterExec = utils_1.isWin ? "flutter.bat" : "flutter";
        const conf = config_1.config.for(folder && folder.uri || null);
        // Attach any properties that weren't explicitly set.
        debugConfig.name = debugConfig.name || "Dart & Flutter";
        debugConfig.type = debugConfig.type || "dart";
        debugConfig.request = debugConfig.request || "launch";
        debugConfig.cwd = debugConfig.cwd || (folder && utils_2.fsPath(folder.uri));
        debugConfig.args = debugConfig.args || [];
        debugConfig.vmAdditionalArgs = debugConfig.vmAdditionalArgs || conf.vmAdditionalArgs;
        debugConfig.dartPath = debugConfig.dartPath || path.join(this.sdks.dart, "bin", dartExec);
        debugConfig.observatoryLogFile = debugConfig.observatoryLogFile || conf.observatoryLogFile;
        debugConfig.debugSdkLibraries = debugConfig.debugSdkLibraries || conf.debugSdkLibraries;
        debugConfig.debugExternalLibraries = debugConfig.debugExternalLibraries || conf.debugExternalLibraries;
        if (isFlutter) {
            debugConfig.flutterMode = debugConfig.flutterMode || "debug";
            debugConfig.flutterPath = debugConfig.flutterPath || (this.sdks.flutter ? path.join(this.sdks.flutter, "bin", flutterExec) : null);
            debugConfig.flutterRunLogFile = debugConfig.flutterRunLogFile || conf.flutterRunLogFile;
            debugConfig.flutterTestLogFile = debugConfig.flutterTestLogFile || conf.flutterTestLogFile;
            debugConfig.deviceId = debugConfig.deviceId || deviceId;
            debugConfig.showMemoryUsage =
                debugConfig.showMemoryUsage !== undefined && debugConfig.showMemoryUsage !== null
                    ? debugConfig.showMemoryUsage
                    : debugConfig.flutterMode === "profile";
        }
    }
    dispose() {
        if (this.debugServers) {
            for (const type of Object.keys(this.debugServers)) {
                this.debugServers[type].close();
                delete this.debugServers[type];
            }
        }
    }
}
exports.DebugConfigProvider = DebugConfigProvider;
var DebuggerType;
(function (DebuggerType) {
    DebuggerType[DebuggerType["Dart"] = 0] = "Dart";
    DebuggerType[DebuggerType["Flutter"] = 1] = "Flutter";
    DebuggerType[DebuggerType["FlutterTest"] = 2] = "FlutterTest";
})(DebuggerType || (DebuggerType = {}));
//# sourceMappingURL=debug_config_provider.js.map