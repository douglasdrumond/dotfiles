"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vs = require("vscode");
const config_1 = require("../config");
const utils_1 = require("../utils");
class StatusBarVersionTracker {
    constructor(projectType, dartSdkVersion, flutterSdkVersion) {
        this.subscriptions = [];
        if (projectType === utils_1.ProjectType.Flutter && flutterSdkVersion) {
            this.addStatusBarItem("Flutter: " + (flutterSdkVersion.length > 20 ? flutterSdkVersion.substr(0, 17) + "…" : flutterSdkVersion), `Flutter SDK: ${flutterSdkVersion}`, config_1.config.flutterSdkPaths && config_1.config.flutterSdkPaths.length > 0 ? "dart.changeFlutterSdk" : null);
        }
        // For now, don't show Dart versions if we're a flutter project
        // https://github.com/flutter/flutter/issues/15348
        if (dartSdkVersion && projectType !== utils_1.ProjectType.Flutter) {
            this.addStatusBarItem("Dart: " + (dartSdkVersion.length > 20 ? dartSdkVersion.substr(0, 17) + "…" : dartSdkVersion), `Dart SDK: ${dartSdkVersion}`, config_1.config.sdkPaths && config_1.config.sdkPaths.length > 0 ? "dart.changeSdk" : null);
        }
    }
    addStatusBarItem(text, tooltip, command) {
        const statusBarItem = vs.window.createStatusBarItem(vs.StatusBarAlignment.Right, 2);
        statusBarItem.text = text;
        statusBarItem.tooltip = tooltip;
        statusBarItem.command = command;
        this.subscriptions.push(statusBarItem);
        this.subscriptions.push(vs.window.onDidChangeActiveTextEditor((e) => {
            if (e && e.document && utils_1.isAnalyzable(e.document))
                statusBarItem.show();
            else
                statusBarItem.hide();
        }));
        if (vs.window.activeTextEditor && vs.window.activeTextEditor.document && utils_1.isAnalyzable(vs.window.activeTextEditor.document))
            statusBarItem.show();
    }
    dispose() {
        this.subscriptions.forEach((s) => s.dispose());
    }
}
exports.StatusBarVersionTracker = StatusBarVersionTracker;
//# sourceMappingURL=status_bar_version_tracker.js.map