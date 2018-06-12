"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const vs = require("vscode");
const config_1 = require("../config");
const utils_1 = require("../utils");
const utils_2 = require("./utils");
class SdkManager {
    constructor(sdks) {
        this.sdks = sdks;
    }
    changeSdk() {
        if (this.sdkPaths)
            this.searchForSdks(this.sdkPaths);
        else
            vs.window.showWarningMessage("Set `${configName}` to enable fast SDK switching.");
    }
    searchForSdks(sdkPaths) {
        let allPaths = [];
        sdkPaths.filter(fs.existsSync).forEach((sdkPath) => {
            allPaths.push(sdkPath);
            allPaths = allPaths.concat(fs.readdirSync(sdkPath).map((p) => path.join(sdkPath, p)));
        });
        // Add in the current path if it's not there.
        if (allPaths.indexOf(this.currentSdk) === -1)
            allPaths.push(this.currentSdk);
        const sdkFolders = allPaths
            .filter((f) => fs.statSync(f).isDirectory()) // Only directories.
            .filter((f) => fs.existsSync(path.join(f, this.executablePath))); // Only those that look like SDKs.
        const sdkItems = sdkFolders.map((f) => {
            // Resolve synlinks so we look in correct folder for version file.
            const actualBinary = fs.realpathSync(path.join(f, this.executablePath));
            // Then we need to take the executable name and /bin back off
            const actualFolder = path.dirname(path.dirname(actualBinary));
            const version = utils_1.getSdkVersion(actualFolder);
            return {
                description: f,
                detail: f === this.currentSdk && this.configuredSdk ? "Current setting" : "",
                folder: f,
                label: this.getLabel(version),
                version,
            };
        })
            .sort((a, b) => utils_1.versionIsAtLeast(a.version, b.version) ? 1 : -1);
        if (sdkItems.length === 0)
            return;
        const items = [{
                description: !this.configuredSdk ? `Found at ${this.currentSdk}` : undefined,
                detail: !this.configuredSdk ? "Current setting" : "",
                folder: undefined,
                label: "Auto-detect SDK location",
            }].concat(sdkItems);
        vs.window.showQuickPick(items, { placeHolder: "Select an SDK to use" })
            .then((sdk) => { if (sdk)
            this.setSdk(sdk.folder); });
    }
}
class DartSdkManager extends SdkManager {
    get sdkPaths() { return config_1.config.sdkPaths; }
    get currentSdk() { return this.sdks.dart; }
    get configuredSdk() { return config_1.config.sdkPath; }
    get configName() { return "dart.sdkPaths"; }
    get executablePath() { return utils_2.dartVMPath; }
    getLabel(version) {
        return `Dart SDK ${version}`;
    }
    setSdk(folder) { config_1.config.setSdkPath(folder); }
}
exports.DartSdkManager = DartSdkManager;
class FlutterSdkManager extends SdkManager {
    get sdkPaths() { return config_1.config.flutterSdkPaths; }
    get currentSdk() { return this.sdks.flutter; }
    get configuredSdk() { return config_1.config.flutterSdkPath; }
    get configName() { return "dart.flutterSdkPaths"; }
    get executablePath() { return utils_2.flutterPath; }
    getLabel(version) {
        return `Flutter SDK ${version}`;
    }
    setSdk(folder) { config_1.config.setFlutterSdkPath(folder); }
}
exports.FlutterSdkManager = FlutterSdkManager;
//# sourceMappingURL=sdk_manager.js.map