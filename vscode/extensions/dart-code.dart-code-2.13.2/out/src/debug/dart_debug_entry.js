"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_debugadapter_1 = require("vscode-debugadapter");
const dart_debug_impl_1 = require("./dart_debug_impl");
vscode_debugadapter_1.DebugSession.run(dart_debug_impl_1.DartDebugSession);
//# sourceMappingURL=dart_debug_entry.js.map