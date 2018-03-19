"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const path = require("path");
// import fs = require("fs");
exports.homeDir = os.homedir();
exports.homePathVariable = "$home";
class PathUtils {
    /**
     * Indicates if a path is a UNC path
     *
     * @param path The path to check
     */
    static pathIsUNC(path) {
        return path.indexOf("\\\\") === 0;
    }
    /**
     * If the project path is in the user's home directory then store the home directory as a
     * parameter. This will help in situations when the user works with the same projects on
     * different machines, under different user names.
     */
    static compactHomePath(path) {
        if (path.indexOf(exports.homeDir) === 0) {
            return path.replace(exports.homeDir, exports.homePathVariable);
        }
        return path;
    }
    /**
     * Expand $home parameter from path to real os home path
     *
     * @param path The path to expand
     */
    static expandHomePath(path) {
        if (path.indexOf(exports.homePathVariable) === 0) {
            return path.replace(exports.homePathVariable, exports.homeDir);
        }
        return path;
    }
    /**
     * Expand $home parameter from path to real os home path
     *
     * @param items The array of items <QuickPickItem> to expand
     */
    static expandHomePaths(items) {
        return items.map(item => {
            item.description = this.expandHomePath(item.description);
            return item;
        });
    }
    /**
     * Update paths to use the proper path separator, based on the Host OS
     *
     * @param items The array of items <string> to update
     */
    static updateWithPathSeparator(items) {
        const newItems = [];
        for (const apath of items) {
            newItems.push(this.updateWithPathSeparatorStr(apath));
        }
        return newItems;
    }
    /**
     * Update a path to use the proper path separator, based on the Host OS
     *
     * @param item The path <string> to update
     */
    static updateWithPathSeparatorStr(item) {
        if (path.sep === "\\") {
            return item.replace(/\//g, "\\");
        }
        else {
            return item.replace(/\\/g, "/");
        }
    }
}
exports.PathUtils = PathUtils;
//# sourceMappingURL=PathUtils.js.map