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
const utils_1 = require("../debug/utils");
const extension_1 = require("../extension");
const utils_2 = require("../utils");
class DebugCommands {
    constructor(context, analytics) {
        this.debugPaintingEnabled = false;
        this.performanceOverlayEnabled = false;
        this.repaintRainbowEnabled = false;
        this.timeDilation = 1.0;
        this.debugModeBannerEnabled = true;
        this.paintBaselinesEnabled = false;
        this.reloadStatus = vs.window.createStatusBarItem(vs.StatusBarAlignment.Left);
        this.debugMetrics = vs.window.createStatusBarItem(vs.StatusBarAlignment.Right, 0);
        this.observatoryUri = null;
        this.serviceSettings = {};
        this.enabledServiceExtensions = [];
        this.analytics = analytics;
        context.subscriptions.push(this.reloadStatus, this.debugMetrics);
        context.subscriptions.push(vs.debug.onDidReceiveDebugSessionCustomEvent((e) => {
            if (e.event === "dart.progress") {
                if (e.body.message) {
                    // Clear any old progress first
                    if (this.progressPromise)
                        this.progressPromise.resolve();
                    this.progressPromise = new utils_1.PromiseCompleter();
                    vs.window.withProgress({ location: vs.ProgressLocation.Notification, title: e.body.message }, (_) => this.progressPromise.promise);
                }
                if (e.body.finished) {
                    if (this.progressPromise) {
                        this.progressPromise.resolve();
                        this.progressPromise = null;
                    }
                }
            }
            else if (e.event === "dart.observatoryUri") {
                this.observatoryUri = e.body.observatoryUri;
            }
            else if (e.event === "dart.restartRequest") {
                // This event comes back when the user restarts with the Restart button
                // (eg. it wasn't intiated from our extension, so we don't get to log it
                // in the hotReload command).
                analytics.logDebuggerHotReload();
                this.reloadStatus.hide(); // Also remove stale reload status when this happened.
            }
            else if (e.event === "dart.hint" && e.body && e.body.hintId) {
                switch (e.body.hintId) {
                    case "restartRecommended":
                        this.promptForHotRestart(e.body.hintMessage);
                        break;
                    default:
                        if (e.body.hintMessage)
                            vs.window.showInformationMessage(e.body.hintMessage);
                        else
                            utils_2.logError({ message: `Unexpected hint from debugger: ${e.body.hintId}, ${e.body.hintMessage}` });
                }
            }
            else if (e.event === "dart.serviceExtensionAdded") {
                this.enableServiceExtension(e.body.id);
            }
            else if (e.event === "dart.flutter.firstFrame") {
                // Send the current value to ensure it persists for the user.
                this.sendAllServiceSettings();
            }
            else if (e.event === "dart.debugMetrics") {
                const memory = e.body.memory;
                const message = `${Math.ceil(memory.current / 1024 / 1024)}MB of ${Math.ceil(memory.total / 1024 / 1024)}MB`;
                this.debugMetrics.text = message;
                this.debugMetrics.tooltip = "This is the amount of memory being consumed by your applications heaps (out of what has been allocated).\n\nNote: memory usage shown in debug builds may not be indicative of usage in release builds. Use profile builds for more accurate figures when testing memory usage.";
                this.debugMetrics.show();
            }
        }));
        let debugSessionStart;
        context.subscriptions.push(vs.debug.onDidStartDebugSession((s) => __awaiter(this, void 0, void 0, function* () {
            let type = s.type;
            // The Visual Studio Live Share extension overrides the type to proxy debug sessions so
            // it won't be "dart". We can request the real info from it with the debugSessionInfo
            // custom request.
            if (type === "vslsShare") {
                const debugSessionInfo = yield s.customRequest("debugSessionInfo");
                type = debugSessionInfo.configurationProperties.type;
            }
            if (type === "dart") {
                this.currentDebugSession = s;
                this.resetFlutterSettings();
                debugSessionStart = new Date();
            }
        })));
        context.subscriptions.push(vs.debug.onDidTerminateDebugSession((s) => {
            if (s === this.currentDebugSession) {
                this.currentDebugSession = null;
                this.observatoryUri = null;
                if (this.progressPromise)
                    this.progressPromise.resolve();
                this.reloadStatus.hide();
                this.debugMetrics.hide();
                const debugSessionEnd = new Date();
                this.disableAllServiceExtensions();
                analytics.logDebugSessionDuration(debugSessionEnd.getTime() - debugSessionStart.getTime());
            }
        }));
        this.registerBoolServiceCommand("ext.flutter.debugPaint", () => this.debugPaintingEnabled);
        this.registerBoolServiceCommand("ext.flutter.showPerformanceOverlay", () => this.performanceOverlayEnabled);
        this.registerBoolServiceCommand("ext.flutter.repaintRainbow", () => this.repaintRainbowEnabled);
        this.registerServiceCommand("ext.flutter.timeDilation", () => ({ timeDilation: this.timeDilation }));
        this.registerBoolServiceCommand("ext.flutter.debugAllowBanner", () => this.debugModeBannerEnabled);
        this.registerBoolServiceCommand("ext.flutter.debugPaintBaselinesEnabled", () => this.paintBaselinesEnabled);
        context.subscriptions.push(vs.commands.registerCommand("flutter.toggleDebugPainting", () => { this.debugPaintingEnabled = !this.debugPaintingEnabled; this.sendServiceSetting("ext.flutter.debugPaint"); }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.togglePerformanceOverlay", () => { this.performanceOverlayEnabled = !this.performanceOverlayEnabled; this.sendServiceSetting("ext.flutter.showPerformanceOverlay"); }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.toggleRepaintRainbow", () => { this.repaintRainbowEnabled = !this.repaintRainbowEnabled; this.sendServiceSetting("ext.flutter.repaintRainbow"); }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.toggleSlowAnimations", () => { this.timeDilation = 6.0 - this.timeDilation; this.sendServiceSetting("ext.flutter.timeDilation"); }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.toggleDebugModeBanner", () => { this.debugModeBannerEnabled = !this.debugModeBannerEnabled; this.sendServiceSetting("ext.flutter.debugAllowBanner"); }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.togglePaintBaselines", () => { this.paintBaselinesEnabled = !this.paintBaselinesEnabled; this.sendServiceSetting("ext.flutter.debugPaintBaselinesEnabled"); }));
        // Open Observatory.
        context.subscriptions.push(vs.commands.registerCommand("dart.openObservatory", () => {
            if (this.observatoryUri) {
                utils_2.openInBrowser(this.observatoryUri);
                analytics.logDebuggerOpenObservatory();
            }
        }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.openTimeline", () => {
            if (this.observatoryUri) {
                utils_2.openInBrowser(this.observatoryUri + "/#/timeline-dashboard");
                analytics.logDebuggerOpenTimeline();
            }
        }));
        // Misc custom debug commands.
        context.subscriptions.push(vs.commands.registerCommand("flutter.hotReload", () => {
            if (!this.currentDebugSession)
                return;
            this.reloadStatus.hide();
            this.sendCustomFlutterDebugCommand("hotReload");
            analytics.logDebuggerHotReload();
        }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.hotRestart", () => {
            if (!this.currentDebugSession)
                return;
            this.reloadStatus.hide();
            this.sendCustomFlutterDebugCommand("hotRestart");
            analytics.logDebuggerRestart();
        }));
        context.subscriptions.push(vs.commands.registerCommand("dart.startDebugging", (resource) => {
            vs.debug.startDebugging(vs.workspace.getWorkspaceFolder(resource), {
                name: "Dart",
                program: utils_2.fsPath(resource),
                request: "launch",
                type: "dart",
            });
        }));
        context.subscriptions.push(vs.commands.registerCommand("dart.startWithoutDebugging", (resource) => {
            vs.debug.startDebugging(vs.workspace.getWorkspaceFolder(resource), {
                name: "Dart",
                noDebug: true,
                program: utils_2.fsPath(resource),
                request: "launch",
                type: "dart",
            });
        }));
        // Flutter toggle platform.
        // We can't just use a service command here, as we need to call it twice (once to get, once to change) and
        // currently it seems like the DA can't return responses to us here, so we'll have to do them both inside the DA.
        context.subscriptions.push(vs.commands.registerCommand("flutter.togglePlatform", () => this.sendCustomFlutterDebugCommand("togglePlatform")));
        // Attach commands.
        context.subscriptions.push(vs.commands.registerCommand("dart.attach", () => {
            if (this.currentDebugSession)
                return;
            vs.debug.startDebugging(undefined, {
                name: "Dart: Attach to Process",
                request: "attach",
                type: "dart",
            });
        }));
    }
    sendServiceSetting(id) {
        if (this.serviceSettings[id] && this.enabledServiceExtensions.indexOf(id) !== -1)
            this.serviceSettings[id]();
    }
    sendAllServiceSettings() {
        for (const id in this.serviceSettings)
            this.sendServiceSetting(id);
    }
    registerBoolServiceCommand(id, getValue) {
        this.serviceSettings[id] = () => this.runBoolServiceCommand(id, getValue());
    }
    registerServiceCommand(id, getValue) {
        this.serviceSettings[id] = () => this.runServiceCommand(id, getValue());
    }
    promptForHotRestart(message) {
        this.reloadStatus.text = "↻ Hot restart may be required";
        this.reloadStatus.tooltip = message + "\r\n\r\nClick to restart";
        this.reloadStatus.command = "flutter.hotRestart";
        this.reloadStatus.show();
    }
    runServiceCommand(method, params) {
        this.sendCustomFlutterDebugCommand("serviceExtension", { type: method, params });
    }
    runBoolServiceCommand(method, enabled) {
        this.runServiceCommand(method, { enabled });
    }
    sendCustomFlutterDebugCommand(type, args) {
        if (this.currentDebugSession)
            this.currentDebugSession.customRequest(type, args);
    }
    resetFlutterSettings() {
        this.debugPaintingEnabled = false, this.performanceOverlayEnabled = false, this.repaintRainbowEnabled = false, this.timeDilation = 1.0, this.debugModeBannerEnabled = true, this.paintBaselinesEnabled = false;
    }
    enableServiceExtension(id) {
        this.enabledServiceExtensions.push(id);
        vs.commands.executeCommand("setContext", `${extension_1.SERVICE_EXTENSION_CONTEXT_PREFIX}${id}`, true);
    }
    disableAllServiceExtensions() {
        for (const id of this.enabledServiceExtensions) {
            vs.commands.executeCommand("setContext", `${extension_1.SERVICE_EXTENSION_CONTEXT_PREFIX}${id}`, undefined);
        }
        this.enabledServiceExtensions.length = 0;
    }
}
exports.DebugCommands = DebugCommands;
//# sourceMappingURL=debug.js.map