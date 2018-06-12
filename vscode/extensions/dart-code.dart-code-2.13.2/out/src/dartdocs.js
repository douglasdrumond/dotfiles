"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const darkIconUrlFormat = "https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/ic_$1_white_36px.svg";
const lightIconUrlFormat = "https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/ic_$1_black_36px.svg";
const iconRegex = new RegExp(utils_1.escapeRegExp('<p><i class="material-icons md-36">')
    + "([\\w\\s_]+)"
    + utils_1.escapeRegExp('</i> &#x2014; material icon named "')
    + "([\\w\\s_]+)"
    + utils_1.escapeRegExp('".</p>'), "gi");
function cleanDartdoc(doc) {
    if (!doc)
        return "";
    // Clean up some dart.core dartdoc.
    const index = doc.indexOf("## Other resources");
    if (index !== -1)
        doc = doc.substring(0, index);
    // Remove colons from old-style references like [:foo:].
    doc = doc.replace(/\[:\S+:\]/g, (match) => `[${match.substring(2, match.length - 2)}]`);
    // Change any links without hyperlinks to just code syntax.
    // That is, anything in [squares] that isn't a [link](http://blah).
    // Note: To ensure we get things at the end, we need to match "not a paren or end of string"
    // and we need to put that character back in since the regex consumed it.
    doc = doc.replace(/\[(\S+)\]([^(]|$)/g, (match, one, two) => `\`${one}\`${two}`);
    // TODO: Use light/dark theme as appropriate.
    doc = doc.replace(iconRegex, `![$1](${darkIconUrlFormat}|width=100,height=100)`);
    return doc;
}
exports.cleanDartdoc = cleanDartdoc;
//# sourceMappingURL=dartdocs.js.map