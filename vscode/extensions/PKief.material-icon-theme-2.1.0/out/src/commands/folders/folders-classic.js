"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers = require("./../../helpers");
const path = require("path");
const fs = require("fs");
exports.enableClassicFolderIcons = () => {
    return insertClassicFolderIcons().then(helpers.promptToReload);
};
/** Add classic folder icons to the json file */
const insertClassicFolderIcons = () => {
    const iconJSONPath = path.join(helpers.getExtensionPath(), 'out', 'src', 'material-icons.json');
    return helpers.getMaterialIconsJSON().then(config => {
        fs.writeFileSync(iconJSONPath, JSON.stringify(exports.createConfigWithClassicFoldersIcons(config), null, 2));
    });
};
/** Create new config with classic folder icons */
exports.createConfigWithClassicFoldersIcons = (config) => {
    return Object.assign({}, config, { folder: "_folder", folderExpanded: "_folder_open", folderNames: {}, folderNamesExpanded: {} });
};
//# sourceMappingURL=folders-classic.js.map