"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const path = require("path");
const vscode = require("vscode");
const util = require("util");
const goPath_1 = require("./goPath");
const util_1 = require("./util");
const goOutline_1 = require("./goOutline");
const goPackages_1 = require("./goPackages");
let outputChannel = vscode.window.createOutputChannel('Go Tests');
function getTestEnvVars(config) {
    const envVars = util_1.getToolsEnvVars();
    const testEnvConfig = config['testEnvVars'] || {};
    let fileEnv = {};
    let testEnvFile = config['testEnvFile'];
    if (testEnvFile) {
        testEnvFile = util_1.resolvePath(testEnvFile);
        try {
            fileEnv = goPath_1.parseEnvFile(testEnvFile);
        }
        catch (e) {
            console.log(e);
        }
    }
    Object.keys(testEnvConfig).forEach(key => envVars[key] = util_1.resolvePath(testEnvConfig[key]));
    Object.keys(fileEnv).forEach(key => envVars[key] = util_1.resolvePath(fileEnv[key]));
    return envVars;
}
exports.getTestEnvVars = getTestEnvVars;
function getTestFlags(goConfig, args) {
    let testFlags = goConfig['testFlags'] ? goConfig['testFlags'] : goConfig['buildFlags'];
    testFlags = [...testFlags]; // Use copy of the flags, dont pass the actual object from config
    return (args && args.hasOwnProperty('flags') && Array.isArray(args['flags'])) ? args['flags'] : testFlags;
}
exports.getTestFlags = getTestFlags;
/**
 * Returns all Go unit test functions in the given source file.
 *
 * @param the URI of a Go source file.
 * @return test function symbols for the source file.
 */
function getTestFunctions(doc, token) {
    let documentSymbolProvider = new goOutline_1.GoDocumentSymbolProvider();
    return documentSymbolProvider
        .provideDocumentSymbols(doc, token)
        .then(symbols => symbols.filter(sym => sym.kind === vscode.SymbolKind.Function
        && (sym.name.startsWith('Test') || sym.name.startsWith('Example'))));
}
exports.getTestFunctions = getTestFunctions;
/**
 * Returns all Benchmark functions in the given source file.
 *
 * @param the URI of a Go source file.
 * @return benchmark function symbols for the source file.
 */
function getBenchmarkFunctions(doc, token) {
    let documentSymbolProvider = new goOutline_1.GoDocumentSymbolProvider();
    return documentSymbolProvider
        .provideDocumentSymbols(doc, token)
        .then(symbols => symbols.filter(sym => sym.kind === vscode.SymbolKind.Function
        && sym.name.startsWith('Benchmark')));
}
exports.getBenchmarkFunctions = getBenchmarkFunctions;
/**
 * Runs go test and presents the output in the 'Go' channel.
 *
 * @param goConfig Configuration for the Go extension.
 */
function goTest(testconfig) {
    return new Promise((resolve, reject) => {
        outputChannel.clear();
        if (!testconfig.background) {
            outputChannel.show(true);
        }
        let buildTags = testconfig.goConfig['buildTags'];
        let args = ['test', ...testconfig.flags];
        let testType = testconfig.isBenchmark ? 'Benchmarks' : 'Tests';
        if (testconfig.isBenchmark) {
            args.push('-benchmem', '-run=^$');
        }
        else {
            args.push('-timeout', testconfig.goConfig['testTimeout']);
        }
        if (buildTags && testconfig.flags.indexOf('-tags') === -1) {
            args.push('-tags', buildTags);
        }
        let testEnvVars = getTestEnvVars(testconfig.goConfig);
        let goRuntimePath = goPath_1.getGoRuntimePath();
        if (!goRuntimePath) {
            vscode.window.showInformationMessage('Cannot find "go" binary. Update PATH or GOROOT appropriately');
            return Promise.resolve();
        }
        // Append the package name to args to enable running tests in symlinked directories
        let currentGoWorkspace = goPath_1.getCurrentGoWorkspaceFromGOPATH(util_1.getCurrentGoPath(), testconfig.dir);
        if (currentGoWorkspace && !testconfig.includeSubDirectories) {
            args.push(testconfig.dir.substr(currentGoWorkspace.length + 1));
        }
        targetArgs(testconfig).then(targets => {
            let outTargets = args.slice(0);
            if (targets.length > 2) {
                outTargets.push('<long arguments omitted>');
            }
            else {
                outTargets.push(...targets);
            }
            outputChannel.appendLine(['Running tool:', goRuntimePath, ...outTargets].join(' '));
            outputChannel.appendLine('');
            args.push(...targets);
            let proc = cp.spawn(goRuntimePath, args, { env: testEnvVars, cwd: testconfig.dir });
            const outBuf = new util_1.LineBuffer();
            const errBuf = new util_1.LineBuffer();
            outBuf.onLine(line => outputChannel.appendLine(expandFilePathInOutput(line, testconfig.dir)));
            outBuf.onDone(last => last && outputChannel.appendLine(expandFilePathInOutput(last, testconfig.dir)));
            errBuf.onLine(line => outputChannel.appendLine(line));
            errBuf.onDone(last => last && outputChannel.appendLine(last));
            proc.stdout.on('data', chunk => outBuf.append(chunk.toString()));
            proc.stderr.on('data', chunk => errBuf.append(chunk.toString()));
            proc.on('close', code => {
                outBuf.done();
                errBuf.done();
                if (code) {
                    outputChannel.appendLine(`Error: ${testType} failed.`);
                }
                else {
                    outputChannel.appendLine(`Success: ${testType} passed.`);
                }
                resolve(code === 0);
            });
        }, err => {
            outputChannel.appendLine(`Error: ${testType} failed.`);
            outputChannel.appendLine(err);
            resolve(false);
        });
    });
}
exports.goTest = goTest;
/**
 * Reveals the output channel in the UI.
 */
function showTestOutput() {
    outputChannel.show(true);
}
exports.showTestOutput = showTestOutput;
function expandFilePathInOutput(output, cwd) {
    let lines = output.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let matches = lines[i].match(/^\s+(\S+_test.go):(\d+):/);
        if (matches) {
            lines[i] = lines[i].replace(matches[1], path.join(cwd, matches[1]));
        }
    }
    return lines.join('\n');
}
/**
 * Get the test target arguments.
 *
 * @param testconfig Configuration for the Go extension.
 */
function targetArgs(testconfig) {
    if (testconfig.functions) {
        return Promise.resolve([testconfig.isBenchmark ? '-bench' : '-run', util.format('^%s$', testconfig.functions.join('|'))]);
    }
    else if (testconfig.includeSubDirectories && !testconfig.isBenchmark) {
        return util_1.getGoVersion().then((ver) => {
            if (ver && (ver.major > 1 || (ver.major === 1 && ver.minor >= 9))) {
                return ['./...'];
            }
            return goPackages_1.getNonVendorPackages(testconfig.dir);
        });
    }
    return Promise.resolve([]);
}
//# sourceMappingURL=testUtils.js.map