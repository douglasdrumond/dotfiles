"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const utils_1 = require("./utils");
class PackageMap {
    constructor(file) {
        this.map = {};
        if (!file)
            return;
        const lines = fs.readFileSync(file, { encoding: "utf8" }).split("\n");
        for (let line of lines) {
            line = line.trim();
            if (line.length === 0 || line.startsWith("#"))
                continue;
            const index = line.indexOf(":");
            if (index !== -1) {
                const name = line.substr(0, index);
                const rest = line.substring(index + 1);
                if (rest.startsWith("file:"))
                    this.map[name] = utils_1.uriToFilePath(rest);
                else {
                    this.map[name] = path.join(path.dirname(file), rest);
                    if (rest === "lib" || rest === "lib\\" || rest === "lib/")
                        this.localPackageName = name;
                }
            }
        }
    }
    static findPackagesFile(entryPoint) {
        return utils_1.findFile(".packages", path.dirname(entryPoint));
    }
    getPackagePath(name) {
        return this.map[name];
    }
    resolvePackageUri(uri) {
        if (!uri)
            return null;
        let name = uri;
        if (name.startsWith("package:"))
            name = name.substring(8);
        const index = name.indexOf("/");
        if (index === -1)
            return null;
        const rest = name.substring(index + 1);
        name = name.substring(0, index);
        const location = this.getPackagePath(name);
        if (location)
            return path.join(location, rest);
        else
            return null;
    }
    convertFileToPackageUri(file, allowSelf = true) {
        for (const name of Object.keys(this.map)) {
            const dir = this.map[name];
            if (utils_1.isWithinPath(file, dir)) {
                if (!allowSelf && name === this.localPackageName)
                    return undefined;
                let rest = file.substring(dir.length);
                // package: uri should always use forward slashes.
                if (utils_1.isWin)
                    rest = rest.replace(/\\/g, "/");
                // Ensure we don't start with a slash if the map didn't have a trailing slash,
                // else we'll end up with doubles. See https://github.com/Dart-Code/Dart-Code/issues/398
                if (rest.startsWith("/"))
                    rest = rest.substr(1);
                return `package:${name}/${rest}`;
            }
        }
        return null;
    }
}
exports.PackageMap = PackageMap;
//# sourceMappingURL=package_map.js.map