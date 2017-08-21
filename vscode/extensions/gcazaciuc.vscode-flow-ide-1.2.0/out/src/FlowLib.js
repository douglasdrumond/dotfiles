"use strict";
/// <reference path="./cross-spawn.d.ts" />
const cross_spawn_1 = require('cross-spawn');
const utils_1 = require('./utils');
const path = require('path');
const fs = require('fs');
let pathToFlow = '';
exports.getPathToFlow = () => {
    if (pathToFlow) {
        return pathToFlow;
    }
    pathToFlow = utils_1.determineFlowPath();
    utils_1.checkFlow();
    return pathToFlow;
};
class FlowLib {
    static execFlow(fileContents, filename, args) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(filename)) {
                resolve(undefined);
            }
            const cwd = path.dirname(filename);
            let flowOutput = "";
            let flowOutputError = "";
            const flowProc = cross_spawn_1.spawn(exports.getPathToFlow(), args, { cwd: cwd });
            flowProc.stdout.on('data', (data) => {
                flowOutput += data.toString();
            });
            flowProc.stderr.on('data', (data) => {
                flowOutputError += data.toString();
            });
            flowProc.on('exit', () => {
                if (flowOutputError) {
                    reject(flowOutputError);
                }
                else {
                    let result = flowOutput;
                    if (flowOutput && flowOutput.length) {
                        result = JSON.parse(flowOutput);
                    }
                    resolve(result);
                }
            });
            flowProc.stdin.write(fileContents);
            flowProc.stdin.end();
        });
    }
    static getTypeAtPos(fileContents, fileName, pos) {
        return FlowLib.execFlow(fileContents, fileName, ['type-at-pos', '--json', '--pretty', '--path', fileName, pos.line + 1, pos.character + 1]);
    }
    static getDiagnostics(fileContents, fileName) {
        return FlowLib.execFlow(fileContents, fileName, ['status', '--json']);
    }
    static getAutocomplete(fileContents, fileName, pos) {
        return FlowLib.execFlow(fileContents, fileName, ['autocomplete', '--json', fileName, pos.line + 1, pos.character + 1]);
    }
    static getDefinition(fileContents, fileName, pos) {
        return FlowLib.execFlow(fileContents, fileName, ['get-def', '--json', fileName, pos.line + 1, pos.character + 1]);
    }
    static getCoverage(fileContents, fileName) {
        return FlowLib.execFlow(fileContents, fileName, ['coverage', '--json', fileName]);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FlowLib;
//# sourceMappingURL=FlowLib.js.map