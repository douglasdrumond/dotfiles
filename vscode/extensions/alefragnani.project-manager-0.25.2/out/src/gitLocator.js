"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const abstractLocator_1 = require("./abstractLocator");
class GitLocator extends abstractLocator_1.AbstractLocator {
    getKind() {
        return "git";
    }
    getDisplayName() {
        return "Git";
    }
    isRepoDir(projectPath) {
        let isGit;
        isGit = fs.existsSync(path.join(projectPath, ".git", "config"));
        if (isGit) {
            return true;
        }
        isGit = fs.existsSync(path.join(projectPath, ".git"));
        if (isGit) {
            let file;
            try {
                file = fs.readFileSync(path.join(projectPath, ".git"), "utf8");
                isGit = file.indexOf("gitdir: ") === 0;
                if (isGit) {
                    return true;
                }
            }
            catch (e) {
                console.log("Error checking git-worktree: " + e);
            }
        }
        return false;
    }
    decideProjectName(projectPath) {
        return path.basename(projectPath);
    }
}
exports.GitLocator = GitLocator;
//# sourceMappingURL=gitLocator.js.map