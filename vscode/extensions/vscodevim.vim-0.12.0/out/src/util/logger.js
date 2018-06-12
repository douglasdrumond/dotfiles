"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
var LoggingLevel;
(function (LoggingLevel) {
    LoggingLevel[LoggingLevel["Error"] = 0] = "Error";
    LoggingLevel[LoggingLevel["Warn"] = 1] = "Warn";
    LoggingLevel[LoggingLevel["Debug"] = 2] = "Debug";
})(LoggingLevel || (LoggingLevel = {}));
class LoggerImpl {
    constructor() {
        this._channel = vscode.window.createOutputChannel('vscodevim');
    }
    debug(message) {
        this.emitMessage(LoggingLevel.Debug, message);
    }
    error(message, friendlyMessage) {
        this.emitMessage(LoggingLevel.Error, message);
        vscode.window.showErrorMessage(`Error: ${friendlyMessage} || ${message}`);
    }
    emitMessage(loggingLevel, message) {
        if (message === undefined) {
            return;
        }
        message = `${LoggerImpl.getNow()} - ${message}`;
        this._channel.appendLine(message);
        switch (loggingLevel) {
            case LoggingLevel.Error:
                console.error(message);
                break;
            case LoggingLevel.Warn:
                console.warn(message);
                break;
            case LoggingLevel.Debug:
                console.log(message);
                break;
        }
    }
    static getNow() {
        const now = new Date();
        let time = [String(now.getHours()), String(now.getMinutes()), String(now.getSeconds())];
        for (let i = 0; i < time.length; i++) {
            if (Number(time[i]) < 10) {
                time[i] = '0' + time[i];
            }
        }
        return time.join(':');
    }
    dispose() {
        this._channel.dispose();
    }
}
exports.Logger = new LoggerImpl();

//# sourceMappingURL=logger.js.map
