"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vs = require("vscode");
const config_1 = require("../config");
const stdio_service_1 = require("../services/stdio_service");
const utils_1 = require("../utils");
const device_manager_1 = require("./device_manager");
class FlutterDaemon extends stdio_service_1.StdIOService {
    constructor(flutterBinPath, projectFolder) {
        super(() => config_1.config.flutterDaemonLogFile, true);
        // Subscription lists.
        this.deviceAddedSubscriptions = [];
        this.deviceRemovedSubscriptions = [];
        this.createProcess(projectFolder, flutterBinPath, ["daemon"]);
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
            utils_1.reloadExtension("The Flutter Daemon has terminated.");
            throw e;
        }
    }
    shouldHandleMessage(message) {
        // Everything in flutter is wrapped in [] so we can tell what to handle.
        return message.startsWith("[") && message.endsWith("]");
    }
    processUnhandledMessage(message) {
        const matches = FlutterDaemon.outOfDateWarning.exec(message);
        if (!matches || matches.length !== 2)
            return;
        vs.window.showWarningMessage(`Your installation of Flutter is ${matches[1]} days old. To update to the latest version, run 'flutter upgrade'.`);
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
    getEmulators() {
        return this.sendRequest("emulator.getEmulators");
    }
    launchEmulator(emulatorId) {
        return this.sendRequest("emulator.launch", { emulatorId });
    }
    // Subscription methods.
    registerForDeviceAdded(subscriber) {
        return this.subscribe(this.deviceAddedSubscriptions, subscriber);
    }
    registerForDeviceRemoved(subscriber) {
        return this.subscribe(this.deviceRemovedSubscriptions, subscriber);
    }
}
FlutterDaemon.outOfDateWarning = new RegExp("WARNING: .* Flutter is (\\d+) days old");
exports.FlutterDaemon = FlutterDaemon;
//# sourceMappingURL=flutter_daemon.js.map