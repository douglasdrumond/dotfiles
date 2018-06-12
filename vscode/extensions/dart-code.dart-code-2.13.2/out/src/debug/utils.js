"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process = require("child_process");
const fs = require("fs");
const path = require("path");
exports.isWin = /^win/.test(process.platform);
const toolEnv = Object.create(process.env);
toolEnv.FLUTTER_HOST = "VSCode";
toolEnv.PUB_ENVIRONMENT = (toolEnv.PUB_ENVIRONMENT ? `${toolEnv.PUB_ENVIRONMENT}:` : "") + "vscode.dart-code";
exports.globalFlutterArgs = [];
if (process.env.DART_CODE_IS_TEST_RUN) {
    toolEnv.PUB_ENVIRONMENT += ".test.bot";
    exports.globalFlutterArgs.push("--suppress-analytics");
}
function safeSpawn(workingDirectory, binPath, args) {
    // Spawning processes on Windows with funny symbols in the path requires quoting. However if you quote an
    // executable with a space in its path and an argument also has a space, you have to then quote all of the
    // arguments too!
    // Tragic.
    // https://github.com/nodejs/node/issues/7367
    return child_process.spawn(`"${binPath}"`, args.map((a) => `"${a}"`), { cwd: workingDirectory, env: toolEnv, shell: true });
}
exports.safeSpawn = safeSpawn;
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
exports.findFile = findFile;
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
    if (p && exports.isWin && path.isAbsolute(p) && p.charAt(0) === p.charAt(0).toLowerCase())
        p = p.substr(0, 1).toUpperCase() + p.substr(1);
    return p;
}
exports.forceWindowsDriveLetterToUppercase = forceWindowsDriveLetterToUppercase;
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
//# sourceMappingURL=utils.js.map