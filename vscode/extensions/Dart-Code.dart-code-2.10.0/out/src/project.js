"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const util = require("./utils");
function locateBestProjectRoot(folder) {
    if (!folder || !util.isWithinWorkspace(folder))
        return null;
    let dir = folder;
    while (dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, "pubspec.yaml")))
            return dir;
        dir = path.dirname(dir);
    }
    return null;
}
exports.locateBestProjectRoot = locateBestProjectRoot;
//# sourceMappingURL=project.js.map