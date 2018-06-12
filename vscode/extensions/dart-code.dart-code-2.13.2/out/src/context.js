"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Context {
    constructor(context) {
        this.context = context;
    }
    static for(context) {
        return new Context(context);
    }
}
exports.Context = Context;
//# sourceMappingURL=context.js.map