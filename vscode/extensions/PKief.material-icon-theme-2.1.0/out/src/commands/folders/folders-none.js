"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers = require("./../../helpers");
const path = require("path");
const fs = require("fs");
exports.disableFolderIcons = () => {
    return deleteFolderIcons().then(helpers.promptToReload);
};
/** Delete folder icons */
const deleteFolderIcons = () => {
    const iconJSONPath = path.join(helpers.getExtensionPath(), 'out', 'src', 'material-icons.json');
    return helpers.getMaterialIconsJSON().then(config => {
        fs.writeFileSync(iconJSONPath, JSON.stringify(exports.createConfigWithoutFolders(config), null, 2));
    });
};
/** Create new config with no folder icons */
exports.createConfigWithoutFolders = (config) => {
    return Object.assign({}, config, { folder: "", folderExpanded: "", folderNames: {}, folderNamesExpanded: {} });
};
//# sourceMappingURL=folders-none.js.map