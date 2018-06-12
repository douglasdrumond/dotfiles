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
const fs = require("fs");
const path = require("path");
const vscode_debugadapter_1 = require("vscode-debugadapter");
const utils_1 = require("../utils");
const dart_debug_protocol_1 = require("./dart_debug_protocol");
const package_map_1 = require("./package_map");
const utils_2 = require("./utils");
// TODO: supportsSetVariable
// TODO: class variables?
// TODO: library variables?
// stepBackRequest(response: DebugProtocol.StepBackResponse, args: DebugProtocol.StepBackArguments): void;
// restartFrameRequest(response: DebugProtocol.RestartFrameResponse, args: DebugProtocol.RestartFrameArguments): void;
// completionsRequest(response: DebugProtocol.CompletionsResponse, args: DebugProtocol.CompletionsArguments): void;
class DartDebugSession extends vscode_debugadapter_1.DebugSession {
    constructor() {
        super();
        this.additionalPidsToTerminate = [];
        // We normally track the pid from Observatory to terminate the VM afterwards, but for Flutter Run it's
        // a remote PID and therefore doesn't make sense to try and terminate.
        this.allowTerminatingObservatoryVmPid = true;
        this.processExited = false;
        this.sendStdOutToConsole = true;
        this.threadManager = new ThreadManager(this);
    }
    initializeRequest(response, args) {
        response.body.supportsConfigurationDoneRequest = true;
        response.body.supportsEvaluateForHovers = true;
        response.body.supportsDelayedStackTraceLoading = true;
        response.body.supportsConditionalBreakpoints = true;
        response.body.supportsLogPoints = true;
        response.body.exceptionBreakpointFilters = [
            { filter: "All", label: "All Exceptions", default: false },
            { filter: "Unhandled", label: "Uncaught Exceptions", default: true },
        ];
        this.sendResponse(response);
    }
    launchRequest(response, args) {
        if (!args || !args.dartPath || !args.program) {
            this.sendEvent(new vscode_debugadapter_1.OutputEvent("Unable to restart debugging. Please try ending the debug session and starting again."));
            this.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
            return;
        }
        // Force relative paths to absolute.
        if (!path.isAbsolute(args.program))
            args.program = path.join(args.cwd, args.program);
        this.cwd = args.cwd;
        this.packageMap = new package_map_1.PackageMap(package_map_1.PackageMap.findPackagesFile(args.program));
        this.debugSdkLibraries = args.debugSdkLibraries;
        this.debugExternalLibraries = args.debugExternalLibraries;
        this.logFile = args.observatoryLogFile;
        this.sendResponse(response);
        this.childProcess = this.spawnProcess(args);
        const process = this.childProcess;
        process.stdout.setEncoding("utf8");
        process.stdout.on("data", (data) => {
            let match;
            if (!this.observatory) {
                match = dart_debug_protocol_1.ObservatoryConnection.portRegex.exec(data.toString());
            }
            if (match) {
                this.initObservatory(this.websocketUriForObservatoryUri(match[1]));
            }
            else if (this.sendStdOutToConsole)
                this.sendEvent(new vscode_debugadapter_1.OutputEvent(data.toString(), "stdout"));
        });
        process.stderr.setEncoding("utf8");
        process.stderr.on("data", (data) => {
            this.sendEvent(new vscode_debugadapter_1.OutputEvent(data.toString(), "stderr"));
        });
        process.on("error", (error) => {
            this.sendEvent(new vscode_debugadapter_1.OutputEvent(`${error}`, "stderr"));
        });
        process.on("exit", (code, signal) => {
            this.logToFile(`Process excited with code ${code}`);
            this.processExited = true;
            if (!code && !signal)
                this.sendEvent(new vscode_debugadapter_1.OutputEvent("Exited"));
            else
                this.sendEvent(new vscode_debugadapter_1.OutputEvent(`Exited (${signal ? `${signal}`.toLowerCase() : code})`));
            this.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
        });
        if (args.noDebug)
            this.sendEvent(new vscode_debugadapter_1.InitializedEvent());
    }
    attachRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!args || !args.observatoryUri) {
                return this.errorResponse(response, "Unable to attach; no Observatory address provided.");
            }
            this.cwd = args.cwd;
            this.debugSdkLibraries = args.debugSdkLibraries;
            this.debugExternalLibraries = args.debugExternalLibraries;
            this.logFile = args.observatoryLogFile;
            this.logToFile(`Attaching to process via ${args.observatoryUri}`);
            // If we were given an explicity packages path, use it (otherwise we'll try
            // to extract from the VM)
            if (args.packages) {
                // Support relative paths
                if (args.packages && !path.isAbsolute(args.packages))
                    args.packages = path.join(args.cwd, args.packages);
                try {
                    this.packageMap = new package_map_1.PackageMap(package_map_1.PackageMap.findPackagesFile(args.packages));
                }
                catch (e) {
                    this.errorResponse(response, `Unable to load packages file: ${e}`);
                }
            }
            try {
                yield this.initObservatory(this.websocketUriForObservatoryUri(args.observatoryUri));
                this.sendResponse(response);
            }
            catch (e) {
                this.errorResponse(response, `Unable to connect to Observatory: ${e}`);
            }
        });
    }
    sourceFileForArgs(args) {
        return path.relative(args.cwd, args.program);
    }
    spawnProcess(args) {
        const debug = !args.noDebug;
        let appArgs = [];
        if (debug) {
            appArgs.push("--enable-vm-service=0");
            appArgs.push("--pause_isolates_on_start=true");
        }
        if (args.checkedMode) {
            appArgs.push("--checked");
        }
        if (args.vmAdditionalArgs) {
            appArgs = appArgs.concat(args.vmAdditionalArgs);
        }
        appArgs.push(this.sourceFileForArgs(args));
        if (args.args) {
            appArgs = appArgs.concat(args.args);
        }
        this.logToFile(`Spawning ${args.dartPath} with args ${JSON.stringify(appArgs)}`);
        if (args.cwd)
            this.logToFile(`..  in ${args.cwd}`);
        const process = utils_2.safeSpawn(args.cwd, args.dartPath, appArgs);
        return process;
    }
    websocketUriForObservatoryUri(uri) {
        const wsUri = uri.trim();
        if (wsUri.endsWith("/ws"))
            return wsUri;
        else if (wsUri.endsWith("/ws/"))
            return wsUri.substr(0, wsUri.length - 1);
        else if (wsUri.endsWith("/"))
            return `${wsUri}ws`;
        else
            return `${wsUri}/ws`;
    }
    logToFile(message) {
        const max = 2000;
        if (this.logFile) {
            if (!this.logStream)
                this.logStream = fs.createWriteStream(this.logFile);
            this.logStream.write(`[${(new Date()).toLocaleTimeString()}]: `);
            if (message.length > max)
                this.logStream.write(message.substring(0, max) + "…\r\n");
            else
                this.logStream.write(message.trim() + "\r\n");
        }
    }
    initObservatory(uri) {
        return new Promise((resolve, reject) => {
            // Send the uri back to the editor so it can be used to launch browsers etc.
            if (uri.endsWith("/ws")) {
                let browserFriendlyUri = uri.substring(0, uri.length - 3);
                if (browserFriendlyUri.startsWith("ws:"))
                    browserFriendlyUri = "http:" + browserFriendlyUri.substring(3);
                this.sendEvent(new vscode_debugadapter_1.Event("dart.observatoryUri", { observatoryUri: browserFriendlyUri.toString() }));
            }
            this.observatory = new dart_debug_protocol_1.ObservatoryConnection(uri);
            this.observatory.onLogging((message) => this.logToFile(message));
            this.observatory.onOpen(() => {
                this.observatory.on("Isolate", (event) => this.handleIsolateEvent(event));
                this.observatory.on("Extension", (event) => this.handleExtensionEvent(event));
                this.observatory.on("Debug", (event) => this.handleDebugEvent(event));
                this.observatory.getVM().then((result) => __awaiter(this, void 0, void 0, function* () {
                    const vm = result.result;
                    // If we own this process (we launched it, didn't attach) and the PID we get from Observatory is different, then
                    // we should keep a ref to this process to terminate when we quit. This avoids issues where our process is a shell
                    // (we use shell execute to fix issues on Windows) and the kill signal isn't passed on correctly.
                    // See: https://github.com/Dart-Code/Dart-Code/issues/907
                    if (this.allowTerminatingObservatoryVmPid && this.childProcess && this.childProcess.pid !== vm.pid) {
                        this.additionalPidsToTerminate.push(vm.pid);
                    }
                    const isolates = yield Promise.all(vm.isolates.map((isolateRef) => this.observatory.getIsolate(isolateRef.id)));
                    if (!this.packageMap) {
                        // TODO: Is it valid to assume the first (only?) isolate with a rootLib is the one we care about here?
                        // If it's always the first, could we even just query the first instead of getting them all before we
                        // start the other processing?
                        const rootIsolateResult = isolates.find((isolate) => isolate.result.rootLib !== null);
                        const rootIsolate = rootIsolateResult && rootIsolateResult.result;
                        if (rootIsolate)
                            this.packageMap = new package_map_1.PackageMap(package_map_1.PackageMap.findPackagesFile(this.convertVMUriToSourcePath(rootIsolate.rootLib.uri)));
                    }
                    yield Promise.all(isolates.map((response) => __awaiter(this, void 0, void 0, function* () {
                        const isolate = response.result;
                        this.threadManager.registerThread(isolate, isolate.runnable ? "IsolateRunnable" : "IsolateStart");
                        if (isolate.pauseEvent.kind.startsWith("Pause")) {
                            yield this.handlePauseEvent(isolate.pauseEvent);
                        }
                    })));
                    // Set a timer for memory updates.
                    if (this.pollforMemoryMs)
                        setTimeout(() => this.pollForMemoryUsage(), this.pollforMemoryMs);
                    this.sendEvent(new vscode_debugadapter_1.InitializedEvent());
                }));
                resolve();
            });
            this.observatory.onClose((code, message) => {
                this.logToFile(`Observatory connection closed: ${code} (${message})`);
                if (this.logStream) {
                    this.logStream.end();
                    this.logStream = null;
                    // Wipe out the filename so if a message arrives late, it doesn't
                    // wipe out the logfile with just a "process excited" or similar message.
                    this.logFile = null;
                }
                // This event arrives before the process exit event.
                setTimeout(() => {
                    if (!this.processExited)
                        this.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
                }, 100);
            });
            this.observatory.onError((error) => {
                reject(error);
            });
        });
    }
    disconnectRequest(response, args) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.childProcess != null) {
                    for (const pid of this.additionalPidsToTerminate) {
                        try {
                            this.logToFile(`Terminating related process ${pid}...`);
                            process.kill(pid);
                        }
                        catch (e) {
                            // Only log if we hadn't already been told the process had quit, since if that's happened
                            // it's very likely this will fail.
                            if (!this.processExited)
                                utils_1.logError({ message: e.toString() });
                        }
                    }
                    this.additionalPidsToTerminate.length = 0;
                    try {
                        this.logToFile(`Terminating main process...`);
                        this.childProcess.kill();
                    }
                    catch (e) {
                        // This tends to throw a lot because the shell process quit when we terminated the related
                        // VM process above, so just swallow the error.
                    }
                    this.childProcess = null;
                }
                else if (this.observatory) {
                    try {
                        this.logToFile(`Disconnecting from process...`);
                        // Remove all breakpoints from the VM.
                        yield Promise.all(this.threadManager.threads.map((thread) => thread.removeAllBreakpoints()));
                        // Restart any paused threads.
                        // Note: Only wait up to 500ms here because sometimes we don't get responses because the VM terminates.
                        // We can't check processExited here as we don't have a handle to the process (we attached).
                        yield Promise.race([
                            Promise.all(this.threadManager.threads.map((thread) => thread.resume())),
                            new Promise((resolve) => setTimeout(resolve, 500)),
                        ]);
                    }
                    finally {
                        this.observatory.close();
                        this.observatory = null;
                    }
                }
            }
            catch (e) {
                return this.errorResponse(response, `${e}`);
            }
            _super("disconnectRequest").call(this, response, args);
        });
    }
    setBreakPointsRequest(response, args) {
        const source = args.source;
        let breakpoints = args.breakpoints;
        if (!breakpoints)
            breakpoints = [];
        // Get all possible valid source uris for the given path.
        const uris = this.getPossibleSourceUris(source.path);
        uris.forEach((uri) => {
            this.threadManager.setBreakpoints(uri, breakpoints).then((result) => {
                const bpResponse = [];
                for (const verified of result) {
                    bpResponse.push({ verified });
                }
                response.body = { breakpoints: bpResponse };
                this.sendResponse(response);
            }).catch((error) => this.errorResponse(response, `${error}`));
        });
    }
    /***
     * Converts a source path to an array of possible uris.
     *
     * This is to ensure that we can hit breakpoints in the case
     * where the VM considers a file to be a package: uri and also
     * a filesystem uri (this can vary depending on how it was
     * imported by the user).
     */
    getPossibleSourceUris(sourcePath) {
        const uris = [];
        // Add the raw file path as a URI.
        uris.push(utils_2.formatPathForVm(sourcePath));
        // Convert to package path and add that too.
        if (this.packageMap) {
            const packageUri = this.packageMap.convertFileToPackageUri(sourcePath);
            if (packageUri)
                uris.push(packageUri);
        }
        return uris;
    }
    setExceptionBreakPointsRequest(response, args) {
        const filters = args.filters;
        let mode = "None";
        if (filters.indexOf("Unhandled") !== -1)
            mode = "Unhandled";
        if (filters.indexOf("All") !== -1)
            mode = "All";
        this.threadManager.setExceptionPauseMode(mode);
        this.sendResponse(response);
    }
    configurationDoneRequest(response, args) {
        this.sendResponse(response);
        this.threadManager.receivedConfigurationDone();
    }
    pauseRequest(response, args) {
        const thread = this.threadManager.getThreadInfoFromNumber(args.threadId);
        if (!thread) {
            this.errorResponse(response, `No thread with id ${args.threadId}`);
            return;
        }
        this.observatory.pause(thread.ref.id)
            .then((_) => this.sendResponse(response))
            .catch((error) => this.errorResponse(response, `${error}`));
    }
    sourceRequest(response, args) {
        const sourceReference = args.sourceReference;
        const data = this.threadManager.getStoredData(sourceReference);
        const scriptRef = data.data;
        data.thread.getScript(scriptRef).then((script) => {
            response.body = { content: script.source };
            this.sendResponse(response);
        }).catch((error) => this.errorResponse(response, `${error}`));
    }
    threadsRequest(response) {
        response.body = { threads: this.threadManager.getThreads() };
        this.sendResponse(response);
    }
    stackTraceRequest(response, args) {
        const thread = this.threadManager.getThreadInfoFromNumber(args.threadId);
        let startFrame = args.startFrame;
        let levels = args.levels;
        if (!thread) {
            this.errorResponse(response, `No thread with id ${args.threadId}`);
            return;
        }
        this.observatory.getStack(thread.ref.id).then((result) => {
            const stack = result.result;
            let vmFrames = stack.asyncCausalFrames;
            if (vmFrames == null)
                vmFrames = stack.frames;
            const totalFrames = vmFrames.length;
            if (!startFrame)
                startFrame = 0;
            if (!levels)
                levels = totalFrames;
            if (startFrame + levels > totalFrames)
                levels = totalFrames - startFrame;
            vmFrames = vmFrames.slice(startFrame, startFrame + levels);
            const stackFrames = [];
            const promises = [];
            vmFrames.forEach((frame) => {
                const frameId = thread.storeData(frame);
                if (frame.kind === "AsyncSuspensionMarker") {
                    const stackFrame = new vscode_debugadapter_1.StackFrame(frameId, "<asynchronous gap>");
                    stackFrames.push(stackFrame);
                    return;
                }
                const frameName = frame.code.name;
                const location = frame.location;
                if (location == null) {
                    const stackFrame = new vscode_debugadapter_1.StackFrame(frameId, frameName);
                    stackFrames.push(stackFrame);
                    return;
                }
                const uri = location.script.uri;
                const shortName = this.convertVMUriToUserName(uri);
                let sourcePath = this.convertVMUriToSourcePath(uri);
                // Download the source if from a "dart:" uri.
                let sourceReference;
                if (uri.startsWith("dart:")) {
                    sourcePath = null;
                    sourceReference = thread.storeData(location.script);
                }
                const stackFrame = new vscode_debugadapter_1.StackFrame(frameId, frameName, new vscode_debugadapter_1.Source(shortName, sourcePath, sourceReference, null, location.script), 0, 0);
                stackFrames.push(stackFrame);
                // Resolve the line and column information.
                const promise = thread.getScript(location.script).then((script) => {
                    const fileLocation = this.resolveFileLocation(script, location.tokenPos);
                    if (fileLocation) {
                        stackFrame.line = fileLocation.line;
                        stackFrame.column = fileLocation.column;
                    }
                });
                promises.push(promise);
            });
            response.body = {
                stackFrames,
                totalFrames,
            };
            Promise.all(promises).then((_) => {
                this.sendResponse(response);
            }).catch((_) => {
                this.sendResponse(response);
            });
        }).catch((error) => this.errorResponse(response, `${error}`));
    }
    scopesRequest(response, args) {
        const frameId = args.frameId;
        const data = this.threadManager.getStoredData(frameId);
        const frame = data.data;
        // TODO: class variables? library variables?
        const variablesReference = data.thread.storeData(frame);
        const scopes = [];
        if (data.thread.exceptionReference) {
            scopes.push(new vscode_debugadapter_1.Scope("Exception", data.thread.exceptionReference));
        }
        scopes.push(new vscode_debugadapter_1.Scope("Locals", variablesReference));
        response.body = { scopes };
        this.sendResponse(response);
    }
    variablesRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const variablesReference = args.variablesReference;
            // implement paged arrays
            // let filter = args.filter; // optional; either "indexed" or "named"
            let start = args.start; // (optional) index of the first variable to return; if omitted children start at 0
            const count = args.count; // (optional) number of variables to return. If count is missing or 0, all variables are returned
            const data = this.threadManager.getStoredData(variablesReference);
            const thread = data.thread;
            if (data.data.type === "Frame") {
                const frame = data.data;
                const variables = [];
                if (frame.vars) {
                    for (const variable of frame.vars)
                        variables.push(this.instanceRefToVariable(thread, true, variable.name, variable.name, variable.value));
                }
                response.body = { variables };
                this.sendResponse(response);
            }
            else if (data.data.type === "MapEntry") {
                const mapRef = data.data;
                const results = yield Promise.all([
                    this.observatory.getObject(thread.ref.id, mapRef.keyId),
                    this.observatory.getObject(thread.ref.id, mapRef.valueId),
                ]);
                const variables = [];
                const [keyDebuggerResult, valueDebuggerResult] = results;
                const keyInstanceRef = keyDebuggerResult.result;
                const valueInstanceRef = valueDebuggerResult.result;
                variables.push(this.instanceRefToVariable(thread, false, "key", "key", keyInstanceRef));
                let canEvaluateValueName = false;
                let valueEvaluateName = "value";
                if (this.isSimpleKind(keyInstanceRef.kind)) {
                    canEvaluateValueName = true;
                    valueEvaluateName = `${mapRef.mapEvaluateName}[${this.valueAsString(keyInstanceRef)}]`;
                }
                variables.push(this.instanceRefToVariable(thread, canEvaluateValueName, valueEvaluateName, "value", valueInstanceRef));
                response.body = { variables };
                this.sendResponse(response);
            }
            else {
                const instanceRef = data.data;
                try {
                    const result = yield this.observatory.getObject(thread.ref.id, instanceRef.id, start, count);
                    const variables = [];
                    // If we're the top-level exception, or our parent has an evaluateName of undefined (its children)
                    // we cannot evaluate (this will disable "Add to Watch" etc).
                    const canEvaluate = variablesReference !== data.thread.exceptionReference && instanceRef.evaluateName !== undefined;
                    if (result.result.type === "Sentinel") {
                        variables.push({
                            name: "<evalError>",
                            value: result.result.valueAsString,
                            variablesReference: 0,
                        });
                    }
                    else {
                        const obj = result.result;
                        if (obj.type === "Instance") {
                            const instance = obj;
                            // TODO: show by kind instead
                            if (instance.elements) {
                                const len = instance.elements.length;
                                if (!start)
                                    start = 0;
                                for (let i = 0; i < len; i++) {
                                    const element = instance.elements[i];
                                    variables.push(this.instanceRefToVariable(thread, canEvaluate, `${instanceRef.evaluateName}[${i + start}]`, `[${i + start}]`, element));
                                }
                            }
                            else if (instance.associations) {
                                const len = instance.associations.length;
                                if (!start)
                                    start = 0;
                                for (let i = 0; i < len; i++) {
                                    const association = instance.associations[i];
                                    const keyName = this.valueAsString(association.key, true);
                                    const valueName = this.valueAsString(association.value, true);
                                    let variablesReference = 0;
                                    if (association.key.type !== "Sentinel" && association.value.type !== "Sentinel") {
                                        const mapRef = {
                                            keyId: association.key.id,
                                            mapEvaluateName: instanceRef.evaluateName,
                                            type: "MapEntry",
                                            valueId: association.value.id,
                                        };
                                        variablesReference = thread.storeData(mapRef);
                                    }
                                    variables.push({
                                        name: `${i + start}`,
                                        type: `${keyName} -> ${valueName}`,
                                        value: `${keyName} -> ${valueName}`,
                                        variablesReference,
                                    });
                                }
                            }
                            else if (instance.fields) {
                                for (const field of instance.fields)
                                    variables.push(this.instanceRefToVariable(thread, canEvaluate, `${instanceRef.evaluateName}.${field.decl.name}`, field.decl.name, field.value));
                            }
                            else {
                                // TODO: unhandled kind
                                this.logToUser(instance.kind);
                            }
                        }
                        else {
                            // TODO: unhandled type
                            this.logToUser(obj.type);
                        }
                    }
                    response.body = { variables };
                    this.sendResponse(response);
                }
                catch (error) {
                    this.errorResponse(response, `${error}`);
                }
            }
        });
    }
    isSimpleKind(kind) {
        return kind === "String" || kind === "Bool" || kind === "Int" || kind === "Num" || kind === "Double";
    }
    callToString(isolate, instanceRef, getFullString = false) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.observatory.evaluate(isolate.id, instanceRef.id, "toString()");
                if (result.result.type === "@Error") {
                    return null;
                }
                else {
                    let evalResult = result.result;
                    if (evalResult.valueAsStringIsTruncated && getFullString) {
                        const result = yield this.observatory.getObject(isolate.id, evalResult.id);
                        evalResult = result.result;
                    }
                    return this.valueAsString(evalResult, undefined, true);
                }
            }
            catch (e) {
                console.error(e);
                return null;
            }
        });
    }
    setVariableRequest(response, args) {
        const variablesReference = args.variablesReference;
        // The name of the variable.
        const name = args.name;
        // The value of the variable.
        const value = args.value;
        // TODO: Use eval to implement this.
        this.errorResponse(response, "not supported");
    }
    continueRequest(response, args) {
        const thread = this.threadManager.getThreadInfoFromNumber(args.threadId);
        if (!thread) {
            this.errorResponse(response, `No thread with id ${args.threadId}`);
            return;
        }
        thread.resume().then((_) => {
            response.body = { allThreadsContinued: false };
            this.sendResponse(response);
        }).catch((error) => this.errorResponse(response, `${error}`));
    }
    nextRequest(response, args) {
        const thread = this.threadManager.getThreadInfoFromNumber(args.threadId);
        if (!thread) {
            this.errorResponse(response, `No thread with id ${args.threadId}`);
            return;
        }
        const type = thread.atAsyncSuspension ? "OverAsyncSuspension" : "Over";
        thread.resume(type).then((_) => {
            this.sendResponse(response);
        }).catch((error) => this.errorResponse(response, `${error}`));
    }
    stepInRequest(response, args) {
        const thread = this.threadManager.getThreadInfoFromNumber(args.threadId);
        if (!thread) {
            this.errorResponse(response, `No thread with id ${args.threadId}`);
            return;
        }
        thread.resume("Into").then((_) => {
            this.sendResponse(response);
        }).catch((error) => this.errorResponse(response, `${error}`));
    }
    stepOutRequest(response, args) {
        const thread = this.threadManager.getThreadInfoFromNumber(args.threadId);
        if (!thread) {
            this.errorResponse(response, `No thread with id ${args.threadId}`);
            return;
        }
        thread.resume("Out").then((_) => {
            this.sendResponse(response);
        }).catch((error) => this.errorResponse(response, `${error}`));
    }
    stepBackRequest(response, args) {
        // unsupported
    }
    evaluateRequest(response, args) {
        const expression = args.expression;
        // Stack frame scope; if not specified, the expression is evaluated in the global scope.
        const frameId = args.frameId;
        // Values are "watch", "repl", and "hover".
        const context = args.context;
        if (!frameId) {
            this.errorResponse(response, "global evaluation not supported");
            return;
        }
        const data = this.threadManager.getStoredData(frameId);
        const thread = data.thread;
        const frame = data.data;
        this.observatory.evaluateInFrame(thread.ref.id, frame.index, expression).then((result) => {
            // InstanceRef or ErrorRef
            if (result.result.type === "@Error") {
                const error = result.result;
                let str = error.message;
                if (str && str.length > 100)
                    str = str.substring(0, 100) + "…";
                this.errorResponse(response, str);
            }
            else {
                const instanceRef = result.result;
                response.body = {
                    result: this.valueAsString(instanceRef),
                    variablesReference: instanceRef.valueAsString ? 0 : thread.storeData(instanceRef),
                };
                this.sendResponse(response);
            }
        }).catch((error) => this.errorResponse(response, `${error}`));
    }
    customRequest(request, response, args) {
        switch (request) {
            default:
                super.customRequest(request, response, args);
                break;
        }
    }
    // IsolateStart, IsolateRunnable, IsolateExit, IsolateUpdate, ServiceExtensionAdded
    handleIsolateEvent(event) {
        const kind = event.kind;
        if (kind === "IsolateStart" || kind === "IsolateRunnable") {
            this.threadManager.registerThread(event.isolate, kind);
        }
        else if (kind === "IsolateExit") {
            this.threadManager.handleIsolateExit(event.isolate);
        }
        else if (kind === "ServiceExtensionAdded") {
            this.handleServiceExtensionAdded(event);
        }
    }
    // Extension
    handleExtensionEvent(event) {
        // Nothing Dart-specific, but Flutter overrides this
    }
    // PauseStart, PauseExit, PauseBreakpoint, PauseInterrupted, PauseException, Resume,
    // BreakpointAdded, BreakpointResolved, BreakpointRemoved, Inspect, None
    handleDebugEvent(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const kind = event.kind;
            if (kind.startsWith("Pause")) {
                this.handlePauseEvent(event);
            }
        });
    }
    handlePauseEvent(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const kind = event.kind;
            // For PausePostRequest we need to re-send all breakpoints; this happens after a flutter restart
            if (kind === "PausePostRequest") {
                yield this.threadManager.resetBreakpoints();
                try {
                    yield this.observatory.resume(event.isolate.id);
                }
                catch (e) {
                    // Ignore failed-to-resume errors https://github.com/flutter/flutter/issues/10934
                    if (e.code !== 106)
                        throw e;
                }
            }
            else if (kind === "PauseStart") {
                // "PauseStart" should auto-resume after breakpoints are set if we launched the process.
                const thread = this.threadManager.getThreadInfoFromRef(event.isolate);
                if (this.childProcess)
                    thread.receivedPauseStart();
                else {
                    // Otherwise, if we were attaching, then just issue a step-into to put the debugger
                    // right at the start of the application.
                    thread.handlePaused(event.atAsyncSuspension, event.exception);
                    yield thread.resume("Into");
                }
            }
            else {
                const thread = this.threadManager.getThreadInfoFromRef(event.isolate);
                // PauseStart, PauseExit, PauseBreakpoint, PauseInterrupted, PauseException
                let reason = "pause";
                let exceptionText = null;
                let shouldRemainedStoppedOnBreakpoint = true;
                if (kind === "PauseBreakpoint" && event.pauseBreakpoints && event.pauseBreakpoints.length) {
                    reason = "breakpoint";
                    const breakpoints = event.pauseBreakpoints.map((bp) => thread.breakpoints[bp.id]);
                    // When attaching to an already-stopped process, this event can be handled before the
                    // breakpoints have been registered. If that happens, replace any unknown breakpoints with
                    // dummy unconditional breakpoints.
                    // TODO: Ensure that VM breakpoint state is reconciled with debugger breakpoint state before
                    // handling thread state so that this doesn't happen, and remove this check.
                    const hasUnknownBreakpoints = breakpoints.indexOf(undefined) !== -1;
                    if (!hasUnknownBreakpoints) {
                        const hasUnconditionalBreakpoints = !!breakpoints.find((bp) => !bp.condition && !bp.logMessage);
                        const conditionalBreakpoints = breakpoints.filter((bp) => bp.condition);
                        const logPoints = breakpoints.filter((bp) => bp.logMessage);
                        // Evalute conditions to see if we should remain stopped or continue.
                        shouldRemainedStoppedOnBreakpoint =
                            hasUnconditionalBreakpoints
                                || (yield this.anyBreakpointConditionReturnsTrue(conditionalBreakpoints, thread));
                        // Output any logpoint messages.
                        for (const logPoint of logPoints) {
                            const logMessage = logPoint.logMessage
                                .replace(/(^|[^\\\$]){/g, "$1\${") // Prefix any {tokens} with $ if they don't have
                                .replace(/\\({)/g, "$1"); // Remove slashes
                            // TODO: Escape triple quotes?
                            const printCommand = `print("""${logMessage}""")`;
                            yield this.evaluateAndSendErrors(thread, printCommand);
                        }
                    }
                }
                else if (kind === "PauseBreakpoint") {
                    reason = "step";
                }
                else if (kind === "PauseException") {
                    reason = "exception";
                    exceptionText = this.valueAsString(event.exception, false);
                    if (!exceptionText)
                        exceptionText = yield this.callToString(event.isolate, event.exception, true);
                }
                thread.handlePaused(event.atAsyncSuspension, event.exception);
                if (shouldRemainedStoppedOnBreakpoint) {
                    this.sendEvent(new vscode_debugadapter_1.StoppedEvent(reason, thread.num, exceptionText));
                }
                else {
                    thread.resume();
                }
            }
        });
    }
    anyBreakpointConditionReturnsTrue(breakpoints, thread) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const bp of breakpoints) {
                const evalResult = yield this.evaluateAndSendErrors(thread, bp.condition);
                if (evalResult) {
                    // To be considered true, we need to have a value and either be not-a-bool
                    const breakpointconditionEvaluatesToTrue = (evalResult.kind === "Bool" && evalResult.valueAsString === "true")
                        || (evalResult.kind === "Int" && evalResult.valueAsString !== "0");
                    if (breakpointconditionEvaluatesToTrue)
                        return true;
                }
            }
            return false;
        });
    }
    evaluateAndSendErrors(thread, expression) {
        return __awaiter(this, void 0, void 0, function* () {
            function trimToFirstNewline(s) {
                s = s && s.toString();
                const newlinePos = s.indexOf("\n");
                return s.substr(0, newlinePos).trim();
            }
            try {
                const result = yield this.observatory.evaluateInFrame(thread.ref.id, 0, expression);
                if (result.result.type !== "@Error") {
                    return result.result;
                }
                else {
                    this.sendEvent(new vscode_debugadapter_1.OutputEvent(`Debugger failed to evaluate expression \`${expression}\`\n`, "stderr"));
                }
            }
            catch (_a) {
                this.sendEvent(new vscode_debugadapter_1.OutputEvent(`Debugger failed to evaluate expression \`${expression}\`\n`, "stderr"));
            }
        });
    }
    handleServiceExtensionAdded(event) {
        if (event && event.extensionRPC) {
            this.sendEvent(new vscode_debugadapter_1.Event("dart.serviceExtensionAdded", { id: event.extensionRPC }));
        }
    }
    errorResponse(response, message) {
        response.success = false;
        response.message = message;
        this.sendResponse(response);
    }
    convertVMUriToUserName(uri) {
        if (uri.startsWith("file:")) {
            uri = utils_2.uriToFilePath(uri);
            if (this.cwd)
                uri = path.relative(this.cwd, uri);
        }
        return uri;
    }
    convertVMUriToSourcePath(uri, returnWindowsPath) {
        if (uri.startsWith("file:"))
            return utils_2.uriToFilePath(uri, returnWindowsPath);
        if (uri.startsWith("package:") && this.packageMap)
            return this.packageMap.resolvePackageUri(uri);
        return uri;
    }
    valueAsString(ref, useClassNameAsFallback = true, suppressQuotesAroundStrings = false) {
        if (ref.type === "Sentinel")
            return ref.valueAsString;
        const instanceRef = ref;
        if (ref.valueAsString) {
            let str = instanceRef.valueAsString;
            if (instanceRef.valueAsStringIsTruncated)
                str += "…";
            if (instanceRef.kind === "String" && !suppressQuotesAroundStrings)
                str = `"${str}"`;
            return str;
        }
        else if (ref.kind === "List") {
            return `List (${instanceRef.length} items)`;
        }
        else if (ref.kind === "Map") {
            return `Map (${instanceRef.length} items)`;
        }
        else if (useClassNameAsFallback) {
            return this.getFriendlyTypeName(instanceRef);
        }
        else {
            return null;
        }
    }
    getFriendlyTypeName(ref) {
        return ref.kind !== "PlainInstance" ? ref.kind : ref.class.name;
    }
    instanceRefToVariable(thread, canEvaluate, evaluateName, name, ref) {
        if (ref.type === "Sentinel") {
            return {
                name,
                value: ref.valueAsString,
                variablesReference: 0,
            };
        }
        else {
            const val = ref;
            // Stick on the evaluateName as we'll need this to build
            // the evaluateName for the child, and we don't have the parent
            // (or a string expression) in the response.
            val.evaluateName = canEvaluate ? evaluateName : undefined;
            let str = this.valueAsString(val);
            if (!val.valueAsString && !str)
                str = "";
            return {
                evaluateName: canEvaluate ? evaluateName : null,
                indexedVariables: (val.kind.endsWith("List") ? val.length : null),
                name,
                type: `${val.kind} (${val.class.name})`,
                value: str,
                variablesReference: val.valueAsString ? 0 : thread.storeData(val),
            };
        }
    }
    resolveFileLocation(script, tokenPos) {
        const table = script.tokenPosTable;
        for (const entry of table) {
            // [lineNumber, (tokenPos, columnNumber)*]
            for (let index = 1; index < entry.length; index += 2) {
                if (entry[index] === tokenPos) {
                    const line = entry[0];
                    return new FileLocation(line, entry[index + 1]);
                }
            }
        }
        return null;
    }
    pollForMemoryUsage() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.childProcess || this.childProcess.killed)
                return;
            const result = yield this.observatory.getVM();
            const vm = result.result;
            const promises = [];
            const isolatePromises = vm.isolates.map((isolateRef) => this.observatory.getIsolate(isolateRef.id));
            const isolatesResponses = yield Promise.all(isolatePromises);
            const isolates = isolatesResponses.map((response) => response.result);
            let current = 0;
            let total = 0;
            for (const isolate of isolates) {
                for (const heap of [isolate._heaps.old, isolate._heaps.new]) {
                    current += heap.used + heap.external;
                    total += heap.capacity + heap.external;
                }
            }
            this.sendEvent(new vscode_debugadapter_1.Event("dart.debugMetrics", { memory: { current, total } }));
            setTimeout(() => this.pollForMemoryUsage(), this.pollforMemoryMs);
        });
    }
    logToUser(obj) {
        this.sendEvent(new vscode_debugadapter_1.OutputEvent(`${obj}\n`));
    }
}
exports.DartDebugSession = DartDebugSession;
class ThreadManager {
    constructor(debugSession) {
        this.debugSession = debugSession;
        this.nextThreadId = 0;
        this.threads = [];
        this.bps = {};
        this.hasConfigurationDone = false;
        this.exceptionMode = "Unhandled";
        this.nextDataId = 1;
        this.storedData = {};
    }
    registerThread(ref, eventKind) {
        return __awaiter(this, void 0, void 0, function* () {
            let thread = this.getThreadInfoFromRef(ref);
            if (!thread) {
                thread = new ThreadInfo(this, ref, this.nextThreadId);
                this.nextThreadId++;
                this.threads.push(thread);
                // If this is the first time we've seen it, fire an event
                this.debugSession.sendEvent(new vscode_debugadapter_1.ThreadEvent("started", thread.num));
                if (this.hasConfigurationDone)
                    thread.receivedConfigurationDone();
            }
            // If it's just become runnable (IsolateRunnable), then set breakpoints.
            if (eventKind === "IsolateRunnable" && !thread.runnable) {
                thread.runnable = true;
                yield Promise.all([
                    this.debugSession.observatory.setExceptionPauseMode(thread.ref.id, this.exceptionMode),
                    this.setLibrariesDebuggable(thread.ref),
                    this.resetBreakpoints(),
                ]);
                thread.setInitialBreakpoints();
            }
        });
    }
    receivedConfigurationDone() {
        this.hasConfigurationDone = true;
        for (const thread of this.threads)
            thread.receivedConfigurationDone();
    }
    getThreadInfoFromRef(ref) {
        for (const thread of this.threads) {
            if (thread.ref.id === ref.id)
                return thread;
        }
        return null;
    }
    getThreadInfoFromNumber(num) {
        for (const thread of this.threads) {
            if (thread.num === num)
                return thread;
        }
        return null;
    }
    getThreads() {
        return this.threads.map((thread) => new vscode_debugadapter_1.Thread(thread.num, thread.ref.name));
    }
    setExceptionPauseMode(mode) {
        this.exceptionMode = mode;
        for (const thread of this.threads) {
            if (thread.runnable)
                this.debugSession.observatory.setExceptionPauseMode(thread.ref.id, mode);
        }
    }
    setLibrariesDebuggable(isolateRef) {
        return __awaiter(this, void 0, void 0, function* () {
            // Helpers to categories libraries as SDK/ExternalLibrary/not.
            const isValidToDebug = (l) => !l.uri.startsWith("dart:_"); // TODO: See https://github.com/dart-lang/sdk/issues/29813
            const isSdkLibrary = (l) => l.uri.startsWith("dart:");
            // If we don't know the local package name, we have to assume nothing is external, else we might disable debugging for the local library.
            const isExternalLibrary = (l) => l.uri.startsWith("package:") && this.debugSession.packageMap.localPackageName && !l.uri.startsWith(`package:${this.debugSession.packageMap.localPackageName}/`);
            // Set whether libraries should be debuggable based on user settings.
            const response = yield this.debugSession.observatory.getIsolate(isolateRef.id);
            const isolate = response.result;
            yield Promise.all(isolate.libraries.filter(isValidToDebug).map((library) => {
                // Note: Condition is negated.
                const shouldDebug = !(
                // Inside here is shouldNotDebug!
                (isSdkLibrary(library) && !this.debugSession.debugSdkLibraries)
                    || (isExternalLibrary(library) && !this.debugSession.debugExternalLibraries));
                return this.debugSession.observatory.setLibraryDebuggable(isolate.id, library.id, shouldDebug);
            }));
        });
    }
    // Just resends existing breakpoints
    resetBreakpoints() {
        const promises = [];
        for (const uri of Object.keys(this.bps)) {
            promises.push(this.setBreakpoints(uri, this.bps[uri]));
        }
        return Promise.all(promises);
    }
    setBreakpoints(uri, breakpoints) {
        // Remember these bps for when new threads start.
        if (breakpoints.length === 0)
            delete this.bps[uri];
        else
            this.bps[uri] = breakpoints;
        let promise;
        for (const thread of this.threads) {
            if (thread.runnable) {
                const result = thread.setBreakpoints(uri, breakpoints);
                if (!promise)
                    promise = result;
            }
        }
        if (promise)
            return promise;
        const completer = new utils_2.PromiseCompleter();
        const result = [];
        for (const b of breakpoints)
            result.push(true);
        completer.resolve(result);
        return completer.promise;
    }
    storeData(thread, data) {
        const id = this.nextDataId;
        this.nextDataId++;
        this.storedData[id] = new StoredData(thread, data);
        return id;
    }
    getStoredData(id) {
        return this.storedData[id];
    }
    removeStoredIds(ids) {
        for (const id of ids) {
            delete this.storedData[id];
        }
    }
    handleIsolateExit(ref) {
        const threadInfo = this.getThreadInfoFromRef(ref);
        if (threadInfo) {
            this.debugSession.sendEvent(new vscode_debugadapter_1.ThreadEvent("exited", threadInfo.num));
            this.threads.splice(this.threads.indexOf(threadInfo), 1);
        }
        else {
            console.error(`Failed to find thread for ${ref.id} during exit`);
        }
    }
}
class StoredData {
    constructor(thread, data) {
        this.thread = thread;
        this.data = data;
    }
}
class ThreadInfo {
    constructor(manager, ref, num) {
        this.manager = manager;
        this.ref = ref;
        this.num = num;
        this.storedIds = [];
        this.scriptCompleters = {};
        this.runnable = false;
        this.vmBps = {};
        // TODO: Do we need both sets of breakpoints?
        this.breakpoints = {};
        this.atAsyncSuspension = false;
        this.exceptionReference = 0;
        this.paused = false;
        this.gotPauseStart = false;
        this.initialBreakpoints = false;
        this.hasConfigurationDone = false;
        this.hasPendingResume = false;
    }
    removeBreakpointsAtUri(uri) {
        const removeBreakpointPromises = [];
        const breakpoints = this.vmBps[uri];
        if (breakpoints) {
            for (const bp of breakpoints) {
                removeBreakpointPromises.push(this.manager.debugSession.observatory.removeBreakpoint(this.ref.id, bp.id));
            }
            delete this.vmBps[uri];
        }
        return Promise.all(removeBreakpointPromises);
    }
    removeAllBreakpoints() {
        const removeBreakpointPromises = [];
        for (const uri of Object.keys(this.vmBps)) {
            removeBreakpointPromises.push(this.removeBreakpointsAtUri(uri));
        }
        return Promise.all(removeBreakpointPromises).then((results) => {
            return [].concat.apply([], results);
        });
    }
    setBreakpoints(uri, breakpoints) {
        // Remove all current bps.
        const removeBreakpointPromises = this.removeBreakpointsAtUri(uri);
        this.vmBps[uri] = [];
        return removeBreakpointPromises.then(() => {
            // Set new ones.
            const promises = [];
            for (const bp of breakpoints) {
                const promise = this.manager.debugSession.observatory.addBreakpointWithScriptUri(this.ref.id, uri, bp.line, bp.column).then((result) => {
                    const vmBp = result.result;
                    this.vmBps[uri].push(vmBp);
                    this.breakpoints[vmBp.id] = bp;
                    return true;
                }).catch((error) => {
                    return false;
                });
                promises.push(promise);
            }
            return Promise.all(promises);
        });
    }
    receivedPauseStart() {
        this.gotPauseStart = true;
        this.paused = true;
        this.checkResume();
    }
    setInitialBreakpoints() {
        this.initialBreakpoints = true;
        this.checkResume();
    }
    receivedConfigurationDone() {
        this.hasConfigurationDone = true;
        this.checkResume();
    }
    checkResume() {
        if (this.paused && this.gotPauseStart && this.initialBreakpoints && this.hasConfigurationDone)
            this.resume();
    }
    handleResumed() {
        // TODO: I don"t think we want to do this...
        // this.manager.removeStoredIds(this.storedIds);
        // this.storedIds = [];
        // TODO: Should we be waiting for acknowledgement before doing this?
        this.atAsyncSuspension = false;
        this.exceptionReference = 0;
        this.paused = false;
    }
    resume(step) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.paused || this.hasPendingResume)
                return;
            this.hasPendingResume = true;
            try {
                yield this.manager.debugSession.observatory.resume(this.ref.id, step);
                this.handleResumed();
            }
            finally {
                this.hasPendingResume = false;
            }
        });
    }
    getScript(scriptRef) {
        const scriptId = scriptRef.id;
        if (this.scriptCompleters[scriptId]) {
            const completer = this.scriptCompleters[scriptId];
            return completer.promise;
        }
        else {
            const completer = new utils_2.PromiseCompleter();
            this.scriptCompleters[scriptId] = completer;
            const observatory = this.manager.debugSession.observatory;
            observatory.getObject(this.ref.id, scriptRef.id).then((result) => {
                const script = result.result;
                completer.resolve(script);
            }).catch((error) => {
                completer.reject(error);
            });
            return completer.promise;
        }
    }
    storeData(data) {
        return this.manager.storeData(this, data);
    }
    handlePaused(atAsyncSuspension, exception) {
        this.atAsyncSuspension = atAsyncSuspension;
        if (exception)
            this.exceptionReference = this.storeData(exception);
        this.paused = true;
    }
}
class FileLocation {
    constructor(line, column) {
        this.line = line;
        this.column = column;
    }
}
//# sourceMappingURL=dart_debug_impl.js.map