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
const glob = require("glob");
const https = require("https");
const os = require("os");
const path = require("path");
const semver = require("semver");
const vscode_1 = require("vscode");
const config_1 = require("./config");
const utils_1 = require("./debug/utils");
const utils_2 = require("./sdk/utils");
exports.extensionVersion = getExtensionVersion();
exports.vsCodeVersionConstraint = getVsCodeVersionConstraint();
exports.isDevExtension = checkIsDevExtension();
exports.FLUTTER_CREATE_PROJECT_TRIGGER_FILE = "dart_code_flutter_create.dart";
function fsPath(uri) {
    if (!config_1.config.previewExperimentalWindowsDriveLetterHandling)
        return uri.fsPath; // tslint:disable-line:disallow-fspath
    // tslint:disable-next-line:disallow-fspath
    return utils_1.forceWindowsDriveLetterToUppercase(uri.fsPath);
}
exports.fsPath = fsPath;
function isFlutterWorkspaceFolder(folder) {
    return isDartWorkspaceFolder(folder) && isFlutterProjectFolder(fsPath(folder.uri));
}
exports.isFlutterWorkspaceFolder = isFlutterWorkspaceFolder;
function isFlutterProjectFolder(folder) {
    return utils_2.referencesFlutterSdk(folder);
}
exports.isFlutterProjectFolder = isFlutterProjectFolder;
function getDartWorkspaceFolders() {
    if (!vscode_1.workspace.workspaceFolders)
        return [];
    return vscode_1.workspace.workspaceFolders.filter(isDartWorkspaceFolder);
}
exports.getDartWorkspaceFolders = getDartWorkspaceFolders;
function isDartWorkspaceFolder(folder) {
    if (!folder || folder.uri.scheme !== "file")
        return false;
    // Currently we don't have good logic to know what's a Dart folder.
    // We could require a pubspec, but it's valid to just write scripts without them.
    // For now, nothing calls this that will do bad things if the folder isn't a Dart
    // project so we can review amend this in future if required.
    return true;
}
exports.isDartWorkspaceFolder = isDartWorkspaceFolder;
function resolveHomePath(p) {
    if (p == null)
        return null;
    if (p.startsWith("~/"))
        return path.join(os.homedir(), p.substr(2));
    return p;
}
exports.resolveHomePath = resolveHomePath;
function toPosition(location) {
    return new vscode_1.Position(location.startLine - 1, location.startColumn - 1);
}
exports.toPosition = toPosition;
// Translates an offset/length to a Range.
// NOTE: Does not wrap lines because it does not have access to a TextDocument to know
// where the line ends.
function toRangeOnLine(location) {
    const startPos = toPosition(location);
    return new vscode_1.Range(startPos, startPos.translate(0, location.length));
}
exports.toRangeOnLine = toRangeOnLine;
function getSdkVersion(sdkRoot) {
    if (!sdkRoot)
        return null;
    try {
        return fs
            .readFileSync(path.join(sdkRoot, "version"), "utf8")
            .trim()
            .split("\n")
            .filter((l) => l)
            .filter((l) => l.trim().substr(0, 1) !== "#")
            .join("\n")
            .trim();
    }
    catch (e) {
        return null;
    }
}
exports.getSdkVersion = getSdkVersion;
function isAnalyzable(document) {
    if (document.isUntitled || !fsPath(document.uri) || document.uri.scheme !== "file")
        return false;
    const analyzableLanguages = ["dart", "html"];
    const analyzableFilenames = [".analysis_options", "analysis_options.yaml"];
    return analyzableLanguages.indexOf(document.languageId) >= 0
        || analyzableFilenames.indexOf(path.basename(fsPath(document.uri))) >= 0;
}
exports.isAnalyzable = isAnalyzable;
function isAnalyzableAndInWorkspace(document) {
    return isAnalyzable(document) && isWithinWorkspace(fsPath(document.uri));
}
exports.isAnalyzableAndInWorkspace = isAnalyzableAndInWorkspace;
function isWithinWorkspace(file) {
    return !!vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.file(file));
}
exports.isWithinWorkspace = isWithinWorkspace;
function isTestFile(file) {
    return isInsideFolderNamed(file, "test");
}
exports.isTestFile = isTestFile;
function isInsideFolderNamed(file, folderName) {
    if (!file)
        return false;
    if (!file.toLowerCase().endsWith(".dart"))
        return false;
    const ws = vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.file(file));
    if (!ws)
        return false;
    const relPath = path.sep + path.relative(fsPath(ws.uri), file);
    // We only want to check the relative path from the workspace root so that if the whole project is inside a
    // test (etc.) folder (for ex. Dart Code's own tests) we don't falsely assume it's an end user test.
    return relPath.toLowerCase().indexOf(`${path.sep}${folderName}${path.sep}`) !== -1;
}
exports.isInsideFolderNamed = isInsideFolderNamed;
function getExtensionVersion() {
    const packageJson = require("../../package.json");
    return packageJson.version;
}
function getVsCodeVersionConstraint() {
    const packageJson = require("../../package.json");
    return packageJson.engines.vscode;
}
function versionIsAtLeast(inputVersion, requiredVersion) {
    return semver.gte(inputVersion, requiredVersion);
}
exports.versionIsAtLeast = versionIsAtLeast;
function checkIsDevExtension() {
    return exports.extensionVersion.endsWith("-dev") || vscode_1.env.machineId === "someValue.machineId";
}
function isStableSdk(sdkVersion) {
    // We'll consider empty versions as dev; stable versions will likely always
    // be shipped with valid version files.
    return !!(sdkVersion && !semver.prerelease(sdkVersion));
}
exports.isStableSdk = isStableSdk;
function logError(error) {
    if (exports.isDevExtension)
        vscode_1.window.showErrorMessage("DEBUG: " + error.message);
    console.error(error.message);
}
exports.logError = logError;
function getLatestSdkVersion() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "storage.googleapis.com",
            method: "GET",
            path: "/dart-archive/channels/stable/release/latest/VERSION",
            port: 443,
        };
        const req = https.request(options, (resp) => {
            if (resp.statusCode < 200 || resp.statusCode > 300) {
                reject({ message: `Failed to get Dart SDK Version ${resp.statusCode}: ${resp.statusMessage}` });
            }
            else {
                resp.on("data", (d) => {
                    resolve(JSON.parse(d.toString()).version);
                });
            }
        });
        req.end();
    });
}
exports.getLatestSdkVersion = getLatestSdkVersion;
function escapeRegExp(input) {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}
exports.escapeRegExp = escapeRegExp;
function openInBrowser(url) {
    vscode_1.commands.executeCommand("vscode.open", vscode_1.Uri.parse(url));
}
exports.openInBrowser = openInBrowser;
class Sdks {
}
exports.Sdks = Sdks;
var ProjectType;
(function (ProjectType) {
    ProjectType[ProjectType["Dart"] = 0] = "Dart";
    ProjectType[ProjectType["Flutter"] = 1] = "Flutter";
    ProjectType[ProjectType["Fuchsia"] = 2] = "Fuchsia";
})(ProjectType = exports.ProjectType || (exports.ProjectType = {}));
function reloadExtension(prompt, buttonText) {
    return __awaiter(this, void 0, void 0, function* () {
        const restartAction = buttonText || "Restart";
        if (!prompt || (yield vscode_1.window.showInformationMessage(prompt, restartAction)) === restartAction) {
            vscode_1.commands.executeCommand("_dart.reloadExtension");
        }
    });
}
exports.reloadExtension = reloadExtension;
function unique(items) {
    return Array.from(new Set(items));
}
exports.unique = unique;
const shouldLogTimings = false;
const start = process.hrtime();
let last = start;
function pad(str, length) {
    while (str.length < length)
        str = "0" + str;
    return str;
}
exports.logTime = (taskFinished) => {
    if (!shouldLogTimings)
        return;
    const diff = process.hrtime(start);
    console.log(`${pad((diff[0] - last[0]).toString(), 5)}.${pad((diff[1] - last[1]).toString(), 10)} ${taskFinished ? "<== " + taskFinished : ""}`);
    last = diff;
};
// Takes a path and resolves it to the real casing as it exists on the file
// system. Copied from https://stackoverflow.com/a/33139702.
function trueCasePathSync(fsPath) {
    // Normalize the path so as to resolve . and .. components.
    // !! As of Node v4.1.1, a path starting with ../ is NOT resolved relative
    // !! to the current dir, and glob.sync() below then fails.
    // !! When in doubt, resolve with fs.realPathSync() *beforehand*.
    let fsPathNormalized = path.normalize(fsPath);
    // OSX: HFS+ stores filenames in NFD (decomposed normal form) Unicode format,
    // so we must ensure that the input path is in that format first.
    if (process.platform === "darwin")
        fsPathNormalized = fsPathNormalized.normalize("NFD");
    // !! Windows: Curiously, the drive component mustn't be part of a glob,
    // !! otherwise glob.sync() will invariably match nothing.
    // !! Thus, we remove the drive component and instead pass it in as the 'cwd'
    // !! (working dir.) property below.
    const pathRoot = path.parse(fsPathNormalized).root;
    const noDrivePath = fsPathNormalized.slice(Math.max(pathRoot.length - 1, 0));
    // Perform case-insensitive globbing (on Windows, relative to the drive /
    // network share) and return the 1st match, if any.
    // Fortunately, glob() with nocase case-corrects the input even if it is
    // a *literal* path.
    return glob.sync(noDrivePath, { nocase: true, cwd: pathRoot })[0];
}
exports.trueCasePathSync = trueCasePathSync;
//# sourceMappingURL=utils.js.map