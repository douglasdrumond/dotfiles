"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const vs = require("vscode");
const config_1 = require("./config");
const context_1 = require("./context");
const utils_1 = require("./utils");
function showUserPrompts(context) {
    handleNewProjects(context_1.Context.for(context));
    const versionLink = utils_1.extensionVersion.split(".").slice(0, 2).join(".").replace(".", "-");
    return ((utils_1.isDevExtension || prompt(context, `release_notes_${utils_1.extensionVersion}`, () => promptToShowReleaseNotes(utils_1.extensionVersion, versionLink)))
        && !config_1.config.closingLabels && prompt(context, "closingLabelsDisabled", promptForClosingLabelsDisabled));
}
exports.showUserPrompts = showUserPrompts;
function prompt(context, key, prompt) {
    const stateKey = `hasPrompted.${key}`;
    // Uncomment this to reset all state (useful for debugging).
    // context.globalState.update(stateKey, undefined);
    // If we've not prompted the user with this question before...
    if (context.globalState.get(stateKey) !== true) {
        // Prompt, but only record if the user responded.
        prompt().then((res) => context.globalState.update(stateKey, res), error);
        return true;
    }
    return false;
}
function promptForClosingLabelsDisabled() {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield vs.window.showInformationMessage("Please consider providing feedback about Closing Labels so it may be improved", "Open Feedback Issue on GitHub");
        if (res) {
            utils_1.openInBrowser("https://github.com/Dart-Code/Dart-Code/issues/445");
        }
        return true; // Always mark this as done; we don't want to re-prompt if the user clicks Close.
    });
}
function promptToShowReleaseNotes(versionDisplay, versionLink) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield vs.window.showInformationMessage(`Dart Code has been updated to v${versionDisplay}`, `Show Release Notes`);
        if (res) {
            utils_1.openInBrowser(`https://dartcode.org/releases/v${versionLink}/`);
        }
        return true; // Always mark this as done; we don't want to prompt the user multiple times.
    });
}
function error(err) {
    vs.window.showErrorMessage(err.message);
}
function handleNewProjects(context) {
    utils_1.getDartWorkspaceFolders().find((wf) => {
        const triggerFile = path.join(utils_1.fsPath(wf.uri), utils_1.FLUTTER_CREATE_PROJECT_TRIGGER_FILE);
        if (fs.existsSync(triggerFile)) {
            fs.unlinkSync(triggerFile);
            createFlutterProject(utils_1.fsPath(wf.uri)).then((success) => {
                if (success)
                    handleFlutterWelcome(wf);
            });
            // Bail out of find so we only do this at most once.
            return true;
        }
    });
}
function createFlutterProject(projectPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const code = yield vs.commands.executeCommand("_flutter.create", projectPath);
        return code === 0;
    });
}
function handleFlutterWelcome(workspaceFolder) {
    vs.commands.executeCommand("vscode.open", vs.Uri.file(path.join(utils_1.fsPath(workspaceFolder.uri), "lib/main.dart")));
    vs.window.showInformationMessage("Your Flutter project is ready! Connect a device and press F5 to start running.");
}
//# sourceMappingURL=user_prompts.js.map