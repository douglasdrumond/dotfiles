'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const i18n = require("./i18n");
const commands = require("./commands");
const start_1 = require("./messages/start");
const change_detection_1 = require("./helpers/change-detection");
const versioning_1 = require("./helpers/versioning");
/**
 * This method is called when the extension is activated.
 * It initializes the core functionality of the extension.
 */
exports.activate = (context) => {
    // Load the translations
    i18n.initTranslations().then(() => {
        start_1.showStartMessages(versioning_1.checkThemeStatus(context.globalState));
    }).catch(err => console.error(err));
    // Add commands to the editor
    context.subscriptions.push(...commands.commands);
    // Initially trigger the config change detection
    change_detection_1.detectConfigChanges().catch(e => {
        console.error(e);
    });
    // Observe changes in the config
    vscode.workspace.onDidChangeConfiguration(change_detection_1.detectConfigChanges);
};
/** This method is called when the extension is deactivated */
exports.deactivate = () => {
};
//# sourceMappingURL=extension.js.map