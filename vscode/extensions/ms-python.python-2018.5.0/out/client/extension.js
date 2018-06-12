'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// This line should always be right on top.
// tslint:disable-next-line:no-any
if (Reflect.metadata === undefined) {
    // tslint:disable-next-line:no-require-imports no-var-requires
    require('reflect-metadata');
}
const inversify_1 = require("inversify");
const vscode_1 = require("vscode");
const serviceRegistry_1 = require("./activation/serviceRegistry");
const types_1 = require("./activation/types");
const configSettings_1 = require("./common/configSettings");
const constants_1 = require("./common/constants");
const featureDeprecationManager_1 = require("./common/featureDeprecationManager");
const helpers_1 = require("./common/helpers");
const pythonInstallation_1 = require("./common/installer/pythonInstallation");
const serviceRegistry_2 = require("./common/installer/serviceRegistry");
const serviceRegistry_3 = require("./common/platform/serviceRegistry");
const serviceRegistry_4 = require("./common/process/serviceRegistry");
const serviceRegistry_5 = require("./common/serviceRegistry");
const stopWatch_1 = require("./common/stopWatch");
const types_2 = require("./common/terminal/types");
const types_3 = require("./common/types");
const serviceRegistry_6 = require("./common/variables/serviceRegistry");
const serviceRegistry_7 = require("./debugger/configProviders/serviceRegistry");
const types_4 = require("./debugger/types");
const serviceRegistry_8 = require("./formatters/serviceRegistry");
const types_5 = require("./interpreter/configuration/types");
const contracts_1 = require("./interpreter/contracts");
const serviceRegistry_9 = require("./interpreter/serviceRegistry");
const container_1 = require("./ioc/container");
const serviceManager_1 = require("./ioc/serviceManager");
const types_6 = require("./ioc/types");
const linterCommands_1 = require("./linters/linterCommands");
const serviceRegistry_10 = require("./linters/serviceRegistry");
const types_7 = require("./linters/types");
const formatProvider_1 = require("./providers/formatProvider");
const linterProvider_1 = require("./providers/linterProvider");
const renameProvider_1 = require("./providers/renameProvider");
const replProvider_1 = require("./providers/replProvider");
const simpleRefactorProvider_1 = require("./providers/simpleRefactorProvider");
const terminalProvider_1 = require("./providers/terminalProvider");
const updateSparkLibraryProvider_1 = require("./providers/updateSparkLibraryProvider");
const sortImports = require("./sortImports");
const telemetry_1 = require("./telemetry");
const constants_2 = require("./telemetry/constants");
const serviceRegistry_11 = require("./terminals/serviceRegistry");
const types_8 = require("./terminals/types");
const blockFormatProvider_1 = require("./typeFormatters/blockFormatProvider");
const onEnterFormatter_1 = require("./typeFormatters/onEnterFormatter");
const constants_3 = require("./unittests/common/constants");
const serviceRegistry_12 = require("./unittests/serviceRegistry");
const main_1 = require("./workspaceSymbols/main");
const activationDeferred = helpers_1.createDeferred();
exports.activated = activationDeferred.promise;
// tslint:disable-next-line:max-func-body-length
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const cont = new inversify_1.Container();
        const serviceManager = new serviceManager_1.ServiceManager(cont);
        const serviceContainer = new container_1.ServiceContainer(cont);
        registerServices(context, serviceManager, serviceContainer);
        const interpreterManager = serviceContainer.get(contracts_1.IInterpreterService);
        // This must be completed before we can continue as language server needs the interpreter path.
        interpreterManager.initialize();
        yield interpreterManager.autoSetInterpreter();
        const configuration = serviceManager.get(types_3.IConfigurationService);
        const pythonSettings = configuration.getSettings();
        const standardOutputChannel = serviceManager.get(types_3.IOutputChannel, constants_1.STANDARD_OUTPUT_CHANNEL);
        context.subscriptions.push(vscode_1.languages.registerRenameProvider(constants_1.PYTHON, new renameProvider_1.PythonRenameProvider(serviceManager)));
        simpleRefactorProvider_1.activateSimplePythonRefactorProvider(context, standardOutputChannel, serviceManager);
        const activationService = serviceContainer.get(types_1.IExtensionActivationService);
        yield activationService.activate();
        sortImports.activate(context, standardOutputChannel, serviceManager);
        serviceManager.get(types_8.ICodeExecutionManager).registerCommands();
        sendStartupTelemetry(exports.activated, serviceContainer).ignoreErrors();
        const pythonInstaller = new pythonInstallation_1.PythonInstaller(serviceContainer);
        pythonInstaller.checkPythonInstallation(configSettings_1.PythonSettings.getInstance())
            .catch(ex => console.error('Python Extension: pythonInstaller.checkPythonInstallation', ex));
        interpreterManager.refresh()
            .catch(ex => console.error('Python Extension: interpreterManager.refresh', ex));
        const jupyterExtension = vscode_1.extensions.getExtension('donjayamanne.jupyter');
        const lintingEngine = serviceManager.get(types_7.ILintingEngine);
        lintingEngine.linkJupiterExtension(jupyterExtension).ignoreErrors();
        context.subscriptions.push(new linterCommands_1.LinterCommands(serviceManager));
        const linterProvider = new linterProvider_1.LinterProvider(context, serviceManager);
        context.subscriptions.push(linterProvider);
        // Enable indentAction
        // tslint:disable-next-line:no-non-null-assertion
        vscode_1.languages.setLanguageConfiguration(constants_1.PYTHON_LANGUAGE, {
            onEnterRules: [
                {
                    beforeText: /^\s*(?:def|class|for|if|elif|else|while|try|with|finally|except|async)\b.*:\s*/,
                    action: { indentAction: vscode_1.IndentAction.Indent }
                },
                {
                    beforeText: /^\s*#.*/,
                    afterText: /.+$/,
                    action: { indentAction: vscode_1.IndentAction.None, appendText: '# ' }
                },
                {
                    beforeText: /^\s+(continue|break|return)\b.*/,
                    afterText: /\s+$/,
                    action: { indentAction: vscode_1.IndentAction.Outdent }
                }
            ]
        });
        if (pythonSettings && pythonSettings.formatting && pythonSettings.formatting.provider !== 'none') {
            const formatProvider = new formatProvider_1.PythonFormattingEditProvider(context, serviceContainer);
            context.subscriptions.push(vscode_1.languages.registerDocumentFormattingEditProvider(constants_1.PYTHON, formatProvider));
            context.subscriptions.push(vscode_1.languages.registerDocumentRangeFormattingEditProvider(constants_1.PYTHON, formatProvider));
        }
        context.subscriptions.push(vscode_1.languages.registerOnTypeFormattingEditProvider(constants_1.PYTHON, new blockFormatProvider_1.BlockFormatProviders(), ':'));
        context.subscriptions.push(vscode_1.languages.registerOnTypeFormattingEditProvider(constants_1.PYTHON, new onEnterFormatter_1.OnEnterFormatter(), '\n'));
        const persistentStateFactory = serviceManager.get(types_3.IPersistentStateFactory);
        const deprecationMgr = new featureDeprecationManager_1.FeatureDeprecationManager(persistentStateFactory, !!jupyterExtension);
        deprecationMgr.initialize();
        context.subscriptions.push(new featureDeprecationManager_1.FeatureDeprecationManager(persistentStateFactory, !!jupyterExtension));
        context.subscriptions.push(serviceContainer.get(types_5.IInterpreterSelector));
        context.subscriptions.push(updateSparkLibraryProvider_1.activateUpdateSparkLibraryProvider());
        context.subscriptions.push(new replProvider_1.ReplProvider(serviceContainer));
        context.subscriptions.push(new terminalProvider_1.TerminalProvider(serviceContainer));
        context.subscriptions.push(new main_1.WorkspaceSymbols(serviceContainer));
        serviceContainer.getAll(types_4.IDebugConfigurationProvider).forEach(debugConfig => {
            context.subscriptions.push(vscode_1.debug.registerDebugConfigurationProvider(debugConfig.debugType, debugConfig));
        });
        activationDeferred.resolve();
    });
}
exports.activate = activate;
function registerServices(context, serviceManager, serviceContainer) {
    serviceManager.addSingletonInstance(types_6.IServiceContainer, serviceContainer);
    serviceManager.addSingletonInstance(types_6.IServiceManager, serviceManager);
    serviceManager.addSingletonInstance(types_3.IDisposableRegistry, context.subscriptions);
    serviceManager.addSingletonInstance(types_3.IMemento, context.globalState, types_3.GLOBAL_MEMENTO);
    serviceManager.addSingletonInstance(types_3.IMemento, context.workspaceState, types_3.WORKSPACE_MEMENTO);
    serviceManager.addSingletonInstance(types_3.IExtensionContext, context);
    const standardOutputChannel = vscode_1.window.createOutputChannel('Python');
    const unitTestOutChannel = vscode_1.window.createOutputChannel('Python Test Log');
    serviceManager.addSingletonInstance(types_3.IOutputChannel, standardOutputChannel, constants_1.STANDARD_OUTPUT_CHANNEL);
    serviceManager.addSingletonInstance(types_3.IOutputChannel, unitTestOutChannel, constants_3.TEST_OUTPUT_CHANNEL);
    serviceRegistry_1.registerTypes(serviceManager);
    serviceRegistry_5.registerTypes(serviceManager);
    serviceRegistry_4.registerTypes(serviceManager);
    serviceRegistry_6.registerTypes(serviceManager);
    serviceRegistry_12.registerTypes(serviceManager);
    serviceRegistry_10.registerTypes(serviceManager);
    serviceRegistry_9.registerTypes(serviceManager);
    serviceRegistry_8.registerTypes(serviceManager);
    serviceRegistry_3.registerTypes(serviceManager);
    serviceRegistry_2.registerTypes(serviceManager);
    serviceRegistry_11.registerTypes(serviceManager);
    serviceRegistry_7.registerTypes(serviceManager);
}
function sendStartupTelemetry(activatedPromise, serviceContainer) {
    return __awaiter(this, void 0, void 0, function* () {
        const stopWatch = new stopWatch_1.StopWatch();
        const logger = serviceContainer.get(types_3.ILogger);
        try {
            yield activatedPromise;
            const terminalHelper = serviceContainer.get(types_2.ITerminalHelper);
            const terminalShellType = terminalHelper.identifyTerminalShell(terminalHelper.getTerminalShellPath());
            const duration = stopWatch.elapsedTime;
            const condaLocator = serviceContainer.get(contracts_1.ICondaService);
            const condaVersion = yield condaLocator.getCondaVersion().catch(() => undefined);
            const props = { condaVersion, terminal: terminalShellType };
            telemetry_1.sendTelemetryEvent(constants_2.EDITOR_LOAD, duration, props);
        }
        catch (ex) {
            logger.logError('sendStartupTelemetry failed.', ex);
        }
    });
}
//# sourceMappingURL=extension.js.map