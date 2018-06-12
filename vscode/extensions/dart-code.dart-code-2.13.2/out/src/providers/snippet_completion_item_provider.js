"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const util_1 = require("util");
const vscode_1 = require("vscode");
class SnippetCompletionItemProvider {
    constructor(filename, shouldRender) {
        this.completions = new vscode_1.CompletionList();
        this.shouldRender = shouldRender;
        const snippets = require(path.join("../../..", filename));
        for (const snippetType of Object.keys(snippets)) {
            for (const snippetName of Object.keys(snippets[snippetType])) {
                const snippet = snippets[snippetType][snippetName];
                const completionItem = new vscode_1.CompletionItem(snippetName, vscode_1.CompletionItemKind.Snippet);
                completionItem.filterText = snippet.prefix;
                completionItem.insertText = new vscode_1.SnippetString(util_1.isArray(snippet.body)
                    ? snippet.body.join("\n")
                    : snippet.body);
                completionItem.detail = snippet.description;
                completionItem.documentation = new vscode_1.MarkdownString().appendCodeblock(completionItem.insertText.value);
                completionItem.sortText = "zzzzzzzzzzzzzzzzzzzzzz";
                this.completions.items.push(completionItem);
            }
        }
    }
    provideCompletionItems(document, position, token) {
        if (this.shouldRender(document.uri))
            return this.completions;
    }
}
exports.SnippetCompletionItemProvider = SnippetCompletionItemProvider;
//# sourceMappingURL=snippet_completion_item_provider.js.map