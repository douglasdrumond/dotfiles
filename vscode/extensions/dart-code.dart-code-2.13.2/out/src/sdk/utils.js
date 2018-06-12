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
const path = require("path");
const vscode_1 = require("vscode");
const config_1 = require("../config");
const package_map_1 = require("../debug/package_map");
const utils_1 = require("../utils");
const isWin = /^win/.test(process.platform);
const dartExecutableName = isWin ? "dart.exe" : "dart";
const pubExecutableName = isWin ? "pub.bat" : "pub";
const flutterExecutableName = isWin ? "flutter.bat" : "flutter";
exports.dartVMPath = "bin/" + dartExecutableName;
exports.dartPubPath = "bin/" + pubExecutableName;
exports.analyzerSnapshotPath = "bin/snapshots/analysis_server.dart.snapshot";
exports.flutterPath = "bin/" + flutterExecutableName;
exports.DART_DOWNLOAD_URL = "https://www.dartlang.org/install";
exports.FLUTTER_DOWNLOAD_URL = "https://flutter.io/setup/";
function handleMissingSdks(context, analytics, sdks) {
    // HACK: In order to provide a more useful message if the user was trying to fun flutter.createProject
    // we need to hook the command and force the project type to Flutter to get the correct error message.
    // This can be reverted and improved if Code adds support for providing activation context:
    //     https://github.com/Microsoft/vscode/issues/44711
    let commandToReRun;
    context.subscriptions.push(vscode_1.commands.registerCommand("flutter.createProject", (_) => {
        sdks.projectType = utils_1.ProjectType.Flutter;
        commandToReRun = "flutter.createProject";
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand("flutter.doctor", (_) => {
        sdks.projectType = utils_1.ProjectType.Flutter;
        commandToReRun = "flutter.doctor";
    }));
    // Wait a while before showing the error to allow the code above to have run.
    setTimeout(() => {
        if (sdks.projectType === utils_1.ProjectType.Flutter) {
            if (sdks.flutter && !sdks.dart) {
                showFluttersDartSdkActivationFailure();
            }
            else {
                showFlutterActivationFailure(commandToReRun);
            }
        }
        else {
            showDartActivationFailure();
        }
        analytics.logSdkDetectionFailure();
    }, 250);
    return;
}
exports.handleMissingSdks = handleMissingSdks;
function showFluttersDartSdkActivationFailure() {
    utils_1.reloadExtension("Could not find Dart in your Flutter SDK. " +
        "Please run 'flutter doctor' in the terminal then reload the project once all issues are resolved.", "Reload");
}
exports.showFluttersDartSdkActivationFailure = showFluttersDartSdkActivationFailure;
function showFlutterActivationFailure(commandToReRun = null) {
    showSdkActivationFailure("Flutter", (paths) => searchPaths(paths, exports.hasFlutterExecutable, flutterExecutableName), exports.FLUTTER_DOWNLOAD_URL, (p) => config_1.config.setGlobalFlutterSdkPath(p), commandToReRun);
}
exports.showFlutterActivationFailure = showFlutterActivationFailure;
function showDartActivationFailure() {
    showSdkActivationFailure("Dart", (paths) => searchPaths(paths, exports.hasDartExecutable, dartExecutableName), exports.DART_DOWNLOAD_URL, (p) => config_1.config.setGlobalDartSdkPath(p));
}
exports.showDartActivationFailure = showDartActivationFailure;
function showSdkActivationFailure(sdkType, search, downloadUrl, saveSdkPath, commandToReRun = null) {
    return __awaiter(this, void 0, void 0, function* () {
        const locateAction = "Locate SDK";
        const downloadAction = "Download SDK";
        let displayMessage = `Could not find a ${sdkType} SDK. ` +
            `Please ensure ${sdkType.toLowerCase()} is installed and in your PATH (you may need to restart).`;
        while (true) {
            const selectedItem = yield vscode_1.window.showErrorMessage(displayMessage, locateAction, downloadAction);
            // TODO: Refactor/reformat/comment this code - it's messy and hard to understand!
            if (selectedItem === locateAction) {
                const selectedFolders = yield vscode_1.window.showOpenDialog({ canSelectFolders: true, openLabel: `Set ${sdkType} SDK folder` });
                if (selectedFolders && selectedFolders.length > 0) {
                    const matchingSdkFolder = search(selectedFolders.map(utils_1.fsPath));
                    if (matchingSdkFolder) {
                        yield saveSdkPath(matchingSdkFolder);
                        yield utils_1.reloadExtension();
                        if (commandToReRun) {
                            vscode_1.commands.executeCommand(commandToReRun);
                        }
                        break;
                    }
                    else {
                        displayMessage = `That folder does not appear to be a ${sdkType} SDK.`;
                    }
                }
            }
            else if (selectedItem === downloadAction) {
                utils_1.openInBrowser(downloadUrl);
                break;
            }
            else {
                break;
            }
        }
    });
}
exports.showSdkActivationFailure = showSdkActivationFailure;
function findSdks() {
    const folders = utils_1.getDartWorkspaceFolders()
        .map((w) => utils_1.fsPath(w.uri));
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
            || (fs.existsSync(path.join(folder, utils_1.FLUTTER_CREATE_PROJECT_TRIGGER_FILE)) ? folder : null)
            // Special case to detect the Flutter repo root, so we always consider it a Flutter project and will use the local SDK
            || (fs.existsSync(path.join(folder, "bin/flutter")) && fs.existsSync(path.join(folder, "bin/cache/dart-sdk")) ? folder : null);
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
    const flutterSdkPath = searchPaths(flutterSdkSearchPaths, exports.hasFlutterExecutable, flutterExecutableName);
    const dartSdkSearchPaths = [
        config_1.config.sdkPath,
        fuchsiaRoot && path.join(fuchsiaRoot, "third_party/dart/tools/sdks", platformName, "dart-sdk"),
        fuchsiaRoot && path.join(fuchsiaRoot, "dart/tools/sdks", platformName, "dart-sdk"),
        flutterProject && flutterSdkPath && path.join(flutterSdkPath, "bin/cache/dart-sdk"),
    ].concat(paths)
        // The above array only has the Flutter SDK	in the search path if we KNOW it's a flutter
        // project, however this doesn't cover the activating-to-run-flutter.createProject so
        // we need to always look in the flutter SDK, but only AFTER the users PATH so that
        // we don't prioritise it over any real Dart versions.
        .concat([flutterSdkPath && path.join(flutterSdkPath, "bin/cache/dart-sdk")]);
    const dartSdkPath = searchPaths(dartSdkSearchPaths, exports.hasDartExecutable, dartExecutableName);
    return {
        dart: dartSdkPath,
        flutter: flutterSdkPath,
        fuchsia: fuchsiaRoot,
        projectType: fuchsiaRoot && hasFuchsiaProjectThatIsNotVanillaFlutter
            ? utils_1.ProjectType.Fuchsia
            : (flutterProject ? utils_1.ProjectType.Flutter : utils_1.ProjectType.Dart),
    };
}
exports.findSdks = findSdks;
function referencesFlutterSdk(folder) {
    if (folder && fs.existsSync(path.join(folder, "pubspec.yaml"))) {
        const regex = new RegExp("sdk\\s*:\\s*flutter", "i");
        return regex.test(fs.readFileSync(path.join(folder, "pubspec.yaml")).toString());
    }
    return false;
}
exports.referencesFlutterSdk = referencesFlutterSdk;
function extractFlutterSdkPathFromPackagesFile(file) {
    if (!fs.existsSync(file))
        return null;
    let packagePath = new package_map_1.PackageMap(file).getPackagePath("flutter");
    if (!packagePath)
        return null;
    // Set windows slashes to / while manipulating.
    if (isWin) {
        packagePath = packagePath.replace(/\\/g, "/");
    }
    // Trim suffix we don't need.
    const pathSuffix = "/packages/flutter/lib/";
    if (packagePath.endsWith(pathSuffix)) {
        packagePath = packagePath.substr(0, packagePath.length - pathSuffix.length);
    }
    // Make sure ends with a slash.
    if (!packagePath.endsWith("/"))
        packagePath = packagePath + "/";
    // Append bin if required.
    if (!packagePath.endsWith("/bin/")) {
        packagePath = packagePath + "bin/";
    }
    // Set windows paths back.
    if (isWin) {
        packagePath = packagePath.replace(/\//g, "\\");
        if (packagePath[0] === "\\")
            packagePath = packagePath.substring(1);
    }
    return packagePath;
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
exports.hasDartExecutable = (pathToTest) => hasExecutable(pathToTest, dartExecutableName);
exports.hasFlutterExecutable = (pathToTest) => hasExecutable(pathToTest, flutterExecutableName);
function hasExecutable(pathToTest, executableName) {
    return fs.existsSync(path.join(pathToTest, executableName));
}
function searchPaths(paths, filter, executableName) {
    let sdkPath = paths
        .filter((p) => p)
        .map(utils_1.resolveHomePath)
        .map((p) => path.basename(p) !== "bin" ? path.join(p, "bin") : p) // Ensure /bin on end.
        .find(filter);
    // In order to handle symlinks on the binary (not folder), we need to add the executableName and then realpath.
    sdkPath = sdkPath && fs.realpathSync(path.join(sdkPath, executableName));
    // Then we need to take the executable name and /bin back off
    sdkPath = sdkPath && path.dirname(path.dirname(sdkPath));
    return sdkPath;
}
exports.searchPaths = searchPaths;
//# sourceMappingURL=utils.js.map