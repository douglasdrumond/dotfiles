"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const getFreePort = require("get-port");
const inversify_1 = require("inversify");
const os = require("os");
const vscode_1 = require("vscode");
const configSettings_1 = require("../../common/configSettings");
const types_1 = require("../../common/process/types");
const helpers_1 = require("./../../common/helpers");
const HAND_SHAKE = `READY${os.EOL}`;
let DebugLauncher = class DebugLauncher {
    constructor(pythonExecutionFactory) {
        this.pythonExecutionFactory = pythonExecutionFactory;
    }
    getLaunchOptions(resource) {
        return __awaiter(this, void 0, void 0, function* () {
            const pythonSettings = configSettings_1.PythonSettings.getInstance(resource);
            const port = yield getFreePort({ host: 'localhost', port: pythonSettings.unitTest.debugPort });
            const host = typeof pythonSettings.unitTest.debugHost === 'string' && pythonSettings.unitTest.debugHost.trim().length > 0 ? pythonSettings.unitTest.debugHost.trim() : 'localhost';
            return { port, host };
        });
    }
    launchDebugger(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const cwdUri = options.cwd ? vscode_1.Uri.file(options.cwd) : undefined;
            return this.pythonExecutionFactory.create(cwdUri)
                .then(executionService => {
                // tslint:disable-next-line:no-any
                const def = helpers_1.createDeferred();
                // tslint:disable-next-line:no-any
                const launchDef = helpers_1.createDeferred();
                let outputChannelShown = false;
                let accumulatedData = '';
                const result = executionService.execObservable(options.args, { cwd: options.cwd, mergeStdOutErr: true, token: options.token });
                result.out.subscribe(output => {
                    let data = output.out;
                    if (!launchDef.resolved) {
                        accumulatedData += output.out;
                        if (!accumulatedData.startsWith(HAND_SHAKE)) {
                            return;
                        }
                        // Socket server has started, lets start the vs debugger.
                        launchDef.resolve();
                        data = accumulatedData.substring(HAND_SHAKE.length);
                    }
                    if (!outputChannelShown) {
                        outputChannelShown = true;
                        options.outChannel.show();
                    }
                    options.outChannel.append(data);
                }, error => {
                    if (!def.completed) {
                        def.reject(error);
                    }
                }, () => {
                    // Complete only when the process has completed.
                    if (!def.completed) {
                        def.resolve();
                    }
                });
                launchDef.promise
                    .then(() => {
                    if (!Array.isArray(vscode_1.workspace.workspaceFolders) || vscode_1.workspace.workspaceFolders.length === 0) {
                        throw new Error('Please open a workspace');
                    }
                    let workspaceFolder = vscode_1.workspace.getWorkspaceFolder(cwdUri);
                    if (!workspaceFolder) {
                        workspaceFolder = vscode_1.workspace.workspaceFolders[0];
                    }
                    return vscode_1.debug.startDebugging(workspaceFolder, {
                        name: 'Debug Unit Test',
                        type: 'python',
                        request: 'attach',
                        localRoot: options.cwd,
                        remoteRoot: options.cwd,
                        port: options.port,
                        secret: 'my_secret',
                        host: options.host
                    });
                })
                    .catch(reason => {
                    if (!def.completed) {
                        def.reject(reason);
                    }
                });
                return def.promise;
            });
        });
    }
};
DebugLauncher = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(types_1.IPythonExecutionFactory))
], DebugLauncher);
exports.DebugLauncher = DebugLauncher;
//# sourceMappingURL=debugLauncher.js.map