"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const config_1 = require("../config");
function setUpHotReloadOnSave(context, diagnostics) {
    let hotReloadDelayTimer;
    context.subscriptions.push(vscode_1.workspace.onDidSaveTextDocument((td) => {
        if (!config_1.config.flutterHotReloadOnSave)
            return;
        // Don't do if we have errors for the saved file.
        const errors = diagnostics.get(td.uri);
        const hasErrors = errors && errors.find((d) => d.severity === vscode_1.DiagnosticSeverity.Error) != null;
        if (hasErrors)
            return;
        // Debounce to avoid reloading multiple times during multi-file-save (Save All).
        // Hopefully we can improve in future: https://github.com/Microsoft/vscode/issues/42913
        if (hotReloadDelayTimer) {
            clearTimeout(hotReloadDelayTimer);
        }
        hotReloadDelayTimer = setTimeout(() => {
            hotReloadDelayTimer = null;
            vscode_1.commands.executeCommand("flutter.hotReload");
        }, 200);
    }));
}
exports.setUpHotReloadOnSave = setUpHotReloadOnSave;
//# sourceMappingURL=hot_reload_save_handler.js.map