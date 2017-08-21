"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers = require("./../../helpers");
const path = require("path");
const fs = require("fs");
exports.enableBlueFolderIcons = () => {
    return insertBlueFolderIcons().then(helpers.promptToReload);
};
/** Add blue folder icons to the json file */
const insertBlueFolderIcons = () => {
    const iconJSONPath = path.join(helpers.getExtensionPath(), 'out', 'src', 'material-icons.json');
    return helpers.getMaterialIconsJSON().then(config => {
        fs.writeFileSync(iconJSONPath, JSON.stringify(exports.createConfigWithBlueFoldersIcons(config), null, 2));
    });
};
/** Create new config with blue folder icons */
exports.createConfigWithBlueFoldersIcons = (config) => {
    return Object.assign({}, config, { folder: "_folder_blue", folderExpanded: "_folder_blue_open", folderNames: {}, folderNamesExpanded: {} });
};
//# sourceMappingURL=folders-blue.js.map