"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const activate_1 = require("./activate");
const angular_1 = require("./angular");
const folders_1 = require("./folders");
const config_1 = require("./config");
// Activate theme
const activateThemeCommand = vscode.commands.registerCommand('extension.activateIcons', () => {
    activate_1.activateIconTheme();
});
// Angular
const toggleAngularIconsCommand = vscode.commands.registerCommand('extension.toggleAngularIcons', () => {
    angular_1.toggleAngularIcons();
});
// Folders
const toggleFolderIconsCommand = vscode.commands.registerCommand('extension.toggleFolderIcons', () => {
    folders_1.toggleFolderIcons();
});
// Config
const restoreDefaultConfigCommand = vscode.commands.registerCommand('extension.restoreDefaultConfig', () => {
    config_1.restoreDefaultConfig();
});
exports.commands = [
    activateThemeCommand,
    toggleAngularIconsCommand,
    toggleFolderIconsCommand,
    restoreDefaultConfigCommand
];
//# sourceMappingURL=index.js.map