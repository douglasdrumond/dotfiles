"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../icons/index");
const objects_1 = require("./objects");
const _1 = require(".");
/** Compare the workspace and the user configurations with the current setup of the icons. */
exports.detectConfigChanges = () => {
    const configs = Object.keys(_1.getExtensionConfiguration())
        .map(c => c.split('.').slice(1).join('.'));
    return compareConfigs(configs).then(changes => {
        // if there's nothing to update
        if (!changes)
            return;
        // update icon json file with new options
        return index_1.createIconFile(changes).then(() => {
            _1.promptToReload();
        }).catch(err => {
            console.error(err);
        });
    });
};
/**
 * Compares a specific configuration in the settings with a current configuration state.
 * The current configuration state is read from the icons json file.
 * @param configs List of configuration names
 * @returns List of configurations that needs to be updated.
 */
const compareConfigs = (configs) => {
    let updateRequired = false;
    return _1.getMaterialIconsJSON().then(json => {
        configs.forEach(configName => {
            const configValue = _1.getThemeConfig(configName).globalValue;
            const currentState = objects_1.getObjectPropertyValue(json.options, configName);
            if (configValue !== undefined && JSON.stringify(configValue) !== JSON.stringify(currentState)) {
                objects_1.setObjectPropertyValue(json.options, configName, configValue);
                updateRequired = true;
            }
        });
        return updateRequired ? json.options : undefined;
    });
};
//# sourceMappingURL=change-detection.js.map