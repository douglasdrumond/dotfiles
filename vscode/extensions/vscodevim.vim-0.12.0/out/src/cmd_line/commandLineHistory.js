"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const configuration_1 = require("../configuration/configuration");
const logger_1 = require("../util/logger");
class CommandLineHistory {
    constructor() {
        this._history = [];
        this._is_loading = false;
        this._filePath = '';
    }
    add(command) {
        if (!command || command.length === 0) {
            return;
        }
        let index = this._history.indexOf(command);
        if (index !== -1) {
            this._history.splice(index, 1);
        }
        this._history.unshift(command);
        if (this._history.length > configuration_1.configuration.history) {
            this._history.pop();
        }
    }
    get() {
        if (this._history.length > configuration_1.configuration.history) {
            // resize history because "vim.history" is updated.
            this._history = this._history.slice(0, configuration_1.configuration.history);
            this.save();
        }
        return this._history;
    }
    setFilePath(filePath) {
        this._filePath = filePath;
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            this._history = [];
            this._is_loading = true;
            return new Promise((resolve, reject) => {
                const fs = require('fs');
                fs.readFile(this._filePath, 'utf-8', (err, data) => {
                    this._is_loading = false;
                    if (err) {
                        if (err.code === 'ENOENT') {
                            logger_1.Logger.debug('CommandLineHistory: History does not exist.');
                            // add ccommands that were run before history was loaded.
                            if (this._history.length > 0) {
                                this.save();
                            }
                            resolve();
                        }
                        else {
                            logger_1.Logger.error(err.message, 'Failed to load history.');
                            reject();
                        }
                        return;
                    }
                    try {
                        let parsedData = JSON.parse(data);
                        if (Array.isArray(parsedData)) {
                            let not_saved_history = this._history;
                            this._history = parsedData;
                            // add ccommands that were run before history was loaded.
                            if (not_saved_history.length > 0) {
                                for (let cmd of not_saved_history.reverse()) {
                                    this.add(cmd);
                                }
                                this.save();
                            }
                            resolve();
                        }
                        else {
                            logger_1.Logger.error('CommandLineHistory: The history format is unknown.', 'Failed to load history.');
                            reject();
                        }
                    }
                    catch (e) {
                        logger_1.Logger.error(e.message, 'Failed to load history.');
                        reject();
                    }
                });
            });
        });
    }
    save() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (this._is_loading) {
                    logger_1.Logger.debug('CommandLineHistory: Failed to save history because history is loading.');
                    resolve();
                    return;
                }
                const fs = require('fs');
                fs.writeFile(this._filePath, JSON.stringify(this._history), 'utf-8', (err) => {
                    if (!err) {
                        resolve();
                    }
                    else {
                        logger_1.Logger.error(err.message, 'Failed to save history.');
                        reject();
                    }
                });
            });
        });
    }
}
exports.CommandLineHistory = CommandLineHistory;

//# sourceMappingURL=commandLineHistory.js.map
