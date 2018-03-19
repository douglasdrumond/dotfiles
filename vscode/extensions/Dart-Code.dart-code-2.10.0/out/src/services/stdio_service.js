"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process = require("child_process");
const fs = require("fs");
// Reminder: This class is used in the debug adapter as well as the main Code process!
class StdIOService {
    constructor(logFile, wrappedMessages = false) {
        this.messagesWrappedInBrackets = false;
        this.nextRequestID = 1;
        this.activeRequests = {};
        this.messageBuffer = [];
        this.requestErrorSubscriptions = [];
        this.logFile = logFile;
        this.messagesWrappedInBrackets = wrappedMessages;
    }
    createProcess(workingDirectory, binPath, args, env) {
        this.logTraffic(`Spawning ${binPath} with args ${JSON.stringify(args)}`);
        if (workingDirectory)
            this.logTraffic(`..  in ${workingDirectory}`);
        if (env)
            this.logTraffic(`..  in ${JSON.stringify(env)}`);
        this.process = child_process.spawn(binPath, args, { cwd: workingDirectory, env });
        this.process.stdout.on("data", (data) => {
            const message = data.toString();
            // Add this message to the buffer for processing.
            this.messageBuffer.push(message);
            // Kick off processing if we have a full message.
            if (message.indexOf("\n") >= 0)
                this.processMessageBuffer();
        });
        this.process.stderr.on("data", (data) => {
            this.logTraffic(`ERR ${data.toString()}`);
        });
    }
    sendRequest(method, params) {
        // Generate an ID for this request so we can match up the response.
        const id = this.nextRequestID++;
        return new Promise((resolve, reject) => {
            // Stash the callbacks so we can call them later.
            this.activeRequests[id.toString()] = [resolve, reject, method];
            const req = {
                id: id.toString(),
                method,
                params,
            };
            const json = this.messagesWrappedInBrackets
                ? "[" + JSON.stringify(req) + "]\r\n"
                : JSON.stringify(req) + "\r\n";
            this.sendMessage(json);
        });
    }
    sendMessage(json) {
        this.logTraffic(`==> ${json}`);
        this.process.stdin.write(json);
    }
    processMessageBuffer() {
        let fullBuffer = this.messageBuffer.join("");
        this.messageBuffer = [];
        // If the message doesn't end with \n then put the last part back into the buffer.
        if (!fullBuffer.endsWith("\n")) {
            const lastNewline = fullBuffer.lastIndexOf("\n");
            const incompleteMessage = fullBuffer.substring(lastNewline + 1);
            fullBuffer = fullBuffer.substring(0, lastNewline);
            this.messageBuffer.push(incompleteMessage);
        }
        // Process the complete messages in the buffer.
        fullBuffer.split("\n").filter((m) => m.trim() !== "").forEach((m) => this.handleMessage(m));
    }
    // tslint:disable-next-line:no-empty
    processUnhandledMessage(message) { }
    handleMessage(message) {
        message = message.trim();
        this.logTraffic(`<== ${message}\r\n`);
        if (!this.shouldHandleMessage(message)) {
            this.processUnhandledMessage(message);
            return;
        }
        let msg;
        try {
            msg = JSON.parse(message);
            if (this.messagesWrappedInBrackets && msg && msg.length === 1)
                msg = msg[0];
        }
        catch (e) {
            console.error(`Unexpected non-JSON message, assuming normal stdout (${e}): ${message}`);
            this.processUnhandledMessage(message);
            return;
        }
        try {
            if (msg && msg.event)
                this.handleNotification(msg);
            else if (msg && msg.id)
                this.handleResponse(msg);
            else {
                console.error(`Unexpected JSON message, assuming normal stdout : ${message}`);
                this.processUnhandledMessage(message);
            }
        }
        catch (e) {
            console.error(`Failed to handle JSON message, assuming normal stdout (${e}): ${message}`);
            this.processUnhandledMessage(message);
        }
    }
    handleResponse(evt) {
        const handler = this.activeRequests[evt.id];
        const method = handler[2];
        const error = evt.error;
        if (error && error.code === "SERVER_ERROR") {
            error.method = method;
            this.notify(this.requestErrorSubscriptions, error);
        }
        if (error) {
            handler[1](error);
        }
        else {
            handler[0](evt.result);
        }
    }
    notify(subscriptions, notification) {
        subscriptions.slice().forEach((sub) => sub(notification));
    }
    subscribe(subscriptions, subscriber) {
        subscriptions.push(subscriber);
        return {
            dispose: () => {
                const index = subscriptions.indexOf(subscriber);
                if (index >= 0) {
                    subscriptions.splice(index, 1);
                }
            },
        };
    }
    registerForRequestError(subscriber) {
        return this.subscribe(this.requestErrorSubscriptions, subscriber);
    }
    logTraffic(message) {
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
        else if (!this.logFile && this.logStream) {
            // Turn off logging.
            this.logStream.close();
            this.logStream = null;
        }
    }
    dispose() {
        if (this.logStream) {
            this.logStream.close();
            this.logStream = null;
        }
        this.process.kill();
    }
}
exports.StdIOService = StdIOService;
class Request {
}
exports.Request = Request;
class Response {
}
exports.Response = Response;
class UnknownResponse extends Response {
}
exports.UnknownResponse = UnknownResponse;
class Notification {
}
exports.Notification = Notification;
class UnknownNotification extends Notification {
}
exports.UnknownNotification = UnknownNotification;
//# sourceMappingURL=stdio_service.js.map