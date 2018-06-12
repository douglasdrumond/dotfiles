"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const util = require("./utils");
exports.UPGRADE_TO_WORKSPACE_FOLDERS = "Mark Projects as Workspace Folders";
function locateBestProjectRoot(folder) {
    if (!folder || !util.isWithinWorkspace(folder))
        return null;
    let dir = folder;
    while (dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, "pubspec.yaml")) || fs.existsSync(path.join(dir, ".packages")))
            return dir;
        dir = path.dirname(dir);
    }
    return null;
}
exports.locateBestProjectRoot = locateBestProjectRoot;
function getChildProjects(folder, levelsToGo) {
    const children = fs
        .readdirSync(folder)
        .filter((f) => f !== "bin") // Don't look in bin folders
        .filter((f) => f !== "cache") // Don't look in cache folders
        .map((f) => path.join(folder, f))
        .filter((d) => fs.statSync(d).isDirectory());
    let projects = [];
    for (const dir of children) {
        if (fs.existsSync(path.join(dir, "pubspec.yaml"))) {
            projects.push(dir);
        }
        if (levelsToGo > 0)
            projects = projects.concat(getChildProjects(dir, levelsToGo - 1));
    }
    return projects;
}
//# sourceMappingURL=project.js.map