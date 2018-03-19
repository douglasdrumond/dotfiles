"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../config");
const device_manager_1 = require("./device_manager");
const stdio_service_1 = require("../services/stdio_service");
const vs = require("vscode");
const utils_1 = require("../debug/utils");
class FlutterDaemon extends stdio_service_1.StdIOService {
    constructor(flutterBinPath, projectFolder) {
        super(config_1.config.flutterDaemonLogFile, true);
        // Subscription lists.
        this.deviceAddedSubscriptions = [];
        this.deviceRemovedSubscriptions = [];
        this.createProcess(projectFolder, flutterBinPath, ["daemon"], utils_1.flutterEnv);
        this.deviceManager = new device_manager_1.FlutterDeviceManager(this);
        // Enable device polling.
        this.deviceEnable();
    }
    dispose() {
        this.deviceManager.dispose();
        super.dispose();
    }
    sendMessage(json) {
        try {
            super.sendMessage(json);
        }
        catch (e) {
            const reloadAction = "Reload Project";
            vs.window.showErrorMessage(`The Flutter Daemon has terminated. Save your changes then reload the project to resume.`, reloadAction).then((res) => {
                if (res === reloadAction)
                    vs.commands.executeCommand("workbench.action.reloadWindow");
            });
            throw e;
        }
    }
    shouldHandleMessage(message) {
        // Everything in flutter is wrapped in [] so we can tell what to handle.
        return message.startsWith("[") && message.endsWith("]");
    }
    // TODO: Can we code-gen all this like the analysis server?
    handleNotification(evt) {
        switch (evt.event) {
            case "device.added":
                this.notify(this.deviceAddedSubscriptions, evt.params);
                break;
            case "device.removed":
                this.notify(this.deviceRemovedSubscriptions, evt.params);
                break;
        }
    }
    // Request methods.
    deviceEnable() {
        return this.sendRequest("device.enable");
    }
    // Subscription methods.
    registerForDeviceAdded(subscriber) {
        return this.subscribe(this.deviceAddedSubscriptions, subscriber);
    }
    registerForDeviceRemoved(subscriber) {
        return this.subscribe(this.deviceRemovedSubscriptions, subscriber);
    }
}
exports.FlutterDaemon = FlutterDaemon;
//# sourceMappingURL=flutter_daemon.js.map