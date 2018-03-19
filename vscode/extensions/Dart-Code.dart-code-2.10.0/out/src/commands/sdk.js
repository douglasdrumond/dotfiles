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
const config_1 = require("../config");
const utils_1 = require("../utils");
const project_1 = require("../project");
const sdk_manager_1 = require("../sdk/sdk_manager");
const vscode_1 = require("vscode");
const channels = require("./channels");
const child_process = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const util = require("../utils");
const vs = require("vscode");
const flutterNameRegex = new RegExp("^[a-z][a-z0-9_]*$");
class SdkCommands {
    constructor(context, sdks, analytics) {
        // A map of any in-progress commands so we can terminate them if we want to run another.
        this.runningCommands = {};
        this.sdks = sdks;
        this.analytics = analytics;
        // SDK commands.
        const sdkManager = new sdk_manager_1.SdkManager(sdks);
        context.subscriptions.push(vs.commands.registerCommand("dart.changeSdk", () => sdkManager.changeSdk()));
        context.subscriptions.push(vs.commands.registerCommand("dart.fetchPackages", (uri) => {
            if (!uri || !(uri instanceof vscode_1.Uri))
                return;
            if (utils_1.isFlutterProject(vs.workspace.getWorkspaceFolder(uri)))
                return vs.commands.executeCommand("flutter.packages.get", uri);
            else
                return vs.commands.executeCommand("pub.get", uri);
        }));
        // Pub commands.
        context.subscriptions.push(vs.commands.registerCommand("pub.get", (selection) => {
            return this.runPub("get", selection);
        }));
        context.subscriptions.push(vs.commands.registerCommand("pub.upgrade", (selection) => {
            return this.runPub("upgrade", selection);
        }));
        // Flutter commands.
        context.subscriptions.push(vs.commands.registerCommand("flutter.packages.get", (selection) => {
            return this.runFlutter("packages get", selection);
        }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.packages.upgrade", (selection) => {
            return this.runFlutter("packages upgrade", selection);
        }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.doctor", (selection) => {
            const tempDir = path.join(os.tmpdir(), "dart-code-cmd-run");
            if (!fs.existsSync(tempDir))
                fs.mkdirSync(tempDir);
            return this.runFlutterInFolder(tempDir, "doctor", "flutter");
        }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.createProject", (_) => this.createFlutterProject()));
        // Internal command that's fired in user_prompts to actually do the creation.
        context.subscriptions.push(vs.commands.registerCommand("_flutter.create", (projectPath) => {
            const projectName = path.basename(projectPath);
            return this.runFlutterInFolder(path.dirname(projectPath), `create ${projectName}`, projectName);
        }));
        // Hook saving pubspec to run pub.get.
        context.subscriptions.push(vs.workspace.onDidSaveTextDocument((td) => {
            if (config_1.config.for(td.uri).runPubGetOnPubspecChanges && path.basename(td.fileName).toLowerCase() === "pubspec.yaml")
                vs.commands.executeCommand("dart.fetchPackages", td.uri);
        }));
    }
    runCommandForWorkspace(handler, placeHolder, command, selection) {
        let file = selection && selection.fsPath;
        file = file || (vs.window.activeTextEditor && vs.window.activeTextEditor.document.fileName);
        let folder = file && project_1.locateBestProjectRoot(file);
        // If there's only one folder, just use it to avoid prompting the user.
        if (!folder && vs.workspace.workspaceFolders) {
            // TODO: Filter to Dart or Flutter projects.
            const allowedProjects = utils_1.getDartWorkspaceFolders();
            if (allowedProjects.length === 1)
                folder = allowedProjects[0].uri.fsPath;
        }
        const folderPromise = folder
            ? Promise.resolve(folder)
            // TODO: Can we get this filtered?
            // https://github.com/Microsoft/vscode/issues/39132
            : vs.window.showWorkspaceFolderPick({ placeHolder }).then((f) => f && utils_1.isDartWorkspaceFolder(f) && f.uri.fsPath);
        return folderPromise.then((f) => {
            const workspacePath = vs.workspace.getWorkspaceFolder(vs.Uri.file(f)).uri.fsPath;
            const shortPath = path.join(path.basename(f), path.relative(f, workspacePath));
            return handler(f, command, shortPath);
        });
    }
    runFlutter(command, selection) {
        return this.runCommandForWorkspace(this.runFlutterInFolder.bind(this), `Select the folder to run "flutter ${command}" in`, command, selection);
    }
    runFlutterInFolder(folder, command, shortPath) {
        const binPath = path.join(this.sdks.flutter, utils_1.flutterPath);
        const args = command.split(" ");
        return this.runCommandInFolder(shortPath, "flutter", folder, binPath, args);
    }
    runPub(command, selection) {
        return this.runCommandForWorkspace(this.runPubInFolder.bind(this), `Select the folder to run "pub ${command}" in`, command, selection);
    }
    runPubInFolder(folder, command, shortPath) {
        const binPath = path.join(this.sdks.dart, utils_1.dartPubPath);
        const args = command.split(" ").concat(...config_1.config.for(vs.Uri.file(folder)).pubAdditionalArgs);
        return this.runCommandInFolder(shortPath, "pub", folder, binPath, args);
    }
    runCommandInFolder(shortPath, commandName, folder, binPath, args, isStartingBecauseOfTermination = false) {
        return vs.window.withProgress({ location: vscode_1.ProgressLocation.Window, title: `Running ${commandName} ${args.join(" ")}` }, (progress) => {
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
                const process = child_process.spawn(binPath, args, { cwd: folder });
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
                util.showFlutterActivationFailure();
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
            const projectFolderUri = vscode_1.Uri.file(path.join(folderUri.fsPath, name));
            if (fs.existsSync(projectFolderUri.fsPath)) {
                vs.window.showErrorMessage(`A folder named ${name} already exists in ${folderUri.fsPath}`);
                return;
            }
            // Create the empty folder so we can open it.
            fs.mkdirSync(projectFolderUri.fsPath);
            // Create a temp dart file to force extension to load when we open this folder.
            fs.writeFileSync(path.join(projectFolderUri.fsPath, util.FLUTTER_CREATE_PROJECT_TRIGGER_FILE), "");
            const hasFoldersOpen = !!(vs.workspace.workspaceFolders && vs.workspace.workspaceFolders.length);
            const openInNewWindow = hasFoldersOpen;
            vs.commands.executeCommand("vscode.openFolder", projectFolderUri, openInNewWindow);
        });
    }
    validateFlutterProjectName(input) {
        if (!flutterNameRegex.test(input))
            return "Flutter project names should be all lowercase, with underscores to separate words";
    }
}
exports.SdkCommands = SdkCommands;
//# sourceMappingURL=sdk.js.map