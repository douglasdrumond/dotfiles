"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const PathUtils_1 = require("./PathUtils");
exports.NODE_KIND = 0;
exports.NODE_PROJECT = 1;
var ProjectNodeKind;
(function (ProjectNodeKind) {
    ProjectNodeKind[ProjectNodeKind["NODE_KIND"] = 0] = "NODE_KIND";
    ProjectNodeKind[ProjectNodeKind["NODE_PROJECT"] = 1] = "NODE_PROJECT";
})(ProjectNodeKind = exports.ProjectNodeKind || (exports.ProjectNodeKind = {}));
;
;
;
let context;
class ProjectProvider {
    constructor(workspaceRoot, projectStorage, locators, ctx) {
        this.workspaceRoot = workspaceRoot;
        this.projectStorage = projectStorage;
        this.locators = locators;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        context = ctx;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        // loop !!!
        return new Promise(resolve => {
            if (element) {
                if (element.kind === ProjectNodeKind.NODE_KIND) {
                    let ll = [];
                    // sort projects by name
                    element.projects.sort((n1, n2) => {
                        if (n1.name > n2.name) {
                            return 1;
                        }
                        if (n1.name < n2.name) {
                            return -1;
                        }
                        return 0;
                    });
                    for (let bbb of element.projects) {
                        ll.push(new ProjectNode(bbb.name, vscode.TreeItemCollapsibleState.None, ProjectNodeKind.NODE_PROJECT, null, {
                            command: "projectManager.open",
                            title: "",
                            arguments: [bbb.path],
                        }));
                    }
                    resolve(ll);
                }
                else {
                    resolve([]);
                }
            }
            else {
                // ROOT
                // raw list
                let lll = [];
                // favorites
                if (this.projectStorage.length() > 0) {
                    let projectsMapped = this.projectStorage.map();
                    let projects = [];
                    for (let index = 0; index < projectsMapped.length; index++) {
                        let prj = projectsMapped[index];
                        projects.push({
                            name: prj.label,
                            path: PathUtils_1.PathUtils.expandHomePath(prj.description)
                        });
                    }
                    lll.push(new ProjectNode("Favorites", vscode.TreeItemCollapsibleState.Collapsed, ProjectNodeKind.NODE_KIND, projects));
                }
                // Locators (VSCode/Git/SVN)
                for (let locator of this.locators) {
                    let projects = [];
                    locator.initializeCfg(locator.getKind());
                    if (locator.dirList.length > 0) {
                        for (let index = 0; index < locator.dirList.length; index++) {
                            let dirinfo = locator.dirList[index];
                            projects.push({
                                name: dirinfo.name,
                                path: dirinfo.fullPath
                            });
                        }
                        lll.push(new ProjectNode(locator.getDisplayName(), vscode.TreeItemCollapsibleState.Collapsed, ProjectNodeKind.NODE_KIND, projects));
                    }
                }
                resolve(lll);
            }
        });
    }
}
exports.ProjectProvider = ProjectProvider;
class ProjectNode extends vscode.TreeItem {
    constructor(label, collapsibleState, kind, projects, command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.kind = kind;
        this.projects = projects;
        this.command = command;
        if (kind === ProjectNodeKind.NODE_KIND) {
            this.iconPath = {
                light: context.asAbsolutePath(this.getProjectIcon(label, "light")),
                dark: context.asAbsolutePath(this.getProjectIcon(label, "dark"))
            };
            this.contextValue = "ProjectNodeKind";
        }
        else {
            this.contextValue = "ProjectNodeProject";
        }
    }
    getProjectIcon(project, lightDark) {
        return "images/ico-" + project.toLowerCase() + "-" + lightDark + ".svg";
    }
}
//# sourceMappingURL=ProjectProvider.js.map