"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vs = require("vscode");
const fs = require("fs");
const path = require("path");
const utils_1 = require("../utils");
const config_1 = require("../config");
class SdkManager {
    constructor(sdks) {
        this.sdks = sdks;
    }
    changeSdk() {
        if (config_1.config.sdkPaths)
            this.searchForSdks(config_1.config.sdkPaths);
        else
            vs.window.showWarningMessage("Set `dart.sdkPaths` to enable fast SDK switching.");
    }
    searchForSdks(sdkPaths) {
        const currentSdk = this.sdks.dart;
        let allPaths = [];
        sdkPaths.filter(fs.existsSync).forEach((sdkPath) => {
            allPaths.push(sdkPath);
            allPaths = allPaths.concat(fs.readdirSync(sdkPath).map((p) => path.join(sdkPath, p)));
        });
        const sdkFolders = allPaths
            .filter((f) => fs.statSync(f).isDirectory()) // Only directories.
            .filter((f) => utils_1.hasDartExecutable(path.join(f, "bin"))); // Only those that look like Dart SDKs.
        const sdkItems = sdkFolders.map((f) => {
            const version = utils_1.getDartSdkVersion(f);
            return {
                description: f,
                detail: fs.realpathSync(f) === currentSdk && config_1.config.userDefinedSdkPath ? "Current setting" : "",
                folder: f,
                label: "Dart SDK v" + version,
                version,
            };
        })
            .sort((a, b) => utils_1.versionIsAtLeast(a.version, b.version) ? 1 : -1);
        if (sdkItems.length === 0)
            return;
        const items = [{
                description: config_1.config.userDefinedSdkPath ? undefined : `Found at ${this.sdks.dart}`,
                detail: !config_1.config.userDefinedSdkPath ? "Current setting" : "",
                folder: undefined,
                label: "Auto-detect Dart SDK location",
            }].concat(sdkItems);
        vs.window.showQuickPick(items, { placeHolder: "Select an SDK to use" })
            .then((sdk) => { if (sdk)
            config_1.config.setUserDefinedSdkPath(sdk.folder); });
    }
}
exports.SdkManager = SdkManager;
//# sourceMappingURL=sdk_manager.js.map