"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = require("ws");
const utils_1 = require("./utils");
class DebuggerResult {
    constructor(result) {
        this.result = result;
    }
}
exports.DebuggerResult = DebuggerResult;
class RPCError {
    constructor(code, message, data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }
    details() {
        return this.data == null ? null : this.data.details;
    }
    toString() {
        return `${this.code} ${this.message}`;
    }
}
exports.RPCError = RPCError;
class ObservatoryConnection {
    constructor(uri) {
        this.completers = {};
        this.eventListeners = {};
        this.nextId = 0;
        this.socket = new WebSocket(uri);
        this.socket.on("message", (data) => this.handleData(data));
    }
    onOpen(cb) {
        this.socket.on("open", cb);
    }
    onLogging(callback) {
        this.logging = callback;
    }
    getVersion() {
        return this.callMethod("getVersion");
    }
    getVM() {
        return this.callMethod("getVM");
    }
    getIsolate(isolateId) {
        return this.callMethod("getIsolate", { isolateId });
    }
    on(streamId, callback) {
        this.streamListen(streamId);
        this.eventListeners[streamId] = callback;
    }
    streamListen(streamId) {
        this.callMethod("streamListen", { streamId });
    }
    addBreakpointWithScriptUri(isolateId, scriptUri, line, column) {
        let data;
        data = { isolateId, scriptUri, line };
        if (column)
            data.column = column;
        return this.callMethod("addBreakpointWithScriptUri", data);
    }
    // None, Unhandled, and All
    setExceptionPauseMode(isolateId, mode) {
        return this.callMethod("setExceptionPauseMode", { isolateId, mode });
    }
    removeBreakpoint(isolateId, breakpointId) {
        return this.callMethod("removeBreakpoint", { isolateId, breakpointId });
    }
    pause(isolateId) {
        return this.callMethod("pause", { isolateId });
    }
    // Into, Over, OverAsyncSuspension, and Out
    resume(isolateId, step) {
        return this.callMethod("resume", { isolateId, step });
    }
    getStack(isolateId) {
        return this.callMethod("getStack", { isolateId });
    }
    getObject(isolateId, objectId, offset, count) {
        let data;
        data = { isolateId, objectId };
        if (offset)
            data.offset = offset;
        if (count)
            data.count = count;
        return this.callMethod("getObject", data);
    }
    evaluate(isolateId, targetId, expression) {
        return this.callMethod("evaluate", {
            expression,
            isolateId,
            targetId,
        });
    }
    evaluateInFrame(isolateId, frameIndex, expression) {
        return this.callMethod("evaluateInFrame", {
            expression,
            frameIndex,
            isolateId,
        });
    }
    setLibraryDebuggable(isolateId, libraryId, isDebuggable) {
        return this.callMethod("setLibraryDebuggable", { isolateId, libraryId, isDebuggable });
    }
    callMethod(method, params) {
        const id = `${this.nextId++}`;
        const completer = new utils_1.PromiseCompleter();
        this.completers[id] = completer;
        let json;
        json = { id, method };
        if (params)
            json.params = params;
        const str = JSON.stringify(json);
        this.logTraffic(`==> ${str}\n`);
        this.socket.send(str);
        return completer.promise;
    }
    handleData(data) {
        this.logTraffic(`<== ${data}\n`);
        let json;
        json = JSON.parse(data);
        const id = json.id;
        const method = json.method;
        const error = json.error;
        const completer = this.completers[id];
        if (completer) {
            delete this.completers[id];
            if (error)
                completer.reject(new RPCError(error.code, error.message, error.data));
            else
                completer.resolve(new DebuggerResult(json.result));
        }
        else if (method) {
            const params = json.params;
            const streamId = params.streamId;
            const callback = this.eventListeners[streamId];
            if (callback)
                callback(params.event);
        }
    }
    onError(cb) {
        this.socket.on("error", cb);
    }
    onClose(cb) {
        this.socket.on("close", cb);
    }
    logTraffic(message) {
        const callback = this.logging;
        if (callback) {
            const max = 2000;
            if (message.length > max)
                message = message.substring(0, max) + "…";
            callback(message);
        }
    }
    close() {
        this.socket.close();
    }
}
ObservatoryConnection.portRegex = new RegExp("Observatory listening on (http:.+)");
exports.ObservatoryConnection = ObservatoryConnection;
//# sourceMappingURL=dart_debug_protocol.js.map