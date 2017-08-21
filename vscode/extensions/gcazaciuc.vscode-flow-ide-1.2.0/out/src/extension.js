"use strict";
const HoverProvider_1 = require('./HoverProvider');
const AutocompleteProvider_1 = require('./AutocompleteProvider');
const CoverageProvider_1 = require('./CoverageProvider');
const SignatureProvider_1 = require('./SignatureProvider');
const DefinitionProvider_1 = require('./DefinitionProvider');
const Diagnostics_1 = require('./Diagnostics');
const utils_1 = require('./utils');
const FlowLib_1 = require('./FlowLib');
'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
const supportedLanguages = [
    "javascriptreact",
    "javascript"
];
let paramHintsEnable = false;
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    if (!utils_1.isFlowEnabled()) {
        return false;
    }
    // The registration needs to happen after a timeout because of 
    context.subscriptions.push(vscode.languages.registerSignatureHelpProvider([
        { language: 'javascript', scheme: 'file', pattern: '**/*js*' },
        { language: 'javascriptreact', scheme: 'file', pattern: '**/*js*' }
    ], new SignatureProvider_1.default(), '(', '.'));
    context.subscriptions.push(vscode.languages.registerHoverProvider([
        { language: 'javascript', scheme: 'file', pattern: '**/*js*' },
        { language: 'javascriptreact', scheme: 'file', pattern: '**/*js*' }
    ], new HoverProvider_1.default()));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider([
        { language: 'javascript', scheme: 'file', pattern: '**/*js*' },
        { language: 'javascriptreact', scheme: 'file', pattern: '**/*js*' }
    ], new AutocompleteProvider_1.default(), '.'));
    context.subscriptions.push(vscode.languages.registerDefinitionProvider([
        { language: 'javascript', scheme: 'file', pattern: '**/*js*' },
        { language: 'javascriptreact', scheme: 'file', pattern: '**/*js*' }
    ], new DefinitionProvider_1.default()));
    const coverage = new CoverageProvider_1.default(context.subscriptions);
    const refreshCoverage = () => {
        coverage.toggleDecorations();
        coverage.refreshCoverage();
    };
    const showFlowPath = () => {
        vscode.window.showInformationMessage(`Path to flow set to:${FlowLib_1.getPathToFlow()}`);
    };
    vscode.commands.registerCommand('flow.coverage', refreshCoverage);
    vscode.commands.registerCommand('flow.path', showFlowPath);
    Diagnostics_1.setupDiagnostics(context.subscriptions);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map