"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vs = require("vscode");
const channels = {};
function createChannel(name) {
    if (channels[name] == null)
        channels[name] = vs.window.createOutputChannel(name);
    return channels[name];
}
exports.createChannel = createChannel;
function getChannel(name) {
    if (channels[name] == null)
        return createChannel(name);
    return channels[name];
}
exports.getChannel = getChannel;
function runProcessInChannel(process, channel) {
    process.stdout.on("data", (data) => channel.append(data.toString()));
    process.stderr.on("data", (data) => channel.append(data.toString()));
    process.on("close", (code) => channel.appendLine(`exit code ${code}`));
}
exports.runProcessInChannel = runProcessInChannel;
//# sourceMappingURL=channels.js.map