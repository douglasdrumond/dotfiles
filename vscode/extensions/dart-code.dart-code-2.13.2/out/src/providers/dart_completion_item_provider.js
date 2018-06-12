"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const config_1 = require("../config");
const dartdocs_1 = require("../dartdocs");
const utils_1 = require("../utils");
class DartCompletionItemProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideCompletionItems(document, position, token, context) {
        if (!this.shouldAllowCompletion(document, position, context))
            return;
        // Stash the next character so that we can avoid inserted additional parens if they already exist immediately after the cursor.
        const nextCharacter = document.getText(new vscode_1.Range(position, position.translate({ characterDelta: 200 }))).trim().substr(0, 1);
        return new Promise((resolve, reject) => {
            this.analyzer.completionGetSuggestionsResults({
                file: utils_1.fsPath(document.uri),
                offset: document.offsetAt(position),
            }).then((resp) => {
                resolve(new vscode_1.CompletionList(resp.results.map((r) => this.convertResult(document, nextCharacter, resp, r))));
            }, () => reject());
        });
    }
    shouldAllowCompletion(document, position, context) {
        // Filter out auto triggered completions on certain characters based on the previous
        // characters (eg. to allow completion on " if it's part of an import).
        if (context.triggerKind === vscode_1.CompletionTriggerKind.TriggerCharacter) {
            const line = document.lineAt(position.line).text.slice(0, position.character);
            switch (context.triggerCharacter) {
                case "{":
                    return line.endsWith("${");
                case "'":
                    return line.endsWith("import '") || line.endsWith("export '");
                case "\"":
                    return line.endsWith("import \"") || line.endsWith("export \"");
                case "/":
                case "\\":
                    return line.startsWith("import \"") || line.startsWith("export \"")
                        || line.startsWith("import '") || line.startsWith("export '");
            }
        }
        // Otherwise, allow through.
        return true;
    }
    convertResult(document, nextCharacter, notification, suggestion) {
        const element = suggestion.element;
        const elementKind = element ? this.getElementKind(element.kind) : null;
        let label = suggestion.displayText || suggestion.completion;
        let detail = "";
        const completionText = new vscode_1.SnippetString();
        let triggerCompletion = false;
        const insertArgumentPlaceholders = config_1.config.for(document.uri).insertArgumentPlaceholders;
        const nextCharacterIsOpenParen = nextCharacter === "(";
        const nextCharacterIsColon = nextCharacter === ":";
        // If element has parameters (METHOD/CONSTRUCTOR/FUNCTION), show its parameters.
        if (element && element.parameters && elementKind !== vscode_1.CompletionItemKind.Property && suggestion.kind !== "OVERRIDE"
            // Don't ever show if there is already a paren! (#969).
            && label.indexOf("(") === -1) {
            label += element.parameters.length === 2 ? "()" : "(…)";
            detail = element.parameters;
            const hasParams = suggestion.parameterNames && suggestion.parameterNames.length > 0;
            // Add placeholders for params to the completion.
            if (insertArgumentPlaceholders && hasParams && !nextCharacterIsOpenParen) {
                completionText.appendText(suggestion.completion);
                const args = suggestion.parameterNames.slice(0, suggestion.requiredParameterCount);
                completionText.appendText("(");
                if (args.length) {
                    completionText.appendPlaceholder(args[0]);
                    for (const arg of args.slice(1)) {
                        completionText.appendText(", ");
                        completionText.appendPlaceholder(arg);
                    }
                }
                else
                    completionText.appendPlaceholder(""); // Put a tap stop between parens since there are optional args.
                completionText.appendText(")");
                completionText.appendPlaceholder("");
            }
            else if (!nextCharacterIsOpenParen) {
                completionText.appendText(suggestion.completion);
                completionText.appendText("(");
                if (hasParams)
                    completionText.appendPlaceholder("");
                completionText.appendText(")");
            }
            else {
                completionText.appendText(suggestion.completion);
            }
        }
        else if (suggestion.selectionOffset > 0) {
            const before = suggestion.completion.slice(0, suggestion.selectionOffset);
            const selection = suggestion.completion.slice(suggestion.selectionOffset, suggestion.selectionOffset + suggestion.selectionLength);
            // If we have a selection offset (eg. a place to put the cursor) but not any text to pre-select then
            // pop open the completion to help the user type the value.
            // Only do this if it ends with a space (argument completion), see #730.
            if (!selection && suggestion.completion.slice(suggestion.selectionOffset - 1, suggestion.selectionOffset) === " ")
                triggerCompletion = true;
            const after = suggestion.completion.slice(suggestion.selectionOffset + suggestion.selectionLength);
            completionText.appendText(before);
            completionText.appendPlaceholder(selection || "");
            completionText.appendText(after);
        }
        else {
            completionText.appendText(suggestion.completion);
        }
        // If we're a property, work out the type.
        if (elementKind === vscode_1.CompletionItemKind.Property) {
            // Setters appear as methods with one arg (and cause getters to not appear),
            // so treat them both the same and just display with the properties type.
            detail = element.kind === "GETTER"
                ? element.returnType
                // See https://github.com/dart-lang/sdk/issues/27747
                : element.parameters ? element.parameters.substring(1, element.parameters.lastIndexOf(" ")) : "";
            // Otherwise, get return type from method.
        }
        else if (element && element.returnType) {
            detail =
                detail === ""
                    ? element.returnType
                    : detail + " → " + element.returnType;
        }
        else if (suggestion.parameterType) {
            detail = suggestion.parameterType;
        }
        // If we have trailing commas (flutter) they look weird in the list, so trim the off (for display label only).
        if (label.endsWith(","))
            label = label.substr(0, label.length - 1).trim();
        const kind = suggestion.element
            ? this.getElementKind(suggestion.element.kind)
            : this.getSuggestionKind(suggestion.kind);
        const completion = new vscode_1.CompletionItem(label, kind);
        completion.label = label;
        completion.kind = kind;
        completion.detail = (suggestion.isDeprecated ? "(deprecated) " : "") + detail;
        completion.documentation = new vscode_1.MarkdownString(dartdocs_1.cleanDartdoc(suggestion.docSummary));
        completion.insertText = completionText;
        completion.range = new vscode_1.Range(document.positionAt(notification.replacementOffset), document.positionAt(notification.replacementOffset + notification.replacementLength));
        const triggerCompletionsFor = ["import '';"];
        if (triggerCompletionsFor.indexOf(label) !== -1)
            triggerCompletion = true;
        // Handle folders in imports better.
        if (suggestion.kind === "IMPORT" && label.endsWith("/"))
            triggerCompletion = true;
        if (triggerCompletion) {
            completion.command = {
                command: "editor.action.triggerSuggest",
                title: "Suggest",
            };
        }
        // Relevance is a number, highest being best. Code sorts by text, so subtract from a large number so that
        // a text sort will result in the correct order.
        // 555 -> 999455
        //  10 -> 999990
        //   1 -> 999999
        completion.sortText = (1000000 - suggestion.relevance).toString();
        return completion;
    }
    getSuggestionKind(kind) {
        switch (kind) {
            case "ARGUMENT_LIST":
                return vscode_1.CompletionItemKind.Variable;
            case "IMPORT":
                return vscode_1.CompletionItemKind.Module;
            case "IDENTIFIER":
                return vscode_1.CompletionItemKind.Variable;
            case "INVOCATION":
                return vscode_1.CompletionItemKind.Method;
            case "KEYWORD":
                return vscode_1.CompletionItemKind.Keyword;
            case "NAMED_ARGUMENT":
                return vscode_1.CompletionItemKind.Variable;
            case "OPTIONAL_ARGUMENT":
                return vscode_1.CompletionItemKind.Variable;
            case "PARAMETER":
                return vscode_1.CompletionItemKind.Value;
        }
    }
    getElementKind(kind) {
        switch (kind) {
            case "CLASS":
            case "CLASS_TYPE_ALIAS":
                return vscode_1.CompletionItemKind.Class;
            case "COMPILATION_UNIT":
                return vscode_1.CompletionItemKind.Module;
            case "CONSTRUCTOR":
            case "CONSTRUCTOR_INVOCATION":
                return vscode_1.CompletionItemKind.Constructor;
            case "ENUM":
            case "ENUM_CONSTANT":
                return vscode_1.CompletionItemKind.Enum;
            case "FIELD":
                return vscode_1.CompletionItemKind.Field;
            case "FILE":
                return vscode_1.CompletionItemKind.File;
            case "FUNCTION":
            case "FUNCTION_TYPE_ALIAS":
                return vscode_1.CompletionItemKind.Function;
            case "GETTER":
                return vscode_1.CompletionItemKind.Property;
            case "LABEL":
            case "LIBRARY":
                return vscode_1.CompletionItemKind.Module;
            case "LOCAL_VARIABLE":
                return vscode_1.CompletionItemKind.Variable;
            case "METHOD":
                return vscode_1.CompletionItemKind.Method;
            case "PARAMETER":
            case "PREFIX":
                return vscode_1.CompletionItemKind.Variable;
            case "SETTER":
                return vscode_1.CompletionItemKind.Property;
            case "TOP_LEVEL_VARIABLE":
            case "TYPE_PARAMETER":
                return vscode_1.CompletionItemKind.Variable;
            case "UNIT_TEST_GROUP":
                return vscode_1.CompletionItemKind.Module;
            case "UNIT_TEST_TEST":
                return vscode_1.CompletionItemKind.Method;
            case "UNKNOWN":
                return vscode_1.CompletionItemKind.Value;
        }
    }
}
exports.DartCompletionItemProvider = DartCompletionItemProvider;
//# sourceMappingURL=dart_completion_item_provider.js.map