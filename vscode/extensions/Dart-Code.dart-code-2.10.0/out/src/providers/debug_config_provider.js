"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const config_1 = require("../config");
const vscode_1 = require("vscode");
const utils_1 = require("../debug/utils");
const utils_2 = require("../utils");
class DebugConfigProvider {
    constructor(sdks, analytics, deviceManager) {
        this.sdks = sdks;
        this.analytics = analytics;
        this.deviceManager = deviceManager;
    }
    provideDebugConfigurations(folder, token) {
        const isFlutter = utils_2.isFlutterProject(folder);
        return [{
                name: isFlutter ? "Flutter" : "Dart",
                program: isFlutter ? undefined : "${workspaceRoot}/bin/main.dart",
                request: "launch",
                type: "dart",
            }];
    }
    resolveDebugConfiguration(folder, debugConfig, token) {
        const isFlutter = utils_2.isFlutterProject(folder);
        // TODO: This cast feels nasty?
        this.setupDebugConfig(folder, debugConfig, isFlutter, this.deviceManager && this.deviceManager.currentDevice ? this.deviceManager.currentDevice.id : null);
        if (isFlutter)
            debugConfig.program = debugConfig.program || "${workspaceRoot}/lib/main.dart"; // Set Flutter default path.
        else if (!debugConfig.program) {
            // For Dart projects that don't have a program, we can't launch, so we perform set type=null which causes launch.json
            // to open.
            debugConfig.type = null;
            vscode_1.window.showInformationMessage("Set the 'program' value in your launch config (eg ${workspaceRoot}/bin/main.dart) then launch again");
        }
        return debugConfig;
    }
    setupDebugConfig(folder, debugConfig, isFlutter, deviceId) {
        this.analytics.logDebuggerStart(folder && folder.uri);
        const dartExec = utils_1.isWin ? "dart.exe" : "dart";
        const flutterExec = utils_1.isWin ? "flutter.bat" : "flutter";
        const conf = config_1.config.for(folder.uri);
        // Attach any properties that weren't explicitly set.
        debugConfig.type = debugConfig.type || "dart";
        debugConfig.request = debugConfig.request || "launch";
        debugConfig.cwd = debugConfig.cwd || "${workspaceRoot}";
        debugConfig.args = debugConfig.args || [];
        debugConfig.dartPath = debugConfig.dartPath || path.join(this.sdks.dart, "bin", dartExec);
        debugConfig.observatoryLogFile = debugConfig.observatoryLogFile || conf.observatoryLogFile;
        debugConfig.previewDart2 = debugConfig.previewDart2 || config_1.config.previewDart2;
        debugConfig.debugSdkLibraries = debugConfig.debugSdkLibraries || conf.debugSdkLibraries;
        debugConfig.debugExternalLibraries = debugConfig.debugExternalLibraries || conf.debugExternalLibraries;
        if (debugConfig.checkedMode === undefined)
            debugConfig.checkedMode = true;
        if (isFlutter) {
            debugConfig.flutterPath = debugConfig.flutterPath || (this.sdks.flutter ? path.join(this.sdks.flutter, "bin", flutterExec) : null);
            debugConfig.flutterRunLogFile = debugConfig.flutterRunLogFile || conf.flutterRunLogFile;
            debugConfig.deviceId = debugConfig.deviceId || deviceId;
        }
    }
}
exports.DebugConfigProvider = DebugConfigProvider;
//# sourceMappingURL=debug_config_provider.js.map