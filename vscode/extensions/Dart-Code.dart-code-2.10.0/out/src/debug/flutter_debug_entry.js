"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_debugadapter_1 = require("vscode-debugadapter");
const flutter_debug_impl_1 = require("./flutter_debug_impl");
vscode_debugadapter_1.DebugSession.run(flutter_debug_impl_1.FlutterDebugSession);
//# sourceMappingURL=flutter_debug_entry.js.map