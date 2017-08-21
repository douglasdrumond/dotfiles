"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers = require("./index");
const vscode = require("vscode");
const angular_1 = require("../commands/angular");
const folders_1 = require("../commands/folders");
const folders_none_1 = require("../commands/folders/folders-none");
const folders_classic_1 = require("../commands/folders/folders-classic");
const folders_specific_1 = require("../commands/folders/folders-specific");
const folders_blue_1 = require("../commands/folders/folders-blue");
/** Watch for changes in the configurations to update the icons theme. */
exports.watchForConfigChanges = () => {
    vscode.workspace.onDidChangeConfiguration(exports.configChangeDetection);
};
/**
 * Compare the workspace and the user configurations
 * with the current setup of the icons.
*/
exports.configChangeDetection = (disposable) => {
    return compareAngularConfigs()
        .then(() => compareFolderConfigs());
};
const compareAngularConfigs = () => {
    const angularIconsConfig = helpers.getThemeConfig('angular.iconsEnabled');
    return angular_1.checkAngularIconsStatus().then(result => {
        // if the settings are different to the current material-icons.json file
        if (angularIconsConfig.globalValue !== result) {
            if (angularIconsConfig.globalValue === true) {
                angular_1.enableAngularIcons();
            }
            else if (angularIconsConfig.globalValue === false) {
                angular_1.disableAngularIcons();
            }
        }
    });
};
const compareFolderConfigs = () => {
    const folderIconsConfig = helpers.getThemeConfig('folders.icons');
    return folders_1.checkFolderIconsStatus().then(result => {
        // if the settings are different to the current material-icons.json file
        if (folderIconsConfig.globalValue !== result) {
            if (folderIconsConfig.globalValue === "none") {
                folders_none_1.disableFolderIcons();
            }
            else if (folderIconsConfig.globalValue === "classic") {
                folders_classic_1.enableClassicFolderIcons();
            }
            else if (folderIconsConfig.globalValue === "specific") {
                folders_specific_1.enableSpecificFolderIcons();
            }
            else if (folderIconsConfig.globalValue === "blue") {
                folders_blue_1.enableBlueFolderIcons();
            }
        }
    });
};
//# sourceMappingURL=change-detection.js.map