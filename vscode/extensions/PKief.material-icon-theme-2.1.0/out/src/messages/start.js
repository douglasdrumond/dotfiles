"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers = require("./../helpers");
const cmp = require("semver-compare");
const update_1 = require("./update");
const welcome_1 = require("./welcome");
const versioning_1 = require("../helpers/versioning");
/** Initialization of the icons every time the theme get activated */
exports.showStartMessages = () => {
    // if the theme has been used before
    helpers.getUserDataSettings().then((settings) => {
        // if the theme has been updated show update message
        if (cmp(settings.version, helpers.getCurrentExtensionVersion()) === -1) {
            update_1.showUpdateMessage();
            versioning_1.updateVersionInUserDataSettings().catch((err) => {
                console.log(err);
            });
        }
    }).catch(() => {
        // no config but old version was already installed
        if (helpers.isThemeConfigured() || helpers.isThemeConfigured(true)) {
            update_1.showUpdateMessage();
        }
        else {
            welcome_1.showWelcomeMessage();
        }
        // create a config file in the user data folder
        versioning_1.initUserDataSettings().catch((err) => console.log(err));
    });
};
//# sourceMappingURL=start.js.map