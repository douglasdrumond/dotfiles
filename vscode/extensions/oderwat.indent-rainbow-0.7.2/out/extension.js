// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
// this method is called when vs code is activated
function activate(context) {
    // Create a decorator types that we use to decorate indent levels
    var decorationTypes = [];
    var doIt = false;
    var clearMe = false;
    var currentLanguageId = null;
    var skipAllErrors = false;
    var activeEditor = vscode.window.activeTextEditor;
    // Error color gets shown when tabs aren't right,
    //  e.g. when you have your tabs set to 2 spaces but the indent is 3 spaces
    var error_color = vscode.workspace.getConfiguration('indentRainbow')['errorColor'] || "rgba(128,32,32,0.3)";
    var error_decoration_type = vscode.window.createTextEditorDecorationType({
        backgroundColor: error_color
    });
    var ignoreLinePatterns = vscode.workspace.getConfiguration('indentRainbow')['ignoreLinePatterns'] || [
        /.*\*.*/g
    ];
    // Colors will cycle through, and can be any size that you want
    var colors = vscode.workspace.getConfiguration('indentRainbow')['colors'] || [
        "rgba(64,64,16,0.3)",
        "rgba(32,64,32,0.3)",
        "rgba(64,32,64,0.3)",
        "rgba(16,48,48,0.3)"
    ];
    // Loops through colors and creates decoration types for each one
    colors.forEach(function (color, index) {
        decorationTypes[index] = vscode.window.createTextEditorDecorationType({
            backgroundColor: color
        });
    });
    // loop through ignore regex strings and convert to valid RegEx's.
    ignoreLinePatterns.forEach(function (ignorePattern, index) {
        if (typeof ignorePattern === 'string') {
            //parse the string for a regex
            var regParts = ignorePattern.match(/^\/(.*?)\/([gim]*)$/);
            if (regParts) {
                // the parsed pattern had delimiters and modifiers. handle them.
                ignoreLinePatterns[index] = new RegExp(regParts[1], regParts[2]);
            }
            else {
                // we got pattern string without delimiters
                ignoreLinePatterns[index] = new RegExp(ignorePattern);
            }
        }
    });
    if (activeEditor) {
        indentConfig();
    }
    if (activeEditor && checkLanguage()) {
        triggerUpdateDecorations();
    }
    vscode.window.onDidChangeActiveTextEditor(function (editor) {
        activeEditor = editor;
        if (editor) {
            indentConfig();
        }
        if (editor && checkLanguage()) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);
    vscode.workspace.onDidChangeTextDocument(function (event) {
        if (activeEditor) {
            indentConfig();
        }
        if (activeEditor && event.document === activeEditor.document && checkLanguage()) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);
    function isEmptyObject(obj) {
        return Object.getOwnPropertyNames(obj).length === 0;
    }
    function indentConfig() {
        // Set tabSize and insertSpaces from the config if specified for this languageId
        var indentSetter = vscode.workspace.getConfiguration('indentRainbow')['indentSetter'] || [];
        // we do nothing if we have {} to not interrupt other extensions for indent settings
        if (!isEmptyObject(indentSetter)) {
            var langCfg = indentSetter[activeEditor.document.languageId];
            if (langCfg === undefined) {
                // if we do not have any defaults get those from the editor config itself
                // this seems to break detectindentation = true :(
                langCfg = vscode.workspace.getConfiguration('editor');
            }
            vscode.window.activeTextEditor.options = {
                "tabSize": langCfg.tabSize,
                "insertSpaces": langCfg.insertSpaces
            };
        }
        var skiplang = vscode.workspace.getConfiguration('indentRainbow')['ignoreErrorLanguages'] || [];
        skipAllErrors = false;
        if (skiplang.length !== 0) {
            if (skiplang.indexOf('*') !== -1 || skiplang.indexOf(currentLanguageId) !== -1) {
                skipAllErrors = true;
            }
        }
    }
    function checkLanguage() {
        if (activeEditor) {
            if (currentLanguageId !== activeEditor.document.languageId) {
                var inclang = vscode.workspace.getConfiguration('indentRainbow')['includedLanguages'] || [];
                var exclang = vscode.workspace.getConfiguration('indentRainbow')['excludedLanguages'] || [];
                currentLanguageId = activeEditor.document.languageId;
                doIt = true;
                if (inclang.length !== 0) {
                    if (inclang.indexOf(currentLanguageId) === -1) {
                        doIt = false;
                    }
                }
                if (doIt && exclang.length !== 0) {
                    if (exclang.indexOf(currentLanguageId) !== -1) {
                        doIt = false;
                    }
                }
            }
        }
        if (clearMe && !doIt) {
            // Clear decorations when language switches away
            var decor = [];
            for (var _i = 0; _i < decorationTypes.length; _i++) {
                var decorationType = decorationTypes[_i];
                activeEditor.setDecorations(decorationType, decor);
            }
            clearMe = false;
        }
        indentConfig();
        return doIt;
    }
    var timeout = null;
    function triggerUpdateDecorations() {
        if (timeout) {
            clearTimeout(timeout);
        }
        var updateDelay = vscode.workspace.getConfiguration('indentRainbow')['updateDelay'] || 100;
        timeout = setTimeout(updateDecorations, updateDelay);
    }
    function updateDecorations() {
        if (!activeEditor) {
            return;
        }
        var regEx = /^[\t ]+/gm;
        var text = activeEditor.document.getText();
        var tabsize = activeEditor.options.tabSize;
        var tabs = " ".repeat(tabsize);
        var ignoreLines = [];
        var error_decorator = [];
        var decorators = [];
        decorationTypes.forEach(function () {
            var decorator = [];
            decorators.push(decorator);
        });
        var match;
        var ignore;
        if (!skipAllErrors) {
            /**
             * Checks text against ignore regex patterns from config(or default).
             * stores the line positions of those lines in the ignoreLines array.
             */
            ignoreLinePatterns.forEach(function (ignorePattern) {
                while (ignore = ignorePattern.exec(text)) {
                    var pos = activeEditor.document.positionAt(ignore.index);
                    var line = activeEditor.document.lineAt(pos).lineNumber;
                    ignoreLines.push(line);
                }
            });
        }
        var re = new RegExp("\t", "g");
        while (match = regEx.exec(text)) {
            var pos = activeEditor.document.positionAt(match.index);
            var line = activeEditor.document.lineAt(pos).lineNumber;
            var skip = skipAllErrors || ignoreLines.indexOf(line) !== -1; // true if the lineNumber is in ignoreLines.
            var ma = (match[0].replace(re, tabs)).length;
            /**
             * Error handling.
             * When the indent spacing (as spaces) is not divisible by the tabsize,
             * consider the indent incorrect and mark it with the error decorator.
             * Checks for lines being ignored in ignoreLines array ( `skip` Boolran)
             * before considering the line an error.
             */
            if (!skip && ma % tabsize !== 0) {
                var startPos = activeEditor.document.positionAt(match.index);
                var endPos = activeEditor.document.positionAt(match.index + match[0].length);
                var decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: null };
                error_decorator.push(decoration);
            }
            else {
                var m = match[0];
                var l = m.length;
                var o = 0;
                var n = 0;
                while (n < l) {
                    var startPos = activeEditor.document.positionAt(match.index + n);
                    if (m[n] === "\t") {
                        n++;
                    }
                    else {
                        n += activeEditor.options.tabSize;
                    }
                    var endPos = activeEditor.document.positionAt(match.index + n);
                    var decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: null };
                    var decorator_index = o % decorators.length;
                    decorators[decorator_index].push(decoration);
                    o++;
                }
            }
        }
        decorationTypes.forEach(function (decorationType, index) {
            activeEditor.setDecorations(decorationType, decorators[index]);
        });
        activeEditor.setDecorations(error_decoration_type, error_decorator);
        clearMe = true;
    }
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map