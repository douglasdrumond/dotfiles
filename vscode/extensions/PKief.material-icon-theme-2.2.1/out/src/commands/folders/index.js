"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const helpers = require("./../../helpers");
const i18n = require("./../../i18n");
const FolderType_enum_1 = require("./../../models/FolderType.enum");
/** Command to toggle the folder icons. */
exports.toggleFolderIcons = () => {
    return exports.checkFolderIconsStatus()
        .then(showQuickPickItems)
        .then(handleQuickPickActions)
        .catch(err => console.log(err));
};
/** Show QuickPick items to select prefered configuration for the folder icons. */
const showQuickPickItems = folderType => {
    const optionDefault = {
        description: i18n.translate('folders.specific.name'),
        detail: i18n.translate('folders.specific.description'),
        label: folderType === FolderType_enum_1.FolderType.Specific ? "\u2714" : "\u25FB"
    };
    const optionClassic = {
        description: i18n.translate('folders.classic.name'),
        detail: i18n.translate('folders.classic.description'),
        label: folderType === FolderType_enum_1.FolderType.Classic ? "\u2714" : "\u25FB"
    };
    const optionBlue = {
        description: i18n.translate('folders.blue.name'),
        detail: i18n.translate('folders.blue.description'),
        label: folderType === FolderType_enum_1.FolderType.Blue ? "\u2714" : "\u25FB"
    };
    const optionNone = {
        description: i18n.translate('folders.none.name'),
        detail: i18n.translate('folders.none.description'),
        label: folderType === FolderType_enum_1.FolderType.None ? "\u2714" : "\u25FB"
    };
    return vscode.window.showQuickPick([optionDefault, optionClassic, optionBlue, optionNone], {
        placeHolder: i18n.translate('folders.toggleIcons'),
        ignoreFocusOut: false
    });
};
/** Handle the actions from the QuickPick. */
const handleQuickPickActions = value => {
    if (!value || !value.description)
        return;
    switch (value.description) {
        case i18n.translate('folders.specific.name'): {
            helpers.setThemeConfig('folders.icons', FolderType_enum_1.FolderType.Specific, true);
            break;
        }
        case i18n.translate('folders.classic.name'): {
            helpers.setThemeConfig('folders.icons', FolderType_enum_1.FolderType.Classic, true);
            break;
        }
        case i18n.translate('folders.blue.name'): {
            helpers.setThemeConfig('folders.icons', FolderType_enum_1.FolderType.Blue, true);
            break;
        }
        case i18n.translate('folders.none.name'): {
            helpers.setThemeConfig('folders.icons', FolderType_enum_1.FolderType.None, true);
            break;
        }
        default:
            break;
    }
};
/** Are the folder icons enabled? */
exports.checkFolderIconsStatus = () => {
    return helpers.getMaterialIconsJSON().then((config) => {
        if (config.folder === '' && config.folderExpanded === '') {
            return FolderType_enum_1.FolderType.None;
        }
        else if (config.folderNames && Object.keys(config.folderNames).length > 0) {
            return FolderType_enum_1.FolderType.Specific;
        }
        else if (config.folder === '_folder_blue') {
            return FolderType_enum_1.FolderType.Blue;
        }
        else {
            return FolderType_enum_1.FolderType.Classic;
        }
    });
};
//# sourceMappingURL=index.js.map