"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vs = require("vscode");
const fs = require("fs");
const path = require("path");
const utils_1 = require("../debug/utils");
const DART_HIDE_PACKAGE_TREE = "dart-code:hidePackageTree";
class DartPackagesProvider extends vs.Disposable {
    constructor() {
        super(() => this.watcher.dispose());
        this.onDidChangeTreeDataEmitter = new vs.EventEmitter();
        this.onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
        this.watcher = vs.workspace.createFileSystemWatcher("**/.packages");
        this.watcher.onDidChange(this.refresh, this);
        this.watcher.onDidCreate(this.refresh, this);
        this.watcher.onDidDelete(this.refresh, this);
    }
    setWorkspaces(workspaces) {
        this.workspaceRoot = workspaces && workspaces.length === 1 ? workspaces[0].uri.fsPath : null;
        this.refresh();
    }
    refresh() {
        this.onDidChangeTreeDataEmitter.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        return new Promise((resolve) => {
            if (element) {
                if (!element.collapsibleState && !element.resourceUri) {
                    return resolve([]);
                }
                else {
                    resolve(fs.readdirSync(element.resourceUri.fsPath).map((name) => {
                        const filePath = path.join(element.resourceUri.fsPath, name);
                        const stat = fs.statSync(filePath);
                        if (stat.isFile()) {
                            return new PackageDep(name, vs.Uri.file(filePath), vs.TreeItemCollapsibleState.None, {
                                arguments: [vs.Uri.file(filePath)],
                                command: "dart.package.openFile",
                                title: "Open File",
                            });
                        }
                        else if (stat.isDirectory()) {
                            return new PackageDep(name, vs.Uri.file(filePath), vs.TreeItemCollapsibleState.Collapsed);
                        }
                    }));
                }
            }
            else if (this.workspaceRoot) {
                // When we're re-parsing from root, un-hide the tree. It'll be hidden if we find nothing.
                DartPackagesProvider.showTree();
                const packagesPath = utils_1.PackageMap.findPackagesFile(path.join(this.workspaceRoot, ".packages"));
                if (packagesPath && fs.existsSync(packagesPath)) {
                    resolve(this.getDepsInPackages(packagesPath));
                }
                else {
                    DartPackagesProvider.hideTree();
                    return resolve([]);
                }
            }
            else {
                // Hide the tree in the case there's no root.
                DartPackagesProvider.hideTree();
                return resolve([]);
            }
        });
    }
    getDepsInPackages(packagesPath) {
        const packageRoot = path.dirname(packagesPath);
        // yaml:file:///Users/foo/.pub-cache/hosted/pub.dartlang.org/yaml-2.1.12/lib/
        if (fs.existsSync(packagesPath)) {
            let lines = fs.readFileSync(packagesPath).toString().split("\n");
            lines = lines.filter((l) => !l.startsWith("#") && l.trim().length > 0 && !l.endsWith(":lib/"));
            lines.sort();
            const deps = lines.map((line) => {
                const pos = line.indexOf(":");
                if (pos === -1)
                    return new PackageDep(line, null, vs.TreeItemCollapsibleState.None);
                let packageName = line.substring(0, pos);
                let p = line.substring(pos + 1);
                if (p.endsWith("/"))
                    p = p.substring(0, p.length - 1);
                if (p.endsWith("/lib"))
                    p = p.substring(0, p.length - 4);
                if (!p.startsWith("file:"))
                    p = path.join(packageRoot, p);
                if (this.workspaceRoot !== p) {
                    packageName = line.substring(0, line.indexOf(":"));
                    p = vs.Uri.parse(p).fsPath;
                    return new PackageDep(`${packageName}`, vs.Uri.file(p), vs.TreeItemCollapsibleState.Collapsed);
                }
            }).filter((d) => d);
            // Hide the tree if we had no dependencies to show.
            DartPackagesProvider.setTreeVisible(!!deps && !!deps.length);
            return deps;
        }
        else {
            // Hide the tree in the case of no packages file.
            DartPackagesProvider.hideTree();
            return [];
        }
    }
    static setTreeVisible(visible) {
        vs.commands.executeCommand("setContext", DART_HIDE_PACKAGE_TREE, !visible);
    }
    static showTree() { this.setTreeVisible(true); }
    static hideTree() { this.setTreeVisible(false); }
}
exports.DartPackagesProvider = DartPackagesProvider;
class PackageDep extends vs.TreeItem {
    constructor(label, resourceUri, collapsibleState, command) {
        super(label, collapsibleState);
        this.label = label;
        this.resourceUri = resourceUri;
        this.collapsibleState = collapsibleState;
        this.command = command;
        this.contextValue = "dependency";
    }
}
//# sourceMappingURL=packages_view.js.map