"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const angular_1 = require("./angular");
const reload = require("./../messages/reload");
const helpers = require("./../helpers");
const folders_specific_1 = require("./folders/folders-specific");
exports.restoreDefaultConfig = () => {
    return restore().then(() => {
        reload.showConfirmToReloadMessage().then(helpers.promptToReload);
    });
};
/** Restore all configurations to default. */
const restore = () => {
    // Angular
    return angular_1.enableAngularIcons().then(() => {
        if (helpers.getThemeConfig('angular.iconsEnabled').workspaceValue === false)
            helpers.setThemeConfig('angular.iconsEnabled', true);
        else if (helpers.getThemeConfig('angular.iconsEnabled').globalValue === false)
            helpers.setThemeConfig('angular.iconsEnabled', true, true);
    }).then(() => {
        // Folders
        return folders_specific_1.enableSpecificFolderIcons().then(() => {
            helpers.setThemeConfig('folders.icons', 'specific', true);
        });
    });
};
//# sourceMappingURL=config.js.map