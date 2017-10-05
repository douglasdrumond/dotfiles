"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const reloadMessages = require("./../messages/reload");
/** Get configuration of vs code. */
exports.getConfig = (section) => {
    return vscode.workspace.getConfiguration(section);
};
/** Update configuration of vs code. */
exports.setConfig = (section, value, global = false) => {
    return exports.getConfig().update(section, value, global);
};
exports.getThemeConfig = (section) => {
    return exports.getConfig('material-icon-theme').inspect(section);
};
/** Is a folder opened? */
exports.hasWorkspace = () => {
    return vscode.workspace.rootPath !== undefined;
};
/** Set the config of the theme. */
exports.setThemeConfig = (section, value, global = false) => {
    return exports.getConfig('material-icon-theme').update(section, value, global);
};
/**
 * Is the theme already activated in the editor configuration?
 * @param{boolean} global false by default
 */
exports.isThemeActivated = (global = false) => {
    return global ? exports.getConfig().inspect('workbench.iconTheme').globalValue === 'material-icon-theme'
        : exports.getConfig().inspect('workbench.iconTheme').workspaceValue === 'material-icon-theme';
};
/** Is the theme not visible for the user? */
exports.isThemeNotVisible = () => {
    const config = exports.getConfig().inspect('workbench.iconTheme');
    return (!exports.isThemeActivated(true) && config.workspaceValue === undefined) ||
        (!exports.isThemeActivated() && config.workspaceValue !== undefined);
};
/** Return the path of the extension in the file system. */
exports.getExtensionPath = () => path.join(__dirname, '..', '..', '..');
/** Get the configuration of the icons as JSON Object */
exports.getMaterialIconsJSON = () => {
    return new Promise((resolve, reject) => {
        const iconJSONPath = path.join(exports.getExtensionPath(), 'out', 'src', 'material-icons.json');
        fs.readFile(iconJSONPath, 'utf8', (err, data) => {
            if (data) {
                resolve(JSON.parse(data));
            }
            else {
                reject(err);
            }
        });
    });
};
/** Method for removing file extensions by extension name */
exports.removeIconExtensions = (config, fileExtensionName) => {
    const fileExtensions = config.fileExtensions;
    // iterate each key of the extensions object
    for (let propName in fileExtensions) {
        // if the extension includes the given name the key will be deleted
        if (fileExtensions[propName].includes(fileExtensionName)) {
            delete fileExtensions[propName];
        }
    }
    // return the new config object
    return Object.assign({}, config, { fileExtensions });
};
/** Reload vs code window */
exports.promptToReload = () => {
    reloadMessages.showConfirmToReloadMessage().then(result => {
        if (result)
            reloadWindow();
    });
};
const reloadWindow = () => {
    return vscode.commands.executeCommand('workbench.action.reloadWindow');
};
//# sourceMappingURL=index.js.map