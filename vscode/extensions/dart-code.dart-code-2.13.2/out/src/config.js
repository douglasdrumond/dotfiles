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
const vscode_1 = require("vscode");
const utils_1 = require("./utils");
class Config {
    constructor() {
        vscode_1.workspace.onDidChangeConfiguration((e) => this.loadConfig());
        this.loadConfig();
    }
    loadConfig() {
        this.config = vscode_1.workspace.getConfiguration("dart");
    }
    getConfig(key) {
        return this.config.get(key);
    }
    setConfig(key, value, target) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.config.update(key, value, target);
            this.loadConfig();
        });
    }
    get allowAnalytics() { return this.getConfig("allowAnalytics"); }
    get analyzeAngularTemplates() { return this.getConfig("analyzeAngularTemplates"); }
    get analyzerDiagnosticsPort() { return this.getConfig("analyzerDiagnosticsPort"); }
    get analyzerObservatoryPort() { return this.getConfig("analyzerObservatoryPort"); }
    get analyzerLogFile() { return utils_1.resolveHomePath(this.getConfig("analyzerLogFile")); }
    get analyzerPath() { return utils_1.resolveHomePath(this.getConfig("analyzerPath")); }
    get analysisServerFolding() { return this.getConfig("analysisServerFolding"); }
    get analyzerInstrumentationLogFile() { return utils_1.resolveHomePath(this.getConfig("analyzerInstrumentationLogFile")); }
    get analyzerAdditionalArgs() { return this.getConfig("analyzerAdditionalArgs"); }
    get checkForSdkUpdates() { return this.getConfig("checkForSdkUpdates"); }
    get closingLabels() { return this.getConfig("closingLabels"); }
    get flutterDaemonLogFile() { return utils_1.resolveHomePath(this.getConfig("flutterDaemonLogFile")); }
    get flutterHotReloadOnSave() { return this.getConfig("flutterHotReloadOnSave"); }
    get flutterCreateOrganization() { return this.getConfig("flutterCreateOrganization"); }
    get flutterCreateIOSLanguage() { return this.getConfig("flutterCreateIOSLanguage"); }
    get flutterCreateAndroidLanguage() { return this.getConfig("flutterCreateAndroidLanguage"); }
    get flutterSdkPath() { return utils_1.resolveHomePath(this.getConfig("flutterSdkPath")); }
    setFlutterSdkPath(value) { return this.setConfig("flutterSdkPath", value, vscode_1.ConfigurationTarget.Workspace); }
    get flutterSdkPaths() { return (this.getConfig("flutterSdkPaths") || []).map(utils_1.resolveHomePath); }
    get showLintNames() { return this.getConfig("showLintNames"); }
    get showTodos() { return this.getConfig("showTodos"); }
    get reportAnalyzerErrors() { return this.getConfig("reportAnalyzerErrors"); }
    get sdkPath() { return utils_1.resolveHomePath(this.getConfig("sdkPath")); }
    setSdkPath(value) { return this.setConfig("sdkPath", value, vscode_1.ConfigurationTarget.Workspace); }
    get sdkPaths() { return (this.getConfig("sdkPaths") || []).map(utils_1.resolveHomePath); }
    get flutterSelectDeviceWhenConnected() { return this.getConfig("flutterSelectDeviceWhenConnected"); }
    setGlobalDartSdkPath(value) { return this.setConfig("sdkPath", value, vscode_1.ConfigurationTarget.Global); }
    setGlobalFlutterSdkPath(value) { return this.setConfig("flutterSdkPath", value, vscode_1.ConfigurationTarget.Global); }
    // Preview features.
    get previewExperimentalWindowsDriveLetterHandling() { return this.getConfig("previewExperimentalWindowsDriveLetterHandling"); }
    for(uri) {
        return new ResourceConfig(uri);
    }
}
class ResourceConfig {
    constructor(uri) {
        this.uri = uri;
        this.config = vscode_1.workspace.getConfiguration("dart", this.uri);
    }
    getConfig(key) {
        return this.config.get(key);
    }
    get debugSdkLibraries() { return this.getConfig("debugSdkLibraries"); }
    get debugExternalLibraries() { return this.getConfig("debugExternalLibraries"); }
    get insertArgumentPlaceholders() { return this.getConfig("insertArgumentPlaceholders"); }
    get lineLength() { return this.getConfig("lineLength"); }
    get pubAdditionalArgs() { return this.getConfig("pubAdditionalArgs"); }
    get runPubGetOnPubspecChanges() { return this.getConfig("runPubGetOnPubspecChanges"); }
    get flutterRunLogFile() { return utils_1.resolveHomePath(this.getConfig("flutterRunLogFile")); }
    get flutterTestLogFile() { return utils_1.resolveHomePath(this.getConfig("flutterTestLogFile")); }
    get observatoryLogFile() { return utils_1.resolveHomePath(this.getConfig("observatoryLogFile")); }
    get promptToGetPackages() { return this.getConfig("promptToGetPackages"); }
    get vmAdditionalArgs() { return this.getConfig("vmAdditionalArgs"); }
}
exports.config = new Config();
//# sourceMappingURL=config.js.map