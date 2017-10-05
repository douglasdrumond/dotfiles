"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class StringStack {
    constructor() {
        this.stack = [];
    }
    /**
     * fromString
     */
    fromString(input) {
        if (input !== "") {
            this.stack = JSON.parse(input);
        }
    }
    /**
     * toString
     */
    toString() {
        return JSON.stringify(this.stack);
    }
    /**
     * push
     */
    push(item) {
        let index = this.stack.indexOf(item);
        if (index > -1) {
            this.stack.splice(index, 1);
        }
        this.stack.push(item);
    }
    /**
     * pop
     */
    pop() {
        return this.stack.pop();
    }
    /**
     * length
     */
    length() {
        return this.stack.length;
    }
    /**
     * getItem
     */
    getItem(index) {
        if (index < 0) {
            return "";
        }
        if (this.stack.length === 0) {
            return "";
        }
        return this.stack[index];
    }
}
exports.StringStack = StringStack;
//# sourceMappingURL=stack.js.map