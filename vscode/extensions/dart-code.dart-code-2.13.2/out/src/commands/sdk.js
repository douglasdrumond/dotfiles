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
const os = require("os");
const path = require("path");
const vs = require("vscode");
const vscode_1 = require("vscode");
const config_1 = require("../config");
const utils_1 = require("../debug/utils");
const project_1 = require("../project");
const dart_hover_provider_1 = require("../providers/dart_hover_provider");
const sdk_manager_1 = require("../sdk/sdk_manager");
const utils_2 = require("../sdk/utils");
const util = require("../utils");
const utils_3 = require("../utils");
const channels = require("./channels");
const flutterNameRegex = new RegExp("^[a-z][a-z0-9_]*$");
class SdkCommands {
    constructor(context, sdks, analytics) {
        // A map of any in-progress commands so we can terminate them if we want to run another.
        this.runningCommands = {};
        this.sdks = sdks;
        this.analytics = analytics;
        const dartSdkManager = new sdk_manager_1.DartSdkManager(sdks);
        context.subscriptions.push(vs.commands.registerCommand("dart.changeSdk", () => dartSdkManager.changeSdk()));
        if (sdks.projectType === utils_3.ProjectType.Flutter) {
            const flutterSdkManager = new sdk_manager_1.FlutterSdkManager(sdks);
            context.subscriptions.push(vs.commands.registerCommand("dart.changeFlutterSdk", () => flutterSdkManager.changeSdk()));
        }
        context.subscriptions.push(vs.commands.registerCommand("dart.getPackages", (uri) => __awaiter(this, void 0, void 0, function* () {
            if (!uri || !(uri instanceof vscode_1.Uri))
                uri = yield this.getWorkspace("Select which folder to get packages for");
            if (typeof uri === "string")
                uri = vs.Uri.file(uri);
            try {
                if (utils_3.isFlutterWorkspaceFolder(vs.workspace.getWorkspaceFolder(uri)))
                    return this.runFlutter(["packages", "get"], uri);
                else
                    return this.runPub(["get"], uri);
            }
            finally {
                // TODO: Move this to a reusable event.
                dart_hover_provider_1.DartHoverProvider.clearPackageMapCaches();
            }
        })));
        context.subscriptions.push(vs.commands.registerCommand("dart.upgradePackages", (uri) => __awaiter(this, void 0, void 0, function* () {
            if (!uri || !(uri instanceof vscode_1.Uri))
                uri = yield this.getWorkspace("Select which folder to upgrade packages in");
            if (typeof uri === "string")
                uri = vs.Uri.file(uri);
            if (utils_3.isFlutterWorkspaceFolder(vs.workspace.getWorkspaceFolder(uri)))
                return this.runFlutter(["packages", "upgrade"], uri);
            else
                return this.runPub(["upgrade"], uri);
        })));
        // Pub commands.
        context.subscriptions.push(vs.commands.registerCommand("pub.get", (selection) => {
            return vs.commands.executeCommand("dart.getPackages", selection);
        }));
        context.subscriptions.push(vs.commands.registerCommand("pub.upgrade", (selection) => {
            return vs.commands.executeCommand("dart.upgradePackages", selection);
        }));
        // Flutter commands.
        context.subscriptions.push(vs.commands.registerCommand("flutter.packages.get", (selection) => __awaiter(this, void 0, void 0, function* () {
            if (!selection)
                selection = vs.Uri.file(yield this.getWorkspace(`Select the folder to run "flutter packages get" in`, selection));
            // If we're working on the flutter repository, map this on to update-packages.
            if (selection && utils_3.fsPath(selection) === sdks.flutter) {
                return this.runFlutter(["update-packages"], selection);
            }
            try {
                return this.runFlutter(["packages", "get"], selection);
            }
            finally {
                // TODO: Move this to a reusable event.
                dart_hover_provider_1.DartHoverProvider.clearPackageMapCaches();
            }
        })));
        context.subscriptions.push(vs.commands.registerCommand("flutter.packages.upgrade", (selection) => {
            return vs.commands.executeCommand("dart.upgradePackages", selection);
        }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.doctor", (selection) => {
            if (!sdks.flutter) {
                utils_2.showFlutterActivationFailure("flutter.doctor");
                return;
            }
            const tempDir = path.join(os.tmpdir(), "dart-code-cmd-run");
            if (!fs.existsSync(tempDir))
                fs.mkdirSync(tempDir);
            return this.runFlutterInFolder(tempDir, ["doctor"], "flutter");
        }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.createProject", (_) => this.createFlutterProject()));
        // Internal command that's fired in user_prompts to actually do the creation.
        context.subscriptions.push(vs.commands.registerCommand("_flutter.create", (projectPath, projectName) => {
            projectName = projectName || path.basename(projectPath);
            const args = ["create"];
            if (config_1.config.flutterCreateOrganization) {
                args.push("--org");
                args.push(config_1.config.flutterCreateOrganization);
            }
            if (config_1.config.flutterCreateIOSLanguage) {
                args.push("--ios-language");
                args.push(config_1.config.flutterCreateIOSLanguage);
            }
            if (config_1.config.flutterCreateAndroidLanguage) {
                args.push("--android-language");
                args.push(config_1.config.flutterCreateAndroidLanguage);
            }
            args.push(projectName);
            return this.runFlutterInFolder(path.dirname(projectPath), args, projectName);
        }));
        // Hook saving pubspec to run pub.get.
        context.subscriptions.push(vs.workspace.onDidSaveTextDocument((td) => {
            if (config_1.config.for(td.uri).runPubGetOnPubspecChanges && path.basename(utils_3.fsPath(td.uri)).toLowerCase() === "pubspec.yaml")
                vs.commands.executeCommand("dart.getPackages", td.uri);
        }));
    }
    runCommandForWorkspace(handler, placeHolder, args, selection) {
        return __awaiter(this, void 0, void 0, function* () {
            const f = yield this.getWorkspace(placeHolder, selection);
            const workspacePath = utils_3.fsPath(vs.workspace.getWorkspaceFolder(vs.Uri.file(f)).uri);
            const shortPath = path.join(path.basename(f), path.relative(f, workspacePath));
            return handler(f, args, shortPath);
        });
    }
    getWorkspace(placeHolder, selection) {
        return __awaiter(this, void 0, void 0, function* () {
            let file = selection && utils_3.fsPath(selection);
            file = file || (vs.window.activeTextEditor && utils_3.fsPath(vs.window.activeTextEditor.document.uri));
            let folder = file && project_1.locateBestProjectRoot(file);
            // If there's only one folder, just use it to avoid prompting the user.
            if (!folder && vs.workspace.workspaceFolders) {
                const allowedProjects = util.getDartWorkspaceFolders();
                if (allowedProjects.length === 1)
                    folder = utils_3.fsPath(allowedProjects[0].uri);
            }
            return folder
                ? Promise.resolve(folder)
                // TODO: Can we get this filtered?
                // https://github.com/Microsoft/vscode/issues/39132
                : vs.window.showWorkspaceFolderPick({ placeHolder }).then((f) => f && util.isDartWorkspaceFolder(f) && utils_3.fsPath(f.uri)); // TODO: What if the user didn't pick anything?
        });
    }
    runFlutter(args, selection) {
        return this.runCommandForWorkspace(this.runFlutterInFolder.bind(this), `Select the folder to run "flutter ${args.join(" ")}" in`, args, selection);
    }
    runFlutterInFolder(folder, args, shortPath) {
        const binPath = path.join(this.sdks.flutter, utils_2.flutterPath);
        return this.runCommandInFolder(shortPath, "flutter", folder, binPath, utils_1.globalFlutterArgs.concat(args));
    }
    runPub(args, selection) {
        return this.runCommandForWorkspace(this.runPubInFolder.bind(this), `Select the folder to run "pub ${args.join(" ")}")}" in`, args, selection);
    }
    runPubInFolder(folder, args, shortPath) {
        const binPath = path.join(this.sdks.dart, utils_2.dartPubPath);
        args = args.concat(...config_1.config.for(vs.Uri.file(folder)).pubAdditionalArgs);
        return this.runCommandInFolder(shortPath, "pub", folder, binPath, args);
    }
    runCommandInFolder(shortPath, commandName, folder, binPath, args, isStartingBecauseOfTermination = false) {
        return vs.window.withProgress({ location: vscode_1.ProgressLocation.Notification, title: `Running ${commandName} ${args.join(" ")}` }, (progress, token) => {
            return new Promise((resolve, reject) => {
                const channelName = commandName.substr(0, 1).toUpperCase() + commandName.substr(1);
                const channel = channels.createChannel(channelName);
                channel.show(true);
                // Create an ID to use so we can look whether there's already a running process for this command to terminate/restart.
                const commandId = `${folder}|${commandName}|${args}`;
                const existingProcess = this.runningCommands[commandId];
                if (existingProcess) {
                    channel.appendLine(`${commandName} ${args.join(" ")} was already running; terminating…`);
                    // Queue up a request to re-do this when it terminates
                    // Wrap in a setTimeout to ensure all the other close handlers are processed (such as writing that the process
                    // exited) before we start up.
                    existingProcess.on("close", () => this.runCommandInFolder(shortPath, commandName, folder, binPath, args, true).then(resolve, reject));
                    existingProcess.kill();
                    this.runningCommands[commandId] = null;
                    return;
                }
                else if (!isStartingBecauseOfTermination) {
                    channel.clear();
                }
                channel.appendLine(`[${shortPath}] ${commandName} ${args.join(" ")}`);
                const process = utils_1.safeSpawn(folder, binPath, args);
                token.onCancellationRequested(() => process.kill());
                this.runningCommands[commandId] = process;
                process.on("close", (code) => {
                    // Check it's still the same process before nulling out, in case our replacement has already been inserted.
                    if (this.runningCommands[commandId] === process)
                        this.runningCommands[commandId] = null;
                });
                process.on("close", (code) => resolve(code));
                channels.runProcessInChannel(process, channel);
            });
        });
    }
    createFlutterProject() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.sdks || !this.sdks.flutter) {
                utils_2.showFlutterActivationFailure("flutter.newProject");
                return;
            }
            const name = yield vs.window.showInputBox({ prompt: "Enter a name for your new project", placeHolder: "hello_world", validateInput: this.validateFlutterProjectName });
            if (!name)
                return;
            // If already in a workspace, set the default folder to somethign nearby.
            const folders = yield vs.window.showOpenDialog({ canSelectFolders: true, openLabel: "Select a folder to create the project in" });
            if (!folders || folders.length !== 1)
                return;
            const folderUri = folders[0];
            const projectFolderUri = vscode_1.Uri.file(path.join(utils_3.fsPath(folderUri), name));
            if (fs.existsSync(utils_3.fsPath(projectFolderUri))) {
                vs.window.showErrorMessage(`A folder named ${name} already exists in ${utils_3.fsPath(folderUri)}`);
                return;
            }
            // Create the empty folder so we can open it.
            fs.mkdirSync(utils_3.fsPath(projectFolderUri));
            // Create a temp dart file to force extension to load when we open this folder.
            fs.writeFileSync(path.join(utils_3.fsPath(projectFolderUri), util.FLUTTER_CREATE_PROJECT_TRIGGER_FILE), "");
            const hasFoldersOpen = !!(vs.workspace.workspaceFolders && vs.workspace.workspaceFolders.length);
            const openInNewWindow = hasFoldersOpen;
            vs.commands.executeCommand("vscode.openFolder", projectFolderUri, openInNewWindow);
        });
    }
    validateFlutterProjectName(input) {
        if (!flutterNameRegex.test(input))
            return "Flutter project names should be all lowercase, with underscores to separate words";
        const bannedNames = ["flutter", "flutter_test"];
        if (bannedNames.indexOf(input) !== -1)
            return `You may not use ${input} as the name for a flutter project`;
    }
}
exports.SdkCommands = SdkCommands;
//# sourceMappingURL=sdk.js.map