"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers = require("./index");
/** Store the latest version number in the user data settings. */
exports.updateVersionInUserDataSettings = () => {
    const setting = {
        version: helpers.getCurrentExtensionVersion(),
    };
    return helpers.writeUserDataSettings(setting);
};
/** Initialize the user data settings. */
exports.initUserDataSettings = () => {
    const setting = {
        name: 'material-icon-theme',
        version: helpers.getCurrentExtensionVersion()
    };
    return helpers.writeUserDataSettings(setting);
};
//# sourceMappingURL=versioning.js.map