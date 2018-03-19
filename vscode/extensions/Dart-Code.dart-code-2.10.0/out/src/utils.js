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
const path = require("path");
const fs = require("fs");
const os = require("os");
const https = require("https");
const vscode_1 = require("vscode");
const config_1 = require("./config");
const utils_1 = require("./debug/utils");
const semver = require("semver");
const isWin = /^win/.test(process.platform);
const dartExecutableName = isWin ? "dart.exe" : "dart";
const pubExecutableName = isWin ? "pub.bat" : "pub";
const flutterExecutableName = isWin ? "flutter.bat" : "flutter";
exports.dartVMPath = "bin/" + dartExecutableName;
exports.dartPubPath = "bin/" + pubExecutableName;
exports.analyzerPath = "bin/snapshots/analysis_server.dart.snapshot";
exports.flutterPath = "bin/" + flutterExecutableName;
exports.extensionVersion = getExtensionVersion();
exports.isDevelopment = checkIsDevelopment();
exports.FLUTTER_CREATE_PROJECT_TRIGGER_FILE = "dart_code_flutter_create.dart";
exports.DART_DOWNLOAD_URL = "https://www.dartlang.org/install";
exports.FLUTTER_DOWNLOAD_URL = "https://flutter.io/setup/";
function isFlutterProject(folder) {
    return isDartWorkspaceFolder(folder) && referencesFlutterSdk(folder.uri.fsPath);
}
exports.isFlutterProject = isFlutterProject;
function referencesFlutterSdk(folder) {
    if (folder && fs.existsSync(path.join(folder, "pubspec.yaml"))) {
        const regex = new RegExp("sdk\\s*:\\s*flutter", "i");
        return regex.test(fs.readFileSync(path.join(folder, "pubspec.yaml")).toString());
    }
    return false;
}
function searchPaths(searchPaths, filter, executableName) {
    let sdkPath = searchPaths
        .filter((p) => p)
        .map(resolveHomePath)
        .map((p) => path.basename(p) !== "bin" ? path.join(p, "bin") : p) // Ensure /bin on end.
        .find(filter);
    // In order to handle symlinks on the binary (not folder), we need to add the executableName and then realpath.
    sdkPath = sdkPath && fs.realpathSync(path.join(sdkPath, executableName));
    // Then we need to take the executable name and /bin back off
    sdkPath = sdkPath && path.dirname(path.dirname(sdkPath));
    return sdkPath;
}
exports.searchPaths = searchPaths;
function findSdks() {
    const folders = getDartWorkspaceFolders()
        .map((w) => w.uri.fsPath);
    const pathOverride = process.env.DART_PATH_OVERRIDE || "";
    const normalPath = process.env.PATH || "";
    const paths = (pathOverride + path.delimiter + normalPath).split(path.delimiter);
    const platformName = isWin ? "win" : process.platform === "darwin" ? "mac" : "linux";
    let fuchsiaRoot;
    let flutterProject;
    // Keep track of whether we have Fuchsia projects that are not "vanilla Flutter" because
    // if not we will set project type to Flutter to allow daemon to run (and debugging support).
    let hasFuchsiaProjectThatIsNotVanillaFlutter;
    folders.forEach((folder) => {
        fuchsiaRoot = fuchsiaRoot || findFuchsiaRoot(folder);
        flutterProject = flutterProject
            || (referencesFlutterSdk(folder) ? folder : null)
            || (fs.existsSync(path.join(folder, exports.FLUTTER_CREATE_PROJECT_TRIGGER_FILE)) ? folder : null);
        hasFuchsiaProjectThatIsNotVanillaFlutter = hasFuchsiaProjectThatIsNotVanillaFlutter || !referencesFlutterSdk(folder);
    });
    const flutterSdkSearchPaths = [
        config_1.config.flutterSdkPath,
        fuchsiaRoot && path.join(fuchsiaRoot, "lib/flutter"),
        fuchsiaRoot && path.join(fuchsiaRoot, "third_party/dart-pkg/git/flutter"),
        flutterProject,
        flutterProject && extractFlutterSdkPathFromPackagesFile(path.join(flutterProject, ".packages")),
        process.env.FLUTTER_ROOT,
    ].concat(paths);
    const flutterSdkPath = searchPaths(flutterSdkSearchPaths, hasFlutterExecutable, flutterExecutableName);
    const dartSdkSearchPaths = [
        config_1.config.userDefinedSdkPath,
        fuchsiaRoot && path.join(fuchsiaRoot, "third_party/dart/tools/sdks", platformName, "dart-sdk"),
        fuchsiaRoot && path.join(fuchsiaRoot, "dart/tools/sdks", platformName, "dart-sdk"),
        flutterProject && flutterSdkPath && path.join(flutterSdkPath, "bin/cache/dart-sdk"),
    ].concat(paths)
        .concat([flutterSdkPath && path.join(flutterSdkPath, "bin/cache/dart-sdk")]);
    const dartSdkPath = searchPaths(dartSdkSearchPaths, exports.hasDartExecutable, dartExecutableName);
    return {
        dart: dartSdkPath,
        flutter: flutterSdkPath,
        fuchsia: fuchsiaRoot,
        projectType: fuchsiaRoot && hasFuchsiaProjectThatIsNotVanillaFlutter ? ProjectType.Fuchsia : flutterProject ? ProjectType.Flutter : ProjectType.Dart,
    };
}
exports.findSdks = findSdks;
function extractFlutterSdkPathFromPackagesFile(file) {
    if (!fs.existsSync(file))
        return null;
    let path = new utils_1.PackageMap(file).getPackagePath("flutter");
    if (!path)
        return null;
    // Set windows slashes to / while manipulating.
    if (isWin) {
        path = path.replace(/\\/g, "/");
    }
    // Trim suffix we don't need.
    const pathSuffix = "/packages/flutter/lib/";
    if (path.endsWith(pathSuffix)) {
        path = path.substr(0, path.length - pathSuffix.length);
    }
    // Make sure ends with a slash.
    if (!path.endsWith("/"))
        path = path + "/";
    // Append bin if required.
    if (!path.endsWith("/bin/")) {
        path = path + "bin/";
    }
    // Set windows paths back.
    if (isWin) {
        path = path.replace(/\//g, "\\");
        if (path[0] === "\\")
            path = path.substring(1);
    }
    return path;
}
function findFuchsiaRoot(folder) {
    if (folder) {
        // Walk up the directories from the workspace root, and see if there
        // exists a directory which has ".jiri_root" directory as a child.
        // If such directory is found, that is our fuchsia root.
        let dir = folder;
        while (dir != null) {
            try {
                if (fs.statSync(path.join(dir, ".jiri_root")).isDirectory()) {
                    return dir;
                }
            }
            catch (_a) { }
            const parentDir = path.dirname(dir);
            if (dir === parentDir)
                break;
            dir = parentDir;
        }
    }
    return null;
}
function getDartWorkspaceFolders() {
    if (!vscode_1.workspace.workspaceFolders)
        return [];
    return vscode_1.workspace.workspaceFolders.filter(isDartWorkspaceFolder);
}
exports.getDartWorkspaceFolders = getDartWorkspaceFolders;
function isDartWorkspaceFolder(folder) {
    if (!folder || folder.uri.scheme !== "file")
        return false;
    // TODO: Filter to only Dart projects.
    return true;
}
exports.isDartWorkspaceFolder = isDartWorkspaceFolder;
exports.hasDartExecutable = (pathToTest) => hasExecutable(pathToTest, dartExecutableName);
const hasFlutterExecutable = (pathToTest) => hasExecutable(pathToTest, flutterExecutableName);
function hasExecutable(pathToTest, executableName) {
    return fs.existsSync(path.join(pathToTest, executableName));
}
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
function toRange(location) {
    const startPos = toPosition(location);
    return new vscode_1.Range(startPos, startPos.translate(0, location.length));
}
exports.toRange = toRange;
function getDartSdkVersion(sdkRoot) {
    try {
        return fs.readFileSync(path.join(sdkRoot, "version"), "utf8").trim();
    }
    catch (e) {
        return null;
    }
}
exports.getDartSdkVersion = getDartSdkVersion;
function isAnalyzable(document) {
    if (document.isUntitled || !document.fileName)
        return false;
    const analyzableLanguages = ["dart", "html"];
    const analyzableFilenames = [".analysis_options", "analysis_options.yaml"];
    return analyzableLanguages.indexOf(document.languageId) >= 0
        || analyzableFilenames.indexOf(path.basename(document.fileName)) >= 0;
}
exports.isAnalyzable = isAnalyzable;
function isAnalyzableAndInWorkspace(document) {
    if (document.isUntitled || !document.fileName)
        return false;
    return isAnalyzable(document) && isWithinWorkspace(document.fileName);
}
exports.isAnalyzableAndInWorkspace = isAnalyzableAndInWorkspace;
function isWithinWorkspace(file) {
    // TODO: Is this fixed?
    // asRelativePath returns the input if it's outside of the rootPath.
    // Edit: Doesn't actually work properly:
    //   https://github.com/Microsoft/vscode/issues/10446
    // return workspace.asRelativePath(document.fileName) != document.fileName;
    // Edit: Still doesn't work properly!
    //   https://github.com/Microsoft/vscode/issues/33709
    return !!vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.file(file));
}
exports.isWithinWorkspace = isWithinWorkspace;
function getExtensionVersion() {
    const packageJson = require("../../package.json");
    return packageJson.version;
}
function versionIsAtLeast(inputVersion, requiredVersion) {
    return semver.gte(inputVersion, requiredVersion);
}
exports.versionIsAtLeast = versionIsAtLeast;
function checkIsDevelopment() {
    return exports.extensionVersion.endsWith("-dev") || vscode_1.env.machineId === "someValue.machineId";
}
function log(message) {
    console.log(message);
}
exports.log = log;
function logError(error) {
    if (exports.isDevelopment)
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
function showFluttersDartSdkActivationFailure() {
    const reloadAction = "Reload Project";
    vscode_1.window.showErrorMessage("Could not find Dart in your Flutter SDK. " +
        "Please run 'flutter doctor' in the terminal then reload the project once all issues are resolved.", reloadAction).then((selectedItem) => {
        if (selectedItem === reloadAction)
            vscode_1.commands.executeCommand("workbench.action.reloadWindow");
    });
}
exports.showFluttersDartSdkActivationFailure = showFluttersDartSdkActivationFailure;
function showFlutterActivationFailure(runningFlutterCommand = null) {
    showSdkActivationFailure("Flutter", (paths) => searchPaths(paths, hasFlutterExecutable, flutterExecutableName), exports.FLUTTER_DOWNLOAD_URL, (p) => config_1.config.setGlobalFlutterSdkPath(p), runningFlutterCommand
        ? () => __awaiter(this, void 0, void 0, function* () {
            yield vscode_1.window.showInformationMessage(`Your SDK path has been saved. Please reload and then re-execute the "${runningFlutterCommand}" command.`, {
                isCloseAffordance: true,
                title: "Reload Window",
            });
        })
        : null);
}
exports.showFlutterActivationFailure = showFlutterActivationFailure;
function showDartActivationFailure() {
    showSdkActivationFailure("Dart", (paths) => searchPaths(paths, exports.hasDartExecutable, dartExecutableName), exports.DART_DOWNLOAD_URL, (p) => config_1.config.setGlobalDartSdkPath(p));
}
exports.showDartActivationFailure = showDartActivationFailure;
function showSdkActivationFailure(sdkType, search, downloadUrl, saveSdkPath, beforeReload = null) {
    return __awaiter(this, void 0, void 0, function* () {
        const locateAction = "Locate SDK";
        const downloadAction = "Download SDK";
        let displayMessage = `Could not find a ${sdkType} SDK. ` +
            `Please ensure ${sdkType.toLowerCase()} is installed and in your PATH (you may need to restart).`;
        while (true) {
            const selectedItem = yield vscode_1.window.showErrorMessage(displayMessage, locateAction, downloadAction);
            if (selectedItem === locateAction) {
                const selectedFolders = yield vscode_1.window.showOpenDialog({ canSelectFolders: true, openLabel: `Set ${sdkType} SDK folder` });
                if (selectedFolders && selectedFolders.length > 0) {
                    const matchingSdkFolder = search(selectedFolders.map((f) => f.fsPath));
                    if (matchingSdkFolder) {
                        saveSdkPath(matchingSdkFolder);
                        if (beforeReload)
                            yield beforeReload();
                        vscode_1.commands.executeCommand("workbench.action.reloadWindow");
                        break;
                    }
                    else {
                        displayMessage = `That folder does not appear to be a ${sdkType} SDK.`;
                    }
                }
            }
            else if (selectedItem === downloadAction) {
                openInBrowser(downloadUrl);
                break;
            }
            else {
                break;
            }
        }
    });
}
exports.showSdkActivationFailure = showSdkActivationFailure;
//# sourceMappingURL=utils.js.map