"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stdio_service_1 = require("../services/stdio_service");
const utils_1 = require("./utils");
class FlutterTest extends stdio_service_1.StdIOService {
    constructor(flutterBinPath, projectFolder, args, logFile) {
        super(() => logFile, true, true);
        this.unhandledMessageSubscriptions = [];
        // Subscription lists.
        this.testStartedProcessSubscriptions = [];
        this.startSubscriptions = [];
        this.allSuitesSubscriptions = [];
        this.suiteSubscriptions = [];
        this.testStartSubscriptions = [];
        this.testDoneSubscriptions = [];
        this.groupSubscriptions = [];
        this.doneSubscriptions = [];
        this.printSubscriptions = [];
        this.errorSubscriptions = [];
        this.createProcess(projectFolder, flutterBinPath, utils_1.globalFlutterArgs.concat(["test", "--machine"]).concat(args));
    }
    shouldHandleMessage(message) {
        // Everything in flutter is wrapped in [] so we can tell what to handle.
        return (message.startsWith("{") && message.endsWith("}"))
            || (message.startsWith("[") && message.endsWith("]"));
    }
    isNotification(msg) { return !!(msg.type || msg.event); }
    isResponse(msg) { return false; }
    processUnhandledMessage(message) {
        this.notify(this.unhandledMessageSubscriptions, message);
    }
    registerForUnhandledMessages(subscriber) {
        return this.subscribe(this.unhandledMessageSubscriptions, subscriber);
    }
    handleNotification(evt) {
        // console.log(JSON.stringify(evt));
        switch (evt.event) {
            case "test.startedProcess":
                this.notify(this.testStartedProcessSubscriptions, evt.params);
                break;
        }
        switch (evt.type) {
            case "start":
                this.notify(this.startSubscriptions, evt);
                break;
            case "allSuites":
                this.notify(this.allSuitesSubscriptions, evt);
                break;
            case "suite":
                this.notify(this.suiteSubscriptions, evt);
                break;
            case "testStart":
                this.notify(this.testStartSubscriptions, evt);
                break;
            case "testDone":
                this.notify(this.testDoneSubscriptions, evt);
                break;
            case "group":
                this.notify(this.groupSubscriptions, evt);
                break;
            case "done":
                this.notify(this.doneSubscriptions, evt);
                break;
            case "print":
                this.notify(this.printSubscriptions, evt);
                break;
            case "error":
                this.notify(this.errorSubscriptions, evt);
                break;
        }
    }
    // Subscription methods.
    registerForTestStartedProcess(subscriber) {
        return this.subscribe(this.testStartedProcessSubscriptions, subscriber);
    }
    registerForStart(subscriber) {
        return this.subscribe(this.startSubscriptions, subscriber);
    }
    registerForAllSuites(subscriber) {
        return this.subscribe(this.allSuitesSubscriptions, subscriber);
    }
    registerForSuite(subscriber) {
        return this.subscribe(this.suiteSubscriptions, subscriber);
    }
    registerForTestStart(subscriber) {
        return this.subscribe(this.testStartSubscriptions, subscriber);
    }
    registerForTestDone(subscriber) {
        return this.subscribe(this.testDoneSubscriptions, subscriber);
    }
    registerForGroup(subscriber) {
        return this.subscribe(this.groupSubscriptions, subscriber);
    }
    registerForDone(subscriber) {
        return this.subscribe(this.doneSubscriptions, subscriber);
    }
    registerForPrint(subscriber) {
        return this.subscribe(this.printSubscriptions, subscriber);
    }
    registerForError(subscriber) {
        return this.subscribe(this.errorSubscriptions, subscriber);
    }
}
exports.FlutterTest = FlutterTest;
//# sourceMappingURL=flutter_test.js.map