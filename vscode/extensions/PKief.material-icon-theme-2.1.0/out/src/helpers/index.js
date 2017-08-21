"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const cmp = require("semver-compare");
const os = require("os");
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
exports.isThemeConfigured = (global = false) => {
    return global ? exports.getConfig().inspect('workbench.iconTheme').globalValue === 'material-icon-theme'
        : exports.getConfig().inspect('workbench.iconTheme').workspaceValue === 'material-icon-theme';
};
/** Is the theme not visible for the user? */
exports.isThemeNotVisible = () => {
    const config = exports.getConfig().inspect('workbench.iconTheme');
    return (!exports.isThemeConfigured(true) && config.workspaceValue === undefined) ||
        (!exports.isThemeConfigured() && config.workspaceValue !== undefined);
};
/** returns the current version of the icon theme */
exports.getCurrentExtensionVersion = () => {
    return vscode.extensions.getExtension('PKief.material-icon-theme').packageJSON.version;
};
/** is insider version or not */
exports.isInsiderVersion = () => {
    return vscode.env.appName.includes('Insiders');
};
/** is not supported version */
exports.isNotSupportedVersion = () => {
    return cmp(vscode.version, '1.10.0') === -1; // 2nd is bigger than the 1st one == -1
};
/** user data */
exports.getSettingsFilePath = () => {
    const codeUserDataPath = path.join(getOSspecifigAppDirPath(), exports.isInsiderVersion() ? 'Code - Insiders' : 'Code', 'User');
    return path.join(codeUserDataPath, 'material-icon-theme.json');
};
const getOSspecifigAppDirPath = () => {
    switch (process.platform) {
        case 'win32':
            return process.env.APPDATA;
        case 'darwin':
            return `${process.env.HOME}/Library/Application Support`;
        case 'linux':
            return `${os.homedir()}/.config`;
        default:
            return '/var/local/';
    }
};
/** Return the settings from the userdata */
exports.getUserDataSettings = () => {
    return new Promise((resolve, reject) => {
        fs.readFile(exports.getSettingsFilePath(), 'utf8', (err, data) => {
            if (data) {
                try {
                    resolve(JSON.parse(data));
                }
                catch (e) {
                    reject(e);
                }
            }
            else {
                reject(err);
            }
        });
    });
};
/** Update the settings in the userdata. */
exports.writeUserDataSettings = (setting) => {
    return exports.getUserDataSettings().then((data) => {
        fs.writeFileSync(exports.getSettingsFilePath(), JSON.stringify(Object.assign({}, data, setting), null, 2));
    }).catch(() => {
        fs.writeFileSync(exports.getSettingsFilePath(), JSON.stringify(Object.assign({}, setting), null, 2));
    });
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