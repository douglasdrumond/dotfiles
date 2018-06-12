"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stdio_service_1 = require("../services/stdio_service");
const utils_1 = require("./utils");
class FlutterRun extends stdio_service_1.StdIOService {
    constructor(flutterBinPath, projectFolder, args, logFile) {
        super(() => logFile, true, true);
        this.unhandledMessageSubscriptions = [];
        // Subscription lists.
        this.appStartSubscriptions = [];
        this.appDebugPortSubscriptions = [];
        this.appStartedSubscriptions = [];
        this.appStopSubscriptions = [];
        this.appProgressSubscriptions = [];
        this.errorSubscriptions = [];
        this.createProcess(projectFolder, flutterBinPath, utils_1.globalFlutterArgs.concat(["run", "--machine"]).concat(args));
    }
    shouldHandleMessage(message) {
        // Everything in flutter is wrapped in [] so we can tell what to handle.
        return message.startsWith("[") && message.endsWith("]");
    }
    processUnhandledMessage(message) {
        this.notify(this.unhandledMessageSubscriptions, message);
    }
    registerForUnhandledMessages(subscriber) {
        return this.subscribe(this.unhandledMessageSubscriptions, subscriber);
    }
    // TODO: Can we code-gen all this like the analysis server?
    handleNotification(evt) {
        // Always send errors up, no matter where they're from.
        if (evt.params.error) {
            this.notify(this.errorSubscriptions, evt.params.error);
        }
        switch (evt.event) {
            case "app.start":
                this.notify(this.appStartSubscriptions, evt.params);
                break;
            case "app.debugPort":
                this.notify(this.appDebugPortSubscriptions, evt.params);
                break;
            case "app.started":
                this.notify(this.appStartedSubscriptions, evt.params);
                break;
            case "app.stop":
                this.notify(this.appStopSubscriptions, evt.params);
                break;
            case "app.progress":
                this.notify(this.appProgressSubscriptions, evt.params);
                break;
        }
    }
    // Request methods.
    restart(appId, pause, hotRestart) {
        return this.sendRequest("app.restart", { appId, fullRestart: hotRestart === true, pause });
    }
    stop(appId) {
        return this.sendRequest("app.stop", { appId });
    }
    callServiceExtension(appId, methodName, params) {
        return this.sendRequest("app.callServiceExtension", { appId, methodName, params });
    }
    // Subscription methods.
    registerForAppStart(subscriber) {
        return this.subscribe(this.appStartSubscriptions, subscriber);
    }
    registerForAppDebugPort(subscriber) {
        return this.subscribe(this.appDebugPortSubscriptions, subscriber);
    }
    registerForAppStarted(subscriber) {
        return this.subscribe(this.appStartedSubscriptions, subscriber);
    }
    registerForAppStop(subscriber) {
        return this.subscribe(this.appStopSubscriptions, subscriber);
    }
    registerForAppProgress(subscriber) {
        return this.subscribe(this.appProgressSubscriptions, subscriber);
    }
    registerForError(subscriber) {
        return this.subscribe(this.errorSubscriptions, subscriber);
    }
}
exports.FlutterRun = FlutterRun;
//# sourceMappingURL=flutter_run.js.map