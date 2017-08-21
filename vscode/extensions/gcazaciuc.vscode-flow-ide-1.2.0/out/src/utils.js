"use strict";
/// <reference path="./cross-spawn.d.ts" />
const cross_spawn_1 = require('cross-spawn');
const vscode_1 = require('vscode');
const fs = require('fs');
const NODE_NOT_FOUND = '[Flow] Cannot find node in PATH. The simpliest way to resolve it is install node globally';
const FLOW_NOT_FOUND = '[Flow] Cannot find flow in PATH. Try to install it by npm install flow-bin -g';
function getPathToFlowFromConfig() {
    const config = vscode_1.workspace.getConfiguration('flowide');
    if (config) {
        return config.get('pathToFlow').toString();
    }
    return '';
}
exports.getPathToFlowFromConfig = getPathToFlowFromConfig;
function nodeModuleFlowLocation(rootPath) {
    if (process.platform === 'win32') {
        return `${rootPath}\\node_modules\\.bin\\flow.cmd`;
    }
    else {
        return `${rootPath}/node_modules/.bin/flow`;
    }
}
exports.nodeModuleFlowLocation = nodeModuleFlowLocation;
function determineFlowPath() {
    let pathToFlow = '';
    const localInstall = getPathToFlowFromConfig() || nodeModuleFlowLocation(vscode_1.workspace.rootPath);
    if (fs.existsSync(localInstall)) {
        pathToFlow = localInstall;
    }
    else {
        pathToFlow = 'flow';
    }
    return pathToFlow;
}
exports.determineFlowPath = determineFlowPath;
function isFlowEnabled() {
    return vscode_1.workspace.getConfiguration('flowide').get('enabled');
}
exports.isFlowEnabled = isFlowEnabled;
function buildSearchFlowCommand(testPath) {
    if (process.platform !== 'win32') {
        return {
            command: 'which',
            args: [testPath]
        };
    }
    else {
        const splitCharLocation = testPath.lastIndexOf('\\');
        const command = testPath.substring(splitCharLocation + 1, testPath.length);
        const searchDirectory = testPath.substring(0, splitCharLocation);
        const args = !searchDirectory ? [command] : ['/r', searchDirectory, command];
        return {
            command: `${process.env.SYSTEMROOT || 'C:\\Windows'}\\System32\\where`,
            args: args
        };
    }
}
function checkFlow() {
    try {
        const { command, args } = buildSearchFlowCommand(determineFlowPath());
        const check = cross_spawn_1.spawn(command, args);
        let flowOutput = "", flowOutputError = "";
        check.stdout.on('data', function (data) {
            flowOutput += data.toString();
        });
        check.stderr.on('data', function (data) {
            flowOutputError += data.toString();
        });
        check.on('exit', function (code) {
            if (code != 0) {
                vscode_1.window.showErrorMessage(FLOW_NOT_FOUND);
            }
        });
    }
    catch (e) {
        vscode_1.window.showErrorMessage(FLOW_NOT_FOUND);
    }
}
exports.checkFlow = checkFlow;
//# sourceMappingURL=utils.js.map