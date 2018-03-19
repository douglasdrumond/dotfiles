"use strict";
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
        return this.config.update(key, value, target).then(() => this.loadConfig());
    }
    get allowAnalytics() { return this.getConfig("allowAnalytics"); }
    get analyzerDiagnosticsPort() { return this.getConfig("analyzerDiagnosticsPort"); }
    get analyzerObservatoryPort() { return this.getConfig("analyzerObservatoryPort"); }
    get analyzerLogFile() { return utils_1.resolveHomePath(this.getConfig("analyzerLogFile")); }
    get analyzerPath() { return utils_1.resolveHomePath(this.getConfig("analyzerPath")); }
    get analyzerInstrumentationLogFile() { return utils_1.resolveHomePath(this.getConfig("analyzerInstrumentationLogFile")); }
    get analyzerAdditionalArgs() { return this.getConfig("analyzerAdditionalArgs"); }
    get checkForSdkUpdates() { return this.getConfig("checkForSdkUpdates"); }
    get closingLabels() { return this.getConfig("closingLabels"); }
    get flutterDaemonLogFile() { return utils_1.resolveHomePath(this.getConfig("flutterDaemonLogFile")); }
    get flutterHotReloadOnSave() { return this.getConfig("flutterHotReloadOnSave"); }
    get flutterSdkPath() { return utils_1.resolveHomePath(this.getConfig("flutterSdkPath")); }
    get showLintNames() { return this.getConfig("showLintNames"); }
    get showTodos() { return this.getConfig("showTodos"); }
    get reportAnalyzerErrors() { return this.getConfig("reportAnalyzerErrors"); }
    get userDefinedSdkPath() { return utils_1.resolveHomePath(this.getConfig("sdkPath")); }
    setUserDefinedSdkPath(value) { return this.setConfig("sdkPath", value, vscode_1.ConfigurationTarget.Workspace); }
    get sdkPaths() { return (this.getConfig("sdkPaths") || []).map(utils_1.resolveHomePath); }
    setGlobalDartSdkPath(value) { return this.setConfig("sdkPath", value, vscode_1.ConfigurationTarget.Global); }
    setGlobalFlutterSdkPath(value) { return this.setConfig("flutterSdkPath", value, vscode_1.ConfigurationTarget.Global); }
    // Preview features.
    get previewDart2() { return this.getConfig("previewDart2"); }
    get previewAnalyzeAngularTemplates() { return this.getConfig("previewAnalyzeAngularTemplates"); }
    for(uri) {
        return new ResourceConfig(uri, this.setConfig.bind(this));
    }
}
class ResourceConfig {
    constructor(uri, setConfig) {
        this.uri = uri;
        this.setConfig = setConfig;
        vscode_1.workspace.onDidChangeConfiguration((e) => this.loadConfig());
        this.loadConfig();
    }
    loadConfig() {
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
    get observatoryLogFile() { return utils_1.resolveHomePath(this.getConfig("observatoryLogFile")); }
    get promptToFetchPackages() { return this.getConfig("promptToFetchPackages"); }
}
class CodeCapabilities {
    constructor(version) {
        this.version = version;
    }
    get hasScrollableHovers() { return utils_1.versionIsAtLeast(this.version, "1.6.0"); }
}
exports.CodeCapabilities = CodeCapabilities;
exports.config = new Config();
exports.vsCodeVersion = new CodeCapabilities(vscode_1.version);
//# sourceMappingURL=config.js.map