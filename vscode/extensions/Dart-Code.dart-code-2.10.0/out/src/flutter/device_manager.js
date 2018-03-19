"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vs = require("vscode");
class FlutterDeviceManager {
    constructor(daemon) {
        this.subscriptions = [];
        this.devices = [];
        this.currentDevice = null;
        this.statusBarItem = vs.window.createStatusBarItem(vs.StatusBarAlignment.Right, 0);
        this.statusBarItem.tooltip = "Flutter";
        this.statusBarItem.show();
        this.updateStatusBar();
        this.subscriptions.push(this.statusBarItem);
        this.subscriptions.push(vs.commands.registerCommand("flutter.changeDevice", this.changeDevice.bind(this)));
        daemon.registerForDeviceAdded(this.deviceAdded.bind(this));
        daemon.registerForDeviceRemoved(this.deviceRemoved.bind(this));
    }
    dispose() {
        this.subscriptions.forEach((s) => s.dispose());
    }
    deviceAdded(dev) {
        this.devices.push(dev);
        this.currentDevice = dev;
        this.updateStatusBar();
    }
    deviceRemoved(dev) {
        this.devices = this.devices.filter((d) => d.id !== dev.id);
        if (this.currentDevice.id === dev.id)
            this.currentDevice = this.devices.length === 0 ? null : this.devices[this.devices.length - 1];
        this.updateStatusBar();
    }
    changeDevice() {
        const devices = this.devices
            .sort(this.deviceSortComparer.bind(this))
            .map((d) => ({
            description: d.platform,
            detail: d === this.currentDevice ? "Current Device" : (d.emulator ? "Emulator" : "Physical Device"),
            device: d,
            label: d.name,
        }));
        vs.window.showQuickPick(devices, { placeHolder: "Select a device to use" })
            .then((d) => { if (d) {
            this.currentDevice = d.device;
            this.updateStatusBar();
        } });
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
            this.statusBarItem.command = "flutter.changeDevice";
        }
        else {
            this.statusBarItem.tooltip = null;
            this.statusBarItem.command = null;
        }
    }
}
exports.FlutterDeviceManager = FlutterDeviceManager;
//# sourceMappingURL=device_manager.js.map