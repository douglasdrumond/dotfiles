"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
class DartLanguageConfiguration {
    constructor() {
        this.onEnterRules = [
            {
                // Triple-slash with space.
                action: { indentAction: vscode_1.IndentAction.None, appendText: "/// " },
                beforeText: /^\s*\/\/\/ /,
            },
            {
                // Triple-slash without space.
                action: { indentAction: vscode_1.IndentAction.None, appendText: "///" },
                beforeText: /^\s*\/\/\//,
            },
            {
                // When between "/** | */" this puts a " * " in but also pushes the "*/" down to next line.
                action: { indentAction: vscode_1.IndentAction.IndentOutdent, appendText: " * " },
                afterText: /^\s*\*\/$/,
                beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
            },
            {
                // When after "/**" will put a " * " in (like above, but where there's no "*/" to push down).
                action: { indentAction: vscode_1.IndentAction.None, appendText: " * " },
                beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
            },
            {
                // Continue " * " when on a line already start with this.
                action: { indentAction: vscode_1.IndentAction.None, appendText: "* " },
                beforeText: /^(\t|(\ \ ))*\ \*(\ ([^\*]|\*(?!\/))*)?$/,
            },
            {
                // After "*/" we need to remove the indent.
                action: { indentAction: vscode_1.IndentAction.None, removeText: 1 },
                beforeText: /^(\t|(\ \ ))*\ \*\/\s*$/,
            },
        ];
    }
}
exports.DartLanguageConfiguration = DartLanguageConfiguration;
//# sourceMappingURL=dart_language_configuration.js.map