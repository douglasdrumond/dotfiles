"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let walker = require("walker");
const path = require("path");
const fs = require("fs");
const vscode = require("vscode");
// import os = require("os");
const PathUtils_1 = require("./PathUtils");
// const homeDir = os.homedir();
const CACHE_FILE = "projects_cache_";
;
class AbstractLocator {
    constructor() {
        this.dirList = [];
        this.processDirectory = (absPath, stat) => {
            vscode.window.setStatusBarMessage(absPath, 600);
            if (this.isRepoDir(absPath)) {
                this.addToList(absPath, this.decideProjectName(absPath));
            }
        };
        this.maxDepth = -1;
        this.ignoredFolders = [];
        this.useCachedProjects = true;
        this.alreadyLocated = false;
        this.baseFolders = [];
        //
        this.ignoredFolders = vscode.workspace.getConfiguration("projectManager").get(this.getKind() + ".ignoredFolders", []);
        this.maxDepth = vscode.workspace.getConfiguration("projectManager").get(this.getKind() + ".maxDepthRecursion", -1);
        this.useCachedProjects = vscode.workspace.getConfiguration("projectManager").get("cacheProjectsBetweenSessions", true);
        this.baseFolders = vscode.workspace.getConfiguration("projectManager").get(this.getKind() + ".baseFolders");
    }
    getBaseFolders() {
        return this.baseFolders;
    }
    getPathDepth(s) {
        return s.split(path.sep).length;
    }
    isMaxDeptReached(currentDepth, initialDepth) {
        return (this.maxDepth > 0) && ((currentDepth - initialDepth) > this.maxDepth);
    }
    isFolderIgnored(folder) {
        return this.ignoredFolders.indexOf(folder) !== -1;
    }
    isAlreadyLocated() {
        return this.useCachedProjects && this.alreadyLocated;
    }
    setAlreadyLocated(al) {
        if (this.useCachedProjects) {
            this.alreadyLocated = al;
            if (this.alreadyLocated) {
                let cacheFile = this.getCacheFile();
                fs.writeFileSync(cacheFile, JSON.stringify(this.dirList, null, "\t"), { encoding: "utf8" });
            }
        }
    }
    clearDirList() {
        this.dirList = [];
    }
    initializeCfg(kind) {
        // this.ignoredFolders = vscode.workspace.getConfiguration("projectManager").get(kind + ".ignoredFolders", []);
        // this.maxDepth = vscode.workspace.getConfiguration("projectManager").get(kind + ".maxDepthRecursion", -1);
        // this.useCachedProjects = vscode.workspace.getConfiguration("projectManager").get("cacheProjectsBetweenSessions", true);
        if (!this.useCachedProjects) {
            this.clearDirList();
        }
        else {
            let cacheFile = this.getCacheFile();
            if (fs.existsSync(cacheFile)) {
                this.dirList = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
                this.setAlreadyLocated(true);
            }
        }
    }
    locateProjects(projectsDirList) {
        this.baseFolders = projectsDirList.slice();
        return new Promise((resolve, reject) => {
            if (projectsDirList.length === 0) {
                resolve([]);
                return;
            }
            this.initializeCfg(this.getKind());
            if (this.isAlreadyLocated()) {
                resolve(this.dirList);
                return;
            }
            let promises = [];
            this.clearDirList();
            projectsDirList.forEach((projectBasePath) => {
                let expandedBasePath = PathUtils_1.PathUtils.expandHomePath(projectBasePath);
                if (!fs.existsSync(expandedBasePath)) {
                    vscode.window.setStatusBarMessage("Directory " + expandedBasePath + " does not exists.", 1500);
                    return;
                }
                let depth = this.getPathDepth(expandedBasePath);
                let promise = new Promise((resolve, reject) => {
                    try {
                        walker(expandedBasePath)
                            .filterDir((dir, stat) => {
                            return !(this.isFolderIgnored(path.basename(dir)) ||
                                this.isMaxDeptReached(this.getPathDepth(dir), depth));
                        })
                            .on("dir", this.processDirectory)
                            .on("error", this.handleError)
                            .on("end", () => {
                            resolve();
                        });
                    }
                    catch (error) {
                        reject(error);
                    }
                });
                promises.push(promise);
            });
            Promise.all(promises)
                .then(() => {
                vscode.window.setStatusBarMessage("Searching folders completed", 1500);
                this.setAlreadyLocated(true);
                resolve(this.dirList);
            })
                .catch(error => { vscode.window.showErrorMessage("Error while loading projects."); });
        });
    }
    addToList(projectPath, projectName = null) {
        this.dirList.push({
            fullPath: projectPath,
            name: projectName === null ? path.basename(projectPath) : projectName
        });
        return;
    }
    handleError(err) {
        console.log("Error walker:", err);
    }
    refreshProjects(projectsDirList) {
        this.clearDirList();
        let cacheFile = this.getCacheFile();
        if (fs.existsSync(cacheFile)) {
            fs.unlinkSync(cacheFile);
        }
        this.setAlreadyLocated(false);
        if (projectsDirList) {
            this.locateProjects(projectsDirList);
        }
    }
    existsWithRootPath(rootPath) {
        // it only works if using `cache`
        this.initializeCfg(this.getKind());
        if (!this.isAlreadyLocated()) {
            return null;
        }
        let rootPathUsingHome = PathUtils_1.PathUtils.compactHomePath(rootPath).toLocaleLowerCase();
        for (let element of this.dirList) {
            if ((element.fullPath.toLocaleLowerCase() === rootPath.toLocaleLowerCase()) || (element.fullPath.toLocaleLowerCase() === rootPathUsingHome)) {
                return {
                    rootPath: element.fullPath,
                    name: element.name,
                    group: "",
                    paths: []
                };
            }
        }
    }
    getChannelPath() {
        if (vscode.env.appName.indexOf("Insiders") > 0) {
            return "Code - Insiders";
        }
        else {
            return "Code";
        }
    }
    getCacheFile() {
        let cacheFile;
        let appdata = process.env.APPDATA || (process.platform === "darwin" ? process.env.HOME + "/Library/Application Support" : "/var/local");
        let channelPath = this.getChannelPath();
        cacheFile = path.join(appdata, channelPath, "User", CACHE_FILE + this.getKind() + ".json");
        if ((process.platform === "linux") && (!fs.existsSync(cacheFile))) {
            cacheFile = path.join(PathUtils_1.homeDir, ".config/", channelPath, "User", CACHE_FILE + this.getKind() + ".json");
        }
        return cacheFile;
    }
}
exports.AbstractLocator = AbstractLocator;
//# sourceMappingURL=abstractLocator.js.map