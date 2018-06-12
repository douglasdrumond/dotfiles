"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_debugadapter_1 = require("vscode-debugadapter");
const dart_debug_impl_1 = require("./dart_debug_impl");
const flutter_test_1 = require("./flutter_test");
const tick = "✓";
const cross = "✖";
class FlutterTestDebugSession extends dart_debug_impl_1.DartDebugSession {
    constructor() {
        super();
        this.suites = [];
        this.groups = [];
        this.tests = [];
        this.sendStdOutToConsole = false;
    }
    spawnProcess(args) {
        const debug = !args.noDebug;
        let appArgs = [];
        if (debug) {
            appArgs.push("--start-paused");
        }
        appArgs.push(this.sourceFileForArgs(args));
        if (args.args) {
            appArgs = appArgs.concat(args.args);
        }
        this.flutter = new flutter_test_1.FlutterTest(args.flutterPath, args.cwd, appArgs, args.flutterTestLogFile);
        // this.flutter.registerForUnhandledMessages((msg) => this.log(msg));
        // Set up subscriptions.
        this.flutter.registerForTestStartedProcess((n) => this.initObservatory(`${n.observatoryUri}ws`));
        // this.flutter.registerForStart((n) => this.log(JSON.stringify(n)));
        // this.flutter.registerForAllSuites((n) => this.log(JSON.stringify(n)));
        this.flutter.registerForSuite((n) => this.suites[n.suite.id] = n.suite);
        this.flutter.registerForTestStart((n) => this.tests[n.test.id] = n.test);
        this.flutter.registerForTestDone((n) => this.writeTestResult(n));
        this.flutter.registerForGroup((n) => this.groups[n.group.id] = n.group);
        this.flutter.registerForDone((n) => this.writeResult(n));
        this.flutter.registerForUnhandledMessages((n) => this.print({ message: n }));
        this.flutter.registerForPrint((n) => this.print(n));
        this.flutter.registerForError((n) => this.error(n));
        return this.flutter.process;
    }
    writeTestResult(testDone) {
        if (testDone.hidden)
            return;
        const test = this.tests[testDone.testID];
        const pass = testDone.result === "success";
        const symbol = pass ? tick : cross;
        this.sendEvent(new vscode_debugadapter_1.OutputEvent(`${symbol} ${test.name}\n`, "stdout"));
    }
    writeResult(testDone) {
        if (testDone.success)
            this.sendEvent(new vscode_debugadapter_1.OutputEvent(`All tests passed!\n`, "stdout"));
        else
            this.sendEvent(new vscode_debugadapter_1.OutputEvent(`Some tests failed.\n`, "stderr"));
    }
    print(print) {
        this.sendEvent(new vscode_debugadapter_1.OutputEvent(`${print.message}\n`, "stdout"));
    }
    error(error) {
        this.sendEvent(new vscode_debugadapter_1.OutputEvent(`${error.error}\n`, "stderr"));
        if (error.stackTrace)
            this.sendEvent(new vscode_debugadapter_1.OutputEvent(`${error.stackTrace}\n`, "stderr"));
    }
}
exports.FlutterTestDebugSession = FlutterTestDebugSession;
//# sourceMappingURL=flutter_test_debug_impl.js.map