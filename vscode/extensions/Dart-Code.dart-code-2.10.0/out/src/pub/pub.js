"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const vscode_1 = require("vscode");
function isPubGetProbablyRequired(ws) {
    const folder = ws.uri.fsPath;
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
    const label = "Fetch packages";
    vscode_1.window.showInformationMessage("Some packages are missing or out of date, would you like to fetch them now?", label).then((clickedButton) => {
        if (clickedButton === label)
            fetchPackages(folders);
    });
}
exports.promptToRunPubGet = promptToRunPubGet;
function fetchPackages(folders) {
    let task = vscode_1.commands.executeCommand("dart.fetchPackages", folders[0].uri);
    for (let i = 1; i < folders.length; i++) {
        task = task.then((code) => {
            if (code === 0)
                return vscode_1.commands.executeCommand("dart.fetchPackages", folders[i].uri);
        });
    }
}
//# sourceMappingURL=pub.js.map