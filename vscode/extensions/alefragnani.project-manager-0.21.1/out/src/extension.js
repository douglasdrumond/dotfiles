"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const stack = require("./stack");
const gitLocator_1 = require("./gitLocator");
const PathUtils_1 = require("./PathUtils");
const ProjectProvider_1 = require("./ProjectProvider");
const sorter_1 = require("./sorter");
const storage_1 = require("./storage");
const svnLocator_1 = require("./svnLocator");
const vscodeLocator_1 = require("./vscodeLocator");
const PROJECTS_FILE = "projects.json";
;
let vscLocator = new vscodeLocator_1.VisualStudioCodeLocator();
let gitLocator = new gitLocator_1.GitLocator();
let svnLocator = new svnLocator_1.SvnLocator();
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    let recentProjects = context.globalState.get("recent", "");
    let aStack = new stack.StringStack();
    aStack.fromString(recentProjects);
    // load the projects
    let projectStorage = new storage_1.ProjectStorage(getProjectFilePath());
    // tree-view
    const projectProvider = new ProjectProvider_1.ProjectProvider(vscode.workspace.rootPath, projectStorage, [vscLocator, gitLocator, svnLocator], context);
    vscode.window.registerTreeDataProvider("projectsExplorer", projectProvider);
    vscode.commands.registerCommand("projectManager.open", (node) => {
        let uri;
        if (typeof node === "string") {
            uri = vscode.Uri.file(node);
        }
        else {
            uri = vscode.Uri.file(node.command.arguments[0]);
        }
        vscode.commands.executeCommand("vscode.openFolder", uri, false)
            .then(value => ({}), // done
        value => vscode.window.showInformationMessage("Could not open the project!"));
    });
    vscode.commands.registerCommand("projectManager.openInNewWindow", node => {
        let uri = vscode.Uri.file(node.command.arguments[0]);
        vscode.commands.executeCommand("vscode.openFolder", uri, true)
            .then(value => ({}), // done
        value => vscode.window.showInformationMessage("Could not open the project!"));
    });
    // register commands (here, because it needs to be used right below if an invalid JSON is present)
    vscode.commands.registerCommand("projectManager.saveProject", () => saveProject());
    vscode.commands.registerCommand("projectManager.refreshProjects", () => refreshProjects());
    vscode.commands.registerCommand("projectManager.editProjects", () => editProjects());
    vscode.commands.registerCommand("projectManager.listProjects", () => listProjects(false, [0 /* Projects */, 1 /* VSCode */, 2 /* Git */, 3 /* Svn */]));
    vscode.commands.registerCommand("projectManager.listProjectsNewWindow", () => listProjects(true, [0 /* Projects */, 1 /* VSCode */, 2 /* Git */, 3 /* Svn */]));
    loadProjectsFile();
    fs.watchFile(getProjectFilePath(), { interval: 100 }, (prev, next) => {
        loadProjectsFile();
        projectProvider.refresh();
    });
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(cfg => {
        refreshProjectsOnChangeConfiguration();
    }));
    let statusItem;
    showStatusBar();
    // function commands
    function showStatusBar(projectName) {
        let showStatusConfig = vscode.workspace.getConfiguration("projectManager").get("showProjectNameInStatusBar");
        let currentProjectPath = vscode.workspace.rootPath;
        if (!showStatusConfig || !currentProjectPath) {
            return;
        }
        if (!statusItem) {
            statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        }
        statusItem.text = "$(file-directory) ";
        statusItem.tooltip = currentProjectPath;
        let openInNewWindow = vscode.workspace.getConfiguration("projectManager").get("openInNewWindowWhenClickingInStatusBar", false);
        if (openInNewWindow) {
            statusItem.command = "projectManager.listProjectsNewWindow";
        }
        else {
            statusItem.command = "projectManager.listProjects";
        }
        // if we have a projectName, we don't need to search.
        if (projectName) {
            statusItem.text += projectName;
            statusItem.show();
            return;
        }
        if (projectStorage.length() === 0) {
            return;
        }
        // let foundProject: Project = projectStorage.existsWithRootPath(PathUtils.compactHomePath(currentProjectPath));
        let foundProject = projectStorage.existsWithRootPath(currentProjectPath);
        if (!foundProject) {
            foundProject = vscLocator.existsWithRootPath(currentProjectPath);
        }
        if (!foundProject) {
            foundProject = gitLocator.existsWithRootPath(currentProjectPath);
        }
        if (!foundProject) {
            foundProject = svnLocator.existsWithRootPath(currentProjectPath);
        }
        if (foundProject) {
            statusItem.text += foundProject.name;
            statusItem.show();
        }
    }
    function arraysAreEquals(array1, array2) {
        if (!array1 || !array2) {
            return false;
        }
        if (array1.length !== array2.length) {
            return false;
        }
        for (let i = 0, l = array1.length; i < l; i++) {
            if (array1[i] instanceof Array && array2[i] instanceof Array) {
                if (!array1[i].equals(array2[i])) {
                    return false;
                }
            }
            else {
                if (array1[i] !== array2[i]) {
                    return false;
                }
            }
        }
        return true;
    }
    function refreshProjectsOnChangeConfiguration() {
        let config = [];
        let refreshedSomething = false;
        config = vscode.workspace.getConfiguration("projectManager").get("vscode.baseFolders");
        if (!arraysAreEquals(vscLocator.getBaseFolders(), config)) {
            vscLocator.refreshProjects(vscode.workspace.getConfiguration("projectManager").get("vscode.baseFolders"));
            refreshedSomething = true;
        }
        config = vscode.workspace.getConfiguration("projectManager").get("git.baseFolders");
        if (!arraysAreEquals(gitLocator.getBaseFolders(), config)) {
            gitLocator.refreshProjects(vscode.workspace.getConfiguration("projectManager").get("git.baseFolders"));
            refreshedSomething = true;
        }
        config = vscode.workspace.getConfiguration("projectManager").get("svn.baseFolders");
        if (!arraysAreEquals(svnLocator.getBaseFolders(), config)) {
            svnLocator.refreshProjects(vscode.workspace.getConfiguration("projectManager").get("svn.baseFolders"));
            refreshedSomething = true;
        }
        if (refreshedSomething) {
            projectProvider.refresh();
        }
    }
    function refreshProjects() {
        vscLocator.refreshProjects(vscode.workspace.getConfiguration("projectManager").get("vscode.baseFolders"));
        gitLocator.refreshProjects(vscode.workspace.getConfiguration("projectManager").get("git.baseFolders"));
        svnLocator.refreshProjects(vscode.workspace.getConfiguration("projectManager").get("svn.baseFolders"));
        projectProvider.refresh();
        vscode.window.showInformationMessage("The projects have been refreshed!");
    }
    function editProjects() {
        if (fs.existsSync(getProjectFilePath())) {
            vscode.workspace.openTextDocument(getProjectFilePath()).then(doc => {
                vscode.window.showTextDocument(doc);
            });
        }
        else {
            let optionEditProject = {
                title: "Yes, edit manually"
            };
            vscode.window.showErrorMessage("No projects saved yet! You should open a folder and use Save Project instead. Do you really want to edit manually? ", optionEditProject).then(option => {
                // nothing selected
                if (typeof option === "undefined") {
                    return;
                }
                if (option.title === "Yes, edit manually") {
                    projectStorage.push("Project Name", "Root Path", "");
                    projectStorage.save();
                    vscode.commands.executeCommand("projectManager.editProjects");
                }
                else {
                    return;
                }
            });
        }
    }
    function saveProject() {
        // Display a message box to the user
        let wpath = vscode.workspace.rootPath;
        if (process.platform === "win32") {
            wpath = wpath.substr(wpath.lastIndexOf("\\") + 1);
        }
        else {
            wpath = wpath.substr(wpath.lastIndexOf("/") + 1);
        }
        // ask the PROJECT NAME (suggest the )
        let ibo = {
            prompt: "Project Name",
            placeHolder: "Type a name for your project",
            value: wpath
        };
        vscode.window.showInputBox(ibo).then(projectName => {
            if (typeof projectName === "undefined") {
                return;
            }
            // 'empty'
            if (projectName === "") {
                vscode.window.showWarningMessage("You must define a name for the project.");
                return;
            }
            let rootPath = PathUtils_1.PathUtils.compactHomePath(vscode.workspace.rootPath);
            if (!projectStorage.exists(projectName)) {
                aStack.push(projectName);
                context.globalState.update("recent", aStack.toString());
                projectStorage.push(projectName, rootPath, "");
                projectStorage.save();
                vscode.window.showInformationMessage("Project saved!");
                showStatusBar(projectName);
            }
            else {
                let optionUpdate = {
                    title: "Update"
                };
                let optionCancel = {
                    title: "Cancel"
                };
                vscode.window.showInformationMessage("Project already exists!", optionUpdate, optionCancel).then(option => {
                    // nothing selected
                    if (typeof option === "undefined") {
                        return;
                    }
                    if (option.title === "Update") {
                        aStack.push(projectName);
                        context.globalState.update("recent", aStack.toString());
                        projectStorage.updateRootPath(projectName, rootPath);
                        projectStorage.save();
                        vscode.window.showInformationMessage("Project saved!");
                        showStatusBar(projectName);
                        return;
                    }
                    else {
                        return;
                    }
                });
            }
        });
    }
    function sortProjectList(items) {
        let itemsToShow = PathUtils_1.PathUtils.expandHomePaths(items);
        itemsToShow = removeRootPath(itemsToShow);
        let checkInvalidPath = vscode.workspace.getConfiguration("projectManager").get("checkInvalidPathsBeforeListing", true);
        if (checkInvalidPath) {
            itemsToShow = indicateInvalidPaths(itemsToShow);
        }
        let sortList = vscode.workspace.getConfiguration("projectManager").get("sortList", "Name");
        let newItemsSorted = sorter_1.ProjectsSorter.SortItemsByCriteria(itemsToShow, sortList, aStack);
        return newItemsSorted;
    }
    function sortGroupedList(items) {
        if (vscode.workspace.getConfiguration("projectManager").get("groupList", false)) {
            return sortProjectList(items);
        }
        else {
            return items;
        }
    }
    function getProjects(itemsSorted, sources) {
        return new Promise((resolve, reject) => {
            if (sources.indexOf(0 /* Projects */) === -1) {
                resolve([]);
            }
            else {
                resolve(itemsSorted);
            }
        });
    }
    // Filters out any newDirectories entries that are present in knownDirectories.
    function filterKnownDirectories(knownDirectories, newDirectories) {
        if (knownDirectories) {
            newDirectories = newDirectories.filter(item => !knownDirectories.some(sortedItem => PathUtils_1.PathUtils.expandHomePath(sortedItem.description).toLowerCase() === PathUtils_1.PathUtils.expandHomePath(item.fullPath).toLowerCase()));
        }
        return Promise.resolve(newDirectories);
    }
    function getVSCodeProjects(itemsSorted) {
        return new Promise((resolve, reject) => {
            vscLocator.locateProjects(vscode.workspace.getConfiguration("projectManager").get("vscode.baseFolders"))
                .then(filterKnownDirectories.bind(this, itemsSorted))
                .then((dirList) => {
                let newItems = [];
                newItems = dirList.map(item => {
                    return {
                        description: item.fullPath,
                        label: "$(file-code) " + item.name
                    };
                });
                newItems = sortGroupedList(newItems);
                resolve(itemsSorted.concat(newItems));
            });
        });
    }
    function getGitProjects(itemsSorted) {
        return new Promise((resolve, reject) => {
            gitLocator.locateProjects(vscode.workspace.getConfiguration("projectManager").get("git.baseFolders"))
                .then(filterKnownDirectories.bind(this, itemsSorted))
                .then((dirList) => {
                let newItems = [];
                newItems = dirList.map(item => {
                    return {
                        label: "$(git-branch) " + item.name,
                        description: item.fullPath
                    };
                });
                newItems = sortGroupedList(newItems);
                resolve(itemsSorted.concat(newItems));
            });
        });
    }
    function getSvnProjects(itemsSorted) {
        return new Promise((resolve, reject) => {
            svnLocator.locateProjects(vscode.workspace.getConfiguration("projectManager").get("svn.baseFolders"))
                .then(filterKnownDirectories.bind(this, itemsSorted))
                .then((dirList) => {
                let newItems = [];
                newItems = dirList.map(item => {
                    return {
                        label: "$(zap) " + item.name,
                        description: item.fullPath
                    };
                });
                newItems = sortGroupedList(newItems);
                resolve(itemsSorted.concat(newItems));
            });
        });
    }
    function listProjects(forceNewWindow, sources) {
        let items = [];
        items = projectStorage.map();
        items = sortGroupedList(items);
        function onRejectListProjects(reason) {
            vscode.commands.executeCommand("setContext", "inProjectManagerList", false);
            vscode.window.showInformationMessage("Error loading projects: ${reason}");
        }
        // promisses
        function onResolve(selected) {
            vscode.commands.executeCommand("setContext", "inProjectManagerList", false);
            if (!selected) {
                return;
            }
            if (!fs.existsSync(selected.description.toString())) {
                if (selected.label.substr(0, 2) === "$(") {
                    vscode.window.showErrorMessage("Path does not exist or is unavailable.");
                    return;
                }
                let optionUpdateProject = {
                    title: "Update Project"
                };
                let optionDeleteProject = {
                    title: "Delete Project"
                };
                vscode.window.showErrorMessage("The project has an invalid path. What would you like to do?", optionUpdateProject, optionDeleteProject).then(option => {
                    // nothing selected
                    if (typeof option === "undefined") {
                        return;
                    }
                    if (option.title === "Update Project") {
                        vscode.commands.executeCommand("projectManager.editProjects");
                    }
                    else {
                        projectStorage.pop(selected.label);
                        projectStorage.save();
                        return;
                    }
                });
            }
            else {
                // project path
                let projectPath = selected.description;
                projectPath = normalizePath(projectPath);
                // update MRU
                aStack.push(selected.label);
                context.globalState.update("recent", aStack.toString());
                let uri = vscode.Uri.file(projectPath);
                vscode.commands.executeCommand("vscode.openFolder", uri, forceNewWindow)
                    .then(value => ({}), // done
                value => vscode.window.showInformationMessage("Could not open the project!"));
            }
        }
        let options = {
            matchOnDescription: false,
            matchOnDetail: false,
            placeHolder: "Loading Projects (pick one to open)"
        };
        getProjects(items, sources)
            .then((folders) => {
            // not in SET
            if (sources.indexOf(1 /* VSCode */) === -1) {
                return folders;
            }
            return getVSCodeProjects(folders);
        })
            .then((folders) => {
            if (sources.indexOf(2 /* Git */) === -1) {
                return folders;
            }
            return getGitProjects(folders);
        })
            .then((folders) => {
            if (sources.indexOf(3 /* Svn */) === -1) {
                return folders;
            }
            return getSvnProjects(folders);
        })
            .then((folders) => {
            if (folders.length === 0) {
                vscode.window.showInformationMessage("No projects saved yet!");
                return;
            }
            else {
                if (!vscode.workspace.getConfiguration("projectManager").get("groupList", false)) {
                    folders = sortProjectList(folders);
                }
                vscode.commands.executeCommand("setContext", "inProjectManagerList", true);
                vscode.window.showQuickPick(folders, options)
                    .then(onResolve, onRejectListProjects);
            }
        });
    }
    function removeRootPath(items) {
        if (!vscode.workspace.rootPath) {
            return items;
        }
        else {
            return items.filter(value => value.description.toString().toLowerCase() !== vscode.workspace.rootPath.toLowerCase());
        }
    }
    function indicateInvalidPaths(items) {
        for (let element of items) {
            if (!element.detail && (!fs.existsSync(element.description.toString()))) {
                element.detail = "$(circle-slash) Path does not exist";
            }
        }
        return items;
    }
    function normalizePath(path) {
        let normalizedPath = path;
        if (!PathUtils_1.PathUtils.pathIsUNC(normalizedPath)) {
            let replaceable = normalizedPath.split("\\");
            normalizedPath = replaceable.join("\\\\");
        }
        return normalizedPath;
    }
    function getChannelPath() {
        if (vscode.env.appName.indexOf("Insiders") > 0) {
            return "Code - Insiders";
        }
        else {
            return "Code";
        }
    }
    function loadProjectsFile() {
        let errorLoading = projectStorage.load();
        // how to handle now, since the extension starts 'at load'?
        if (errorLoading !== "") {
            let optionOpenFile = {
                title: "Open File"
            };
            vscode.window.showErrorMessage("Error loading projects.json file. Message: " + errorLoading, optionOpenFile).then(option => {
                // nothing selected
                if (typeof option === "undefined") {
                    return;
                }
                if (option.title === "Open File") {
                    vscode.commands.executeCommand("projectManager.editProjects");
                }
                else {
                    return;
                }
            });
            return null;
        }
    }
    function getProjectFilePath() {
        let projectFile;
        let projectsLocation = vscode.workspace.getConfiguration("projectManager").get("projectsLocation");
        if (projectsLocation !== "") {
            projectFile = path.join(projectsLocation, PROJECTS_FILE);
        }
        else {
            let appdata = process.env.APPDATA || (process.platform === "darwin" ? process.env.HOME + "/Library/Application Support" : "/var/local");
            let channelPath = getChannelPath();
            projectFile = path.join(appdata, channelPath, "User", PROJECTS_FILE);
            // in linux, it may not work with /var/local, then try to use /home/myuser/.config
            if ((process.platform === "linux") && (!fs.existsSync(projectFile))) {
                projectFile = path.join(PathUtils_1.homeDir, ".config/", channelPath, "User", PROJECTS_FILE);
            }
        }
        return projectFile;
    }
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map