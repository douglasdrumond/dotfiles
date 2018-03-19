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
const child_process = require("child_process");
const fs = require("fs");
const path = require("path");
const vscode_debugadapter_1 = require("vscode-debugadapter");
const utils_1 = require("./utils");
const dart_debug_protocol_1 = require("./dart_debug_protocol");
// TODO: supportsSetVariable
// TODO: class variables?
// TODO: library variables?
// stepBackRequest(response: DebugProtocol.StepBackResponse, args: DebugProtocol.StepBackArguments): void;
// restartFrameRequest(response: DebugProtocol.RestartFrameResponse, args: DebugProtocol.RestartFrameArguments): void;
// completionsRequest(response: DebugProtocol.CompletionsResponse, args: DebugProtocol.CompletionsArguments): void;
class DartDebugSession extends vscode_debugadapter_1.DebugSession {
    constructor() {
        super();
        this.processExited = false;
        this.sendStdOutToConsole = true;
        this.threadManager = new ThreadManager(this);
    }
    initializeRequest(response, args) {
        response.body.supportsConfigurationDoneRequest = true;
        response.body.supportsEvaluateForHovers = true;
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
        this.args = args;
        this.sourceFile = path.relative(args.cwd, args.program);
        this.packageMap = new utils_1.PackageMap(utils_1.PackageMap.findPackagesFile(args.program));
        this.localPackageName = utils_1.getLocalPackageName(args.program);
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
                let uri = match[1].trim();
                // In SDK 1.22, trailing slash was added to the url (see #215).
                if (!uri.endsWith("/"))
                    uri = uri + "/";
                this.initObservatory(`${uri}ws`);
            }
            else if (this.sendStdOutToConsole)
                this.sendEvent(new vscode_debugadapter_1.OutputEvent(data.toString(), "stdout"));
        });
        process.stderr.setEncoding("utf8");
        process.stderr.on("data", (data) => {
            this.sendEvent(new vscode_debugadapter_1.OutputEvent(data.toString(), "stderr"));
        });
        process.on("error", (error) => {
            this.sendEvent(new vscode_debugadapter_1.OutputEvent(`Error: ${error}\n`));
        });
        process.on("exit", (code, signal) => {
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
        appArgs.push(this.sourceFile);
        if (args.args)
            appArgs = appArgs.concat(args.args);
        const process = child_process.spawn(this.args.dartPath, appArgs, { cwd: args.cwd });
        return process;
    }
    initObservatory(uri) {
        // Send the uri back to the editor so it can be used to launch browsers etc.
        if (uri.endsWith("/ws")) {
            let browserFriendlyUri = uri.substring(0, uri.length - 3);
            if (browserFriendlyUri.startsWith("ws:"))
                browserFriendlyUri = "http:" + browserFriendlyUri.substring(3);
            this.sendEvent(new vscode_debugadapter_1.Event("dart.observatoryUri", { observatoryUri: browserFriendlyUri.toString() }));
        }
        this.observatory = new dart_debug_protocol_1.ObservatoryConnection(uri);
        this.observatory.onLogging((message) => {
            const max = 2000;
            if (this.args.observatoryLogFile) {
                if (!this.observatoryLogStream)
                    this.observatoryLogStream = fs.createWriteStream(this.args.observatoryLogFile);
                this.observatoryLogStream.write(`[${(new Date()).toLocaleTimeString()}]: `);
                if (message.length > max)
                    this.observatoryLogStream.write(message.substring(0, max) + "…\r\n");
                else
                    this.observatoryLogStream.write(message.trim() + "\r\n");
            }
        });
        this.observatory.onOpen(() => {
            this.observatory.on("Isolate", (event) => this.handleIsolateEvent(event));
            this.observatory.on("Extension", (event) => this.handleExtensionEvent(event));
            this.observatory.on("Debug", (event) => this.handleDebugEvent(event));
            this.observatory.getVM().then((result) => {
                const vm = result.result;
                const promises = [];
                for (const isolateRef of vm.isolates) {
                    promises.push(this.observatory.getIsolate(isolateRef.id).then((response) => {
                        const isolate = response.result;
                        this.threadManager.registerThread(isolateRef, isolate.runnable ? "IsolateRunnable" : "IsolateStart");
                        if (isolate.pauseEvent.kind === "PauseStart") {
                            const thread = this.threadManager.getThreadInfoFromRef(isolateRef);
                            thread.receivedPauseStart();
                        }
                        // Helpers to categories libraries as SDK/ExternalLibrary/not.
                        const isValidToDebug = (l) => !l.uri.startsWith("dart:_"); // TODO: See https://github.com/dart-lang/sdk/issues/29813
                        const isSdkLibrary = (l) => l.uri.startsWith("dart:");
                        const isExternalLibrary = (l) => l.uri.startsWith("package:") && !l.uri.startsWith(`package:${this.localPackageName}/`);
                        // Set whether libraries should be debuggable based on user settings.
                        return Promise.all(isolate.libraries.filter(isValidToDebug).map((library) => {
                            // Note: Condition is negated.
                            const shouldDebug = !(
                            // Inside here is shouldNotDebug!
                            (isSdkLibrary(library) && !this.args.debugSdkLibraries)
                                || (isExternalLibrary(library) && !this.args.debugExternalLibraries));
                            this.observatory.setLibraryDebuggable(isolateRef.id, library.id, shouldDebug);
                        }));
                    }));
                }
                Promise.all(promises).then((_) => {
                    this.sendEvent(new vscode_debugadapter_1.InitializedEvent());
                });
            });
        });
        this.observatory.onClose((code, message) => {
            if (this.observatoryLogStream) {
                this.observatoryLogStream.close();
                this.observatoryLogStream = null;
            }
            // This event arrives before the process exit event.
            setTimeout(() => {
                if (!this.processExited)
                    this.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
            }, 100);
        });
    }
    disconnectRequest(response, args) {
        if (this.childProcess != null)
            this.childProcess.kill();
        super.disconnectRequest(response, args);
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
        // Add the raw file path.
        uris.push(utils_1.formatPathForVm(sourcePath));
        // Convert to package path and add that too.
        const packageUri = this.packageMap.convertFileToPackageUri(sourcePath);
        if (packageUri)
            uris.push(packageUri);
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
                    variables.push(this.instanceRefToVariable(thread, variable.name, variable.value));
            }
            response.body = { variables };
            this.sendResponse(response);
        }
        else {
            const instanceRef = data.data;
            this.observatory.getObject(thread.ref.id, instanceRef.id, start, count).then((result) => {
                const variables = [];
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
                                variables.push(this.instanceRefToVariable(thread, `[${i + start}]`, element));
                            }
                        }
                        else if (instance.associations) {
                            for (const association of instance.associations) {
                                let keyName = this.valueAsString(association.key);
                                if (!keyName) {
                                    if (association.key.type === "Sentinel")
                                        keyName = "<evalError>";
                                    else
                                        keyName = association.key.id;
                                }
                                variables.push(this.instanceRefToVariable(thread, keyName, association.value));
                            }
                        }
                        else if (instance.fields) {
                            for (const field of instance.fields)
                                variables.push(this.instanceRefToVariable(thread, field.decl.name, field.value));
                        }
                        else {
                            // TODO: unhandled kind
                            this.log(instance.kind);
                        }
                    }
                    else {
                        // TODO: unhandled type
                        this.log(obj.type);
                    }
                }
                response.body = { variables };
                this.sendResponse(response);
            }).catch((error) => this.errorResponse(response, `${error}`));
        }
    }
    callToString(isolate, instanceRef) {
        return this.observatory.evaluate(isolate.id, instanceRef.id, "toString()").then((result) => {
            if (result.result.type === "@Error") {
                return null;
            }
            else {
                const evalResult = result.result;
                return this.valueAsString(evalResult, undefined, true);
            }
        }).catch((e) => null);
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
        this.observatory.resume(thread.ref.id).then((_) => {
            thread.handleResumed();
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
        this.observatory.resume(thread.ref.id, type).then((_) => {
            thread.handleResumed();
            this.sendResponse(response);
        }).catch((error) => this.errorResponse(response, `${error}`));
    }
    stepInRequest(response, args) {
        const thread = this.threadManager.getThreadInfoFromNumber(args.threadId);
        if (!thread) {
            this.errorResponse(response, `No thread with id ${args.threadId}`);
            return;
        }
        this.observatory.resume(thread.ref.id, "Into").then((_) => {
            thread.handleResumed();
            this.sendResponse(response);
        }).catch((error) => this.errorResponse(response, `${error}`));
    }
    stepOutRequest(response, args) {
        const thread = this.threadManager.getThreadInfoFromNumber(args.threadId);
        if (!thread) {
            this.errorResponse(response, `No thread with id ${args.threadId}`);
            return;
        }
        this.observatory.resume(thread.ref.id, "Out").then((_) => {
            thread.handleResumed();
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
                if (instanceRef.valueAsString) {
                    response.body = {
                        result: this.valueAsString(instanceRef),
                        variablesReference: 0,
                    };
                }
                else {
                    response.body = {
                        result: instanceRef.class.name,
                        variablesReference: thread.storeData(instanceRef),
                    };
                }
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
                // "PauseStart" should auto-resume after breakpoints are set.
                const thread = this.threadManager.getThreadInfoFromRef(event.isolate);
                thread.receivedPauseStart();
            }
            else if (kind.startsWith("Pause")) {
                const thread = this.threadManager.getThreadInfoFromRef(event.isolate);
                // PauseStart, PauseExit, PauseBreakpoint, PauseInterrupted, PauseException
                let reason = "pause";
                let exceptionText = null;
                if (kind === "PauseBreakpoint") {
                    reason = "breakpoint";
                    if (event.pauseBreakpoints == null || event.pauseBreakpoints.length === 0) {
                        reason = "step";
                    }
                }
                if (kind === "PauseException") {
                    reason = "exception";
                    exceptionText = this.valueAsString(event.exception, false);
                    if (!exceptionText)
                        exceptionText = yield this.callToString(event.isolate, event.exception);
                }
                thread.handlePaused(event.atAsyncSuspension, event.exception);
                this.sendEvent(new vscode_debugadapter_1.StoppedEvent(reason, thread.number, exceptionText));
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
            uri = utils_1.uriToFilePath(uri);
            uri = path.relative(this.args.cwd, uri);
        }
        return uri;
    }
    convertVMUriToSourcePath(uri, returnWindowsPath) {
        if (uri.startsWith("file:"))
            return utils_1.uriToFilePath(uri, returnWindowsPath);
        if (uri.startsWith("package:"))
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
            return `[${instanceRef.length}]`;
        }
        else if (ref.kind === "Map") {
            return `{${instanceRef.length}}`;
        }
        else if (useClassNameAsFallback) {
            return instanceRef.class.name;
        }
        else {
            return null;
        }
    }
    instanceRefToVariable(thread, name, ref) {
        if (ref.type === "Sentinel") {
            return {
                name,
                value: ref.valueAsString,
                variablesReference: 0,
            };
        }
        else {
            const val = ref;
            let str = this.valueAsString(val);
            if (!val.valueAsString && !str)
                str = "";
            return {
                indexedVariables: (val.kind.endsWith("List") ? val.length : null),
                name,
                type: val.class.name,
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
    log(obj) {
        this.sendEvent(new vscode_debugadapter_1.OutputEvent(`${obj}\n`));
    }
}
exports.DartDebugSession = DartDebugSession;
class ThreadManager {
    constructor(debugSession) {
        this.nextThreadId = 0;
        this.threads = [];
        this.bps = {};
        this.hasConfigurationDone = false;
        this.exceptionMode = "Unhandled";
        this.nextDataId = 1;
        this.storedData = {};
        this.debugSession = debugSession;
    }
    registerThread(ref, eventKind) {
        let thread = this.getThreadInfoFromRef(ref);
        if (!thread) {
            thread = new ThreadInfo(this, ref, this.nextThreadId);
            this.nextThreadId++;
            this.threads.push(thread);
            // If this is the first time we've seen it, fire an event
            this.debugSession.sendEvent(new vscode_debugadapter_1.ThreadEvent("started", thread.number));
            if (this.hasConfigurationDone)
                thread.receivedConfigurationDone();
        }
        // If it's just become runnable (IsolateRunnable), then set breakpoints.
        if (eventKind === "IsolateRunnable" && !thread.runnable) {
            thread.runnable = true;
            this.debugSession.observatory.setExceptionPauseMode(thread.ref.id, this.exceptionMode);
            this.resetBreakpoints().then((_) => thread.setInitialBreakpoints());
        }
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
            if (thread.number === num)
                return thread;
        }
        return null;
    }
    getThreads() {
        return this.threads.map((thread) => new vscode_debugadapter_1.Thread(thread.number, thread.ref.name));
    }
    setExceptionPauseMode(mode) {
        this.exceptionMode = mode;
        for (const thread of this.threads) {
            if (thread.runnable)
                this.debugSession.observatory.setExceptionPauseMode(thread.ref.id, mode);
        }
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
        const completer = new utils_1.PromiseCompleter();
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
        this.debugSession.sendEvent(new vscode_debugadapter_1.ThreadEvent("exited", threadInfo.number));
        this.threads.splice(this.threads.indexOf(threadInfo), 1);
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
        this.storedIds = [];
        this.scriptCompleters = {};
        this.runnable = false;
        this.vmBps = {};
        this.atAsyncSuspension = false;
        this.exceptionReference = 0;
        this.gotPauseStart = false;
        this.initialBreakpoints = false;
        this.hasConfigurationDone = false;
        this.manager = manager;
        this.ref = ref;
        this.number = num;
    }
    setBreakpoints(uri, breakpoints) {
        const removeBreakpointPromises = [];
        // Remove all current bps.
        const oldbps = this.vmBps[uri];
        if (oldbps) {
            for (const bp of oldbps) {
                removeBreakpointPromises.push(this.manager.debugSession.observatory.removeBreakpoint(this.ref.id, bp.id));
            }
        }
        this.vmBps[uri] = [];
        return Promise.all(removeBreakpointPromises).then(() => {
            // Set new ones.
            const promises = [];
            for (const bp of breakpoints) {
                const promise = this.manager.debugSession.observatory.addBreakpointWithScriptUri(this.ref.id, uri, bp.line, bp.column).then((result) => {
                    const vmBp = result.result;
                    this.vmBps[uri].push(vmBp);
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
        if (this.gotPauseStart && this.initialBreakpoints && this.hasConfigurationDone)
            this.manager.debugSession.observatory.resume(this.ref.id);
    }
    handleResumed() {
        // TODO: I don"t think we want to do this...
        // this.manager.removeStoredIds(this.storedIds);
        // this.storedIds = [];
        this.atAsyncSuspension = false;
        this.exceptionReference = 0;
    }
    getScript(scriptRef) {
        const scriptId = scriptRef.id;
        if (this.scriptCompleters[scriptId]) {
            const completer = this.scriptCompleters[scriptId];
            return completer.promise;
        }
        else {
            const completer = new utils_1.PromiseCompleter();
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
    }
}
class FileLocation {
    constructor(line, column) {
        this.line = line;
        this.column = column;
    }
}
//# sourceMappingURL=dart_debug_impl.js.map