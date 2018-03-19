"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
exports.isWin = /^win/.test(process.platform);
exports.flutterEnv = Object.create(process.env);
exports.flutterEnv.FLUTTER_HOST = "VSCode";
function uriToFilePath(uri, returnWindowsPath = exports.isWin) {
    let filePath = uri;
    if (uri.startsWith("file://"))
        filePath = decodeURI(uri.substring(7));
    else if (uri.startsWith("file:"))
        filePath = decodeURI(uri.substring(5)); // TODO: Does this case ever get hit? Will it be over-decoded?
    // Windows fixup.
    if (returnWindowsPath) {
        filePath = filePath.replace(/\//g, "\\");
        if (filePath[0] === "\\")
            filePath = filePath.substring(1);
    }
    else {
        if (filePath[0] !== "/")
            filePath = `/${filePath}`;
    }
    return filePath;
}
exports.uriToFilePath = uriToFilePath;
function findFile(file, startLocation) {
    let lastParent;
    let parent = startLocation;
    while (parent && parent.length > 1 && parent !== lastParent) {
        const packages = path.join(parent, file);
        if (fs.existsSync(packages))
            return packages;
        lastParent = parent;
        parent = path.dirname(parent);
    }
    return null;
}
function getLocalPackageName(entryPoint) {
    const pubspec = findFile("pubspec.yaml", path.dirname(entryPoint));
    if (!pubspec)
        return null;
    // TODO: This could fail if a nested "name:" property exists above the main "name:" property..
    // The proper fix is to use a proper YAML parser but none of those on npm look very appealing
    // (most have several dependencies, full issue trackers and/or are not being maintained).
    const lines = fs.readFileSync(pubspec).toString().split("\n");
    const values = lines.filter((l) => l.indexOf(":") > -1).map((l) => l.split(":"));
    const namePair = values.find((v) => v[0].trim() === "name");
    if (namePair)
        return namePair[1].trim();
    else
        return null;
}
exports.getLocalPackageName = getLocalPackageName;
function formatPathForVm(file) {
    // Handle drive letter inconsistencies.
    file = forceWindowsDriveLetterToUppercase(file);
    // Convert any Windows backslashes to forward slashes.
    file = file.replace(/\\/g, "/");
    // Remove any existing file:/(//) prefixes.
    file = file.replace(/^file:\/+/, ""); // TODO: Does this case ever get hit? Will it be over-encoded?
    // Remove any remaining leading slashes.
    file = file.replace(/^\/+/, "");
    // Ensure a single slash prefix.
    if (file.startsWith("dart:"))
        return file;
    else
        return `/${encodeURI(file)}`;
}
exports.formatPathForVm = formatPathForVm;
function forceWindowsDriveLetterToUppercase(p) {
    if (exports.isWin && path.isAbsolute(p) && p.charAt(0) === p.charAt(0).toLowerCase())
        p = p.substr(0, 1).toUpperCase() + p.substr(1);
    return p;
}
function isWithinPath(file, folder) {
    const relative = path.relative(folder, file);
    return !!relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}
exports.isWithinPath = isWithinPath;
class PromiseCompleter {
    constructor() {
        this.promise = new Promise((res, rej) => {
            this.resolve = res;
            this.reject = rej;
        });
    }
}
exports.PromiseCompleter = PromiseCompleter;
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
                    this.map[name] = uriToFilePath(rest);
                else
                    this.map[name] = path.join(path.dirname(file), rest);
            }
        }
    }
    static findPackagesFile(entryPoint) {
        return findFile(".packages", path.dirname(entryPoint));
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
    convertFileToPackageUri(file) {
        for (const name of Object.keys(this.map)) {
            const dir = this.map[name];
            if (isWithinPath(file, dir)) {
                let rest = file.substring(dir.length);
                // package: uri should always use forward slashes.
                if (exports.isWin)
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
//# sourceMappingURL=utils.js.map