"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const vscode_1 = require("vscode");
const utils_1 = require("../utils");
function isPubGetProbablyRequired(ws) {
    const folder = utils_1.fsPath(ws.uri);
    const pubspecPath = path.join(folder, "pubspec.yaml");
    const packagesPath = path.join(folder, ".packages");
    if (!folder || !fs.existsSync(pubspecPath))
        return false;
    // If we don't appear to have deps listed in pubspec, then no point prompting.
    const regex = new RegExp("dependencies\\s*:", "i");
    if (!regex.test(fs.readFileSync(pubspecPath).toString()))
        return false;
    // If we don't have .packages, we probably need running.
    if (!fs.existsSync(packagesPath))
        return true;
    const pubspecModified = fs.statSync(pubspecPath).mtime;
    const packagesModified = fs.statSync(packagesPath).mtime;
    return pubspecModified > packagesModified;
}
exports.isPubGetProbablyRequired = isPubGetProbablyRequired;
function promptToRunPubGet(folders) {
    const label = "Get packages";
    vscode_1.window.showInformationMessage("Some packages are missing or out of date, would you like to get them now?", label).then((clickedButton) => {
        if (clickedButton === label)
            getPackages(folders);
    });
}
exports.promptToRunPubGet = promptToRunPubGet;
function getPackages(folders) {
    let task = vscode_1.commands.executeCommand("dart.getPackages", folders[0].uri);
    for (let i = 1; i < folders.length; i++) {
        task = task.then((code) => {
            if (code === 0) // Continue with next one only if success
                return vscode_1.commands.executeCommand("dart.getPackages", folders[i].uri);
        });
    }
}
//# sourceMappingURL=pub.js.map