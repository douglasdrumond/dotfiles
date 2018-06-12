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
const utils_1 = require("../utils");
class FlutterDeviceManager {
    constructor(daemon) {
        this.daemon = daemon;
        this.subscriptions = [];
        this.devices = [];
        this.currentDevice = null;
        this.statusBarItem = vs.window.createStatusBarItem(vs.StatusBarAlignment.Right, 1);
        this.statusBarItem.tooltip = "Flutter";
        this.statusBarItem.show();
        this.updateStatusBar();
        this.subscriptions.push(this.statusBarItem);
        this.subscriptions.push(vs.commands.registerCommand("flutter.selectDevice", this.showDevicePicker, this));
        this.subscriptions.push(vs.commands.registerCommand("flutter.launchEmulator", this.promptForAndLaunchEmulator, this));
        daemon.registerForDeviceAdded(this.deviceAdded.bind(this));
        daemon.registerForDeviceRemoved(this.deviceRemoved.bind(this));
    }
    dispose() {
        this.subscriptions.forEach((s) => s.dispose());
    }
    deviceAdded(dev) {
        this.devices.push(dev);
        if (this.currentDevice == null || config_1.config.flutterSelectDeviceWhenConnected) {
            this.currentDevice = dev;
        }
        this.updateStatusBar();
    }
    deviceRemoved(dev) {
        this.devices = this.devices.filter((d) => d.id !== dev.id);
        if (this.currentDevice.id === dev.id)
            this.currentDevice = this.devices.length === 0 ? null : this.devices[this.devices.length - 1];
        this.updateStatusBar();
    }
    showDevicePicker() {
        return __awaiter(this, void 0, void 0, function* () {
            const devices = this.devices
                .sort(this.deviceSortComparer.bind(this))
                .map((d) => ({
                description: d.platform,
                detail: d === this.currentDevice ? "Current Device" : (d.emulator ? "Emulator" : "Physical Device"),
                device: d,
                label: d.name,
            }));
            const d = yield vs.window.showQuickPick(devices, { placeHolder: "Select a device to use" });
            if (d) {
                this.currentDevice = d.device;
                this.updateStatusBar();
            }
        });
    }
    deviceSortComparer(d1, d2) {
        // Always consider current device to be first.
        if (d1 === this.currentDevice)
            return -1;
        if (d2 === this.currentDevice)
            return 1;
        // Otherwise, sort by name.
        return d1.name.localeCompare(d2.name);
    }
    updateStatusBar() {
        if (this.currentDevice)
            this.statusBarItem.text = `${this.currentDevice.name} (${this.currentDevice.platform}${this.currentDevice.emulator ? " Emulator" : ""})`;
        else
            this.statusBarItem.text = "No Devices";
        if (this.devices.length > 1) {
            this.statusBarItem.tooltip = `${this.devices.length} Devices Connected`;
            this.statusBarItem.command = "flutter.selectDevice";
        }
        else if (this.devices.length === 1) {
            this.statusBarItem.tooltip = null;
            this.statusBarItem.command = null;
        }
        else {
            this.statusBarItem.tooltip = null;
            this.statusBarItem.command = "flutter.launchEmulator";
        }
    }
    getEmulators() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const emus = yield this.daemon.getEmulators();
                return emus.map((e) => ({
                    id: e.id,
                    name: e.name || e.id,
                }));
            }
            catch (e) {
                utils_1.logError({ message: e });
                return [];
            }
        });
    }
    promptForAndLaunchEmulator() {
        return __awaiter(this, void 0, void 0, function* () {
            const emulators = (yield this.getEmulators())
                .map((e) => ({
                description: e.id,
                emulator: e,
                label: e.name,
            }));
            if (emulators.length === 0) {
                return false;
            }
            const cancellationTokenSource = new vs.CancellationTokenSource();
            const waitingForRealDeviceSubscription = this.daemon.registerForDeviceAdded(() => {
                cancellationTokenSource.cancel();
                waitingForRealDeviceSubscription.dispose();
            });
            const selectedEmulator = yield vs.window.showQuickPick(emulators, { placeHolder: "Connect a device or select an emulator to launch" }, cancellationTokenSource.token);
            waitingForRealDeviceSubscription.dispose();
            if (selectedEmulator) {
                return this.launchEmulator(selectedEmulator.emulator);
            }
            else {
                return !!this.currentDevice;
            }
        });
    }
    launchEmulator(emulator) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield vs.window.withProgress({
                    cancellable: false,
                    location: vs.ProgressLocation.Notification,
                    title: `Launching ${emulator.name}...`,
                }, (progress) => __awaiter(this, void 0, void 0, function* () {
                    yield this.daemon.launchEmulator(emulator.id);
                    progress.report({ message: `Waiting for ${emulator.name} to connect...` });
                    // Wait up to 60 seconds for emulator to launch.
                    for (let i = 0; i < 120; i++) {
                        yield new Promise((resolve, reject) => setTimeout(resolve, 500));
                        if (this.currentDevice)
                            return;
                    }
                    throw new Error("Emulator didn't connected within 60 seconds");
                }));
            }
            catch (e) {
                vs.window.showErrorMessage(`Failed to launch emulator: ${e}`);
                return false;
            }
            return true;
        });
    }
}
exports.FlutterDeviceManager = FlutterDeviceManager;
//# sourceMappingURL=device_manager.js.map