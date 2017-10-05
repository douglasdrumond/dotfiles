'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const i18n = require("./i18n");
const commands = require("./commands");
const start_1 = require("./messages/start");
const change_detection_1 = require("./helpers/change-detection");
const versioning_1 = require("./helpers/versioning");
/** If the icons theme gets activated by starting the editor this function will be executed. */
exports.activate = (context) => {
    // show start messages after the translations are initialized
    i18n.initTranslations().then(() => {
        start_1.showStartMessages(versioning_1.checkThemeStatus(context.globalState));
    }).catch(err => console.log(err));
    // load the commands
    context.subscriptions.push(...commands.commands);
    change_detection_1.configChangeDetection();
    change_detection_1.watchForConfigChanges();
};
/** This method is called when your extension is deactivated */
exports.deactivate = () => {
};
//# sourceMappingURL=extension.js.map