"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const util = require("./utils");
const vs = require("vscode");
const analytics_1 = require("./analytics");
const analyzer_1 = require("./analysis/analyzer");
const analyzer_status_reporter_1 = require("./analyzer_status_reporter");
const config_1 = require("./config");
const edit_1 = require("./commands/edit");
const dart_completion_item_provider_1 = require("./providers/dart_completion_item_provider");
const dart_definition_provider_1 = require("./providers/dart_definition_provider");
const dart_reference_provider_1 = require("./providers/dart_reference_provider");
const dart_diagnostic_provider_1 = require("./providers/dart_diagnostic_provider");
const dart_formatting_edit_provider_1 = require("./providers/dart_formatting_edit_provider");
const dart_type_formatting_edit_provider_1 = require("./providers/dart_type_formatting_edit_provider");
const dart_highlighting_provider_1 = require("./providers/dart_highlighting_provider");
const dart_hover_provider_1 = require("./providers/dart_hover_provider");
const dart_language_configuration_1 = require("./providers/dart_language_configuration");
const dart_document_symbol_provider_1 = require("./providers/dart_document_symbol_provider");
const dart_workspace_symbol_provider_1 = require("./providers/dart_workspace_symbol_provider");
const legacy_dart_workspace_symbol_provider_1 = require("./providers/legacy_dart_workspace_symbol_provider");
const dart_rename_provider_1 = require("./providers/dart_rename_provider");
const file_change_handler_1 = require("./file_change_handler");
const flutter_daemon_1 = require("./flutter/flutter_daemon");
const open_file_tracker_1 = require("./open_file_tracker");
const sdk_1 = require("./commands/sdk");
const debug_1 = require("./commands/debug");
const type_hierarchy_1 = require("./commands/type_hierarchy");
const packages_view_1 = require("./views/packages_view");
const project_upgrade_1 = require("./project_upgrade");
const user_prompts_1 = require("./user_prompts");
const closing_labels_decorations_1 = require("./decorations/closing_labels_decorations");
const debug_config_provider_1 = require("./providers/debug_config_provider");
const pub_1 = require("./pub/pub");
const snippet_completion_item_provider_1 = require("./providers/snippet_completion_item_provider");
const utils_1 = require("./utils");
const fix_code_action_provider_1 = require("./providers/fix_code_action_provider");
const assist_code_action_provider_1 = require("./providers/assist_code_action_provider");
const legacy_debug_config_provider_1 = require("./providers/legacy_debug_config_provider");
const DART_MODE = [{ language: "dart", scheme: "file" }];
const HTML_MODE = [{ language: "html", scheme: "file" }];
const DART_PROJECT_LOADED = "dart-code:dartProjectLoaded";
const FLUTTER_PROJECT_LOADED = "dart-code:flutterProjectLoaded";
exports.SERVICE_EXTENSION_CONTEXT_PREFIX = "dart-code:serviceExtension.";
let analyzer;
let flutterDaemon;
let analysisRoots = [];
let analytics;
let showTodos = config_1.config.showTodos;
let showLintNames = config_1.config.showLintNames;
let analyzerSettings = getAnalyzerSettings();
function activate(context) {
    const extensionStartTime = new Date();
    const sdks = util.findSdks();
    analytics = new analytics_1.Analytics(sdks);
    if (sdks.dart == null) {
        // HACK: In order to provide a more useful message if the user was trying to fun flutter.newProject
        // we need to hook the command and force the project type to Flutter to get the correct error message.
        // This can be reverted and improved if Code adds support for providing activation context:
        //     https://github.com/Microsoft/vscode/issues/44711
        let runningFlutterCommand;
        context.subscriptions.push(vs.commands.registerCommand("flutter.createProject", (_) => {
            sdks.projectType = util.ProjectType.Flutter;
            runningFlutterCommand = "Flutter: New Project";
        }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.doctor", (_) => {
            sdks.projectType = util.ProjectType.Flutter;
            runningFlutterCommand = "Run Flutter Doctor";
        }));
        // Wait a while before showing the error to allow the code above to have run.
        setTimeout(() => {
            if (sdks.projectType === util.ProjectType.Flutter) {
                if (sdks.flutter && !sdks.dart) {
                    util.showFluttersDartSdkActivationFailure();
                }
                else {
                    util.showFlutterActivationFailure(runningFlutterCommand);
                }
            }
            else {
                util.showDartActivationFailure();
            }
            analytics.logSdkDetectionFailure();
        }, 250);
        return; // Don't set anything else up; we can't work like this!
    }
    // Show the SDK version in the status bar.
    const sdkVersion = util.getDartSdkVersion(sdks.dart);
    if (sdkVersion) {
        const versionStatusItem = vs.window.createStatusBarItem(vs.StatusBarAlignment.Right, 1);
        versionStatusItem.text = sdkVersion.length > 20 ? sdkVersion.substr(0, 17) + "…" : sdkVersion;
        versionStatusItem.tooltip = "Dart SDK Version" + ` (${util.ProjectType[sdks.projectType]}) v` + sdkVersion;
        versionStatusItem.show();
        context.subscriptions.push(versionStatusItem);
        // If we're set up for multiple versions, set up the command.
        if (config_1.config.sdkPaths && config_1.config.sdkPaths.length > 0)
            versionStatusItem.command = "dart.changeSdk";
        // Do update-check.
        if (config_1.config.checkForSdkUpdates && sdks.projectType === util.ProjectType.Dart) {
            util.getLatestSdkVersion().then((version) => {
                if (!util.versionIsAtLeast(sdkVersion, version))
                    vs.window.showWarningMessage(`Version ${version} of the Dart SDK is available (you have ${sdkVersion}). Some features of Dart Code may not work correctly with an old SDK.`, "Go to Dart Downloads").then((selectedItem) => {
                        if (selectedItem)
                            util.openInBrowser(util.DART_DOWNLOAD_URL);
                    });
            }, util.logError);
        }
        analytics.sdkVersion = sdkVersion;
    }
    // Fire up the analyzer process.
    const analyzerStartTime = new Date();
    const analyzerPath = config_1.config.analyzerPath || path.join(sdks.dart, util.analyzerPath);
    if (!fs.existsSync(analyzerPath)) {
        vs.window.showErrorMessage("Could not find a Dart Analysis Server at " + analyzerPath);
        return;
    }
    analyzer = new analyzer_1.Analyzer(path.join(sdks.dart, util.dartVMPath), analyzerPath);
    context.subscriptions.push(analyzer);
    // Log analysis server startup time when we get the welcome message/version.
    const connectedEvents = analyzer.registerForServerConnected((sc) => {
        analytics.analysisServerVersion = sc.version;
        const analyzerEndTime = new Date();
        analytics.logAnalyzerStartupTime(analyzerEndTime.getTime() - analyzerStartTime.getTime());
        connectedEvents.dispose();
    });
    // Log analysis server first analysis completion time when it completes.
    let analysisStartTime;
    const analysisCompleteEvents = analyzer.registerForServerStatus((ss) => {
        // Analysis started for the first time.
        if (ss.analysis && ss.analysis.isAnalyzing && !analysisStartTime)
            analysisStartTime = new Date();
        // Analysis ends for the first time.
        if (ss.analysis && !ss.analysis.isAnalyzing && analysisStartTime) {
            const analysisEndTime = new Date();
            analytics.logAnalyzerFirstAnalysisTime(analysisEndTime.getTime() - analysisStartTime.getTime());
            analysisCompleteEvents.dispose();
        }
    });
    // TODO: Check if EventEmitter<T> would be more appropriate than our own.
    // Set up providers.
    const hoverProvider = new dart_hover_provider_1.DartHoverProvider(analyzer);
    const formattingEditProvider = new dart_formatting_edit_provider_1.DartFormattingEditProvider(analyzer);
    const typeFormattingEditProvider = new dart_type_formatting_edit_provider_1.DartTypeFormattingEditProvider(analyzer);
    const completionItemProvider = new dart_completion_item_provider_1.DartCompletionItemProvider(analyzer);
    const definitionProvider = new dart_definition_provider_1.DartDefinitionProvider(analyzer);
    const documentSymbolProvider = new dart_document_symbol_provider_1.DartDocumentSymbolProvider(analyzer);
    const referenceProvider = new dart_reference_provider_1.DartReferenceProvider(analyzer);
    const documentHighlightProvider = new dart_highlighting_provider_1.DartDocumentHighlightProvider(analyzer);
    const assistCodeActionProvider = new assist_code_action_provider_1.AssistCodeActionProvider(analyzer);
    const fixCodeActionProvider = new fix_code_action_provider_1.FixCodeActionProvider(analyzer);
    const renameProvider = new dart_rename_provider_1.DartRenameProvider(analyzer);
    const activeFileFilters = [DART_MODE];
    if (config_1.config.previewAnalyzeAngularTemplates) {
        // Analyze Angular2 templates, requires the angular_analyzer_plugin.
        activeFileFilters.push(HTML_MODE);
    }
    const triggerCharacters = ".: =(${'\"".split("");
    activeFileFilters.forEach((filter) => {
        context.subscriptions.push(vs.languages.registerHoverProvider(filter, hoverProvider));
        context.subscriptions.push(vs.languages.registerDocumentFormattingEditProvider(filter, formattingEditProvider));
        context.subscriptions.push(vs.languages.registerCompletionItemProvider(filter, completionItemProvider, ...triggerCharacters));
        context.subscriptions.push(vs.languages.registerDefinitionProvider(filter, definitionProvider));
        context.subscriptions.push(vs.languages.registerDocumentSymbolProvider(filter, documentSymbolProvider));
        context.subscriptions.push(vs.languages.registerReferenceProvider(filter, referenceProvider));
        context.subscriptions.push(vs.languages.registerDocumentHighlightProvider(filter, documentHighlightProvider));
        context.subscriptions.push(vs.languages.registerCodeActionsProvider(filter, assistCodeActionProvider));
        context.subscriptions.push(vs.languages.registerCodeActionsProvider(filter, fixCodeActionProvider));
        context.subscriptions.push(vs.languages.registerRenameProvider(filter, renameProvider));
    });
    // Even with the angular_analyzer_plugin, the analysis server only supports
    // formatting for dart files.
    context.subscriptions.push(vs.languages.registerOnTypeFormattingEditProvider(DART_MODE, typeFormattingEditProvider, "}", ";"));
    // Snippets are language-specific
    context.subscriptions.push(vs.languages.registerCompletionItemProvider(DART_MODE, new snippet_completion_item_provider_1.SnippetCompletionItemProvider("snippets/dart.json", (_) => true)));
    context.subscriptions.push(vs.languages.registerCompletionItemProvider(DART_MODE, new snippet_completion_item_provider_1.SnippetCompletionItemProvider("snippets/flutter.json", (uri) => utils_1.isFlutterProject(vs.workspace.getWorkspaceFolder(uri)))));
    context.subscriptions.push(vs.languages.setLanguageConfiguration(DART_MODE[0].language, new dart_language_configuration_1.DartLanguageConfiguration()));
    const statusReporter = new analyzer_status_reporter_1.AnalyzerStatusReporter(analyzer, sdks, analytics);
    // Set up diagnostics.
    const diagnostics = vs.languages.createDiagnosticCollection("dart");
    context.subscriptions.push(diagnostics);
    const diagnosticsProvider = new dart_diagnostic_provider_1.DartDiagnosticProvider(analyzer, diagnostics);
    // Set the root...
    // Handle project changes that might affect SDKs.
    context.subscriptions.push(vs.workspace.onDidChangeWorkspaceFolders((f) => {
        recalculateAnalysisRoots();
    }));
    if (vs.workspace.workspaceFolders)
        recalculateAnalysisRoots();
    // Hook editor changes to send updated contents to analyzer.
    const fileChangeHandler = new file_change_handler_1.FileChangeHandler(analyzer);
    context.subscriptions.push(vs.workspace.onDidOpenTextDocument((td) => fileChangeHandler.onDidOpenTextDocument(td)));
    context.subscriptions.push(vs.workspace.onDidChangeTextDocument((e) => fileChangeHandler.onDidChangeTextDocument(e)));
    context.subscriptions.push(vs.workspace.onDidCloseTextDocument((td) => fileChangeHandler.onDidCloseTextDocument(td)));
    vs.workspace.textDocuments.forEach((td) => fileChangeHandler.onDidOpenTextDocument(td)); // Handle already-open files.
    // Fire up Flutter daemon if required.
    if (sdks.projectType === util.ProjectType.Flutter) {
        // TODO: finish wiring this up so we can manage the selected device from the status bar (eventualy - use first for now)
        flutterDaemon = new flutter_daemon_1.FlutterDaemon(path.join(sdks.flutter, util.flutterPath), sdks.flutter);
        context.subscriptions.push(flutterDaemon);
        let hotReloadDelayTimer;
        context.subscriptions.push(vs.workspace.onDidSaveTextDocument((td) => {
            // Don't do if setting is not enabled.
            if (!config_1.config.flutterHotReloadOnSave)
                return;
            // Don't do if we have errors for the saved file.
            const errors = diagnostics.get(td.uri);
            const hasErrors = errors && errors.find((d) => d.severity === vs.DiagnosticSeverity.Error) != null;
            if (hasErrors)
                return;
            // Debounce to avoid reloading multiple times during multi-file-save (Save All).
            // Hopefully we can improve in future: https://github.com/Microsoft/vscode/issues/42913
            if (hotReloadDelayTimer) {
                clearTimeout(hotReloadDelayTimer);
                hotReloadDelayTimer = null;
            }
            hotReloadDelayTimer = setTimeout(() => {
                hotReloadDelayTimer = null;
                vs.commands.executeCommand("flutter.hotReload");
            }, 200);
        }));
    }
    // Set up debug stuff.
    // Remove all this when migrating to debugAdapterExecutable!
    context.subscriptions.push(vs.commands.registerCommand("dart.getDebuggerExecutable", (path) => {
        const entry = (path && utils_1.isFlutterProject(vs.workspace.getWorkspaceFolder(vs.Uri.parse(path))))
            ? context.asAbsolutePath("./out/src/debug/flutter_debug_entry.js")
            : context.asAbsolutePath("./out/src/debug/dart_debug_entry.js");
        return {
            args: [entry],
            command: "node",
        };
    }));
    const debugProvider = new debug_config_provider_1.DebugConfigProvider(sdks, analytics, flutterDaemon && flutterDaemon.deviceManager);
    const dummyDebugProvider = new legacy_debug_config_provider_1.LegacyDebugConfigProvider(debugProvider);
    context.subscriptions.push(vs.debug.registerDebugConfigurationProvider("dart", debugProvider));
    context.subscriptions.push(vs.debug.registerDebugConfigurationProvider("flutter", dummyDebugProvider));
    context.subscriptions.push(vs.debug.registerDebugConfigurationProvider("dart-cli", dummyDebugProvider));
    // Setup that requires server version/capabilities.
    const connectedSetup = analyzer.registerForServerConnected((sc) => {
        connectedSetup.dispose();
        if (analyzer.capabilities.supportsClosingLabels && config_1.config.closingLabels) {
            context.subscriptions.push(new closing_labels_decorations_1.ClosingLabelsDecorations(analyzer));
        }
        if (analyzer.capabilities.supportsGetDeclerations) {
            context.subscriptions.push(vs.languages.registerWorkspaceSymbolProvider(new dart_workspace_symbol_provider_1.DartWorkspaceSymbolProvider(analyzer)));
        }
        else {
            context.subscriptions.push(vs.languages.registerWorkspaceSymbolProvider(new legacy_dart_workspace_symbol_provider_1.LegacyDartWorkspaceSymbolProvider(analyzer)));
        }
        // Hook open/active file changes so we can set priority files with the analyzer.
        const openFileTracker = new open_file_tracker_1.OpenFileTracker(analyzer);
        context.subscriptions.push(vs.workspace.onDidOpenTextDocument((td) => openFileTracker.updatePriorityFiles()));
        context.subscriptions.push(vs.workspace.onDidCloseTextDocument((td) => openFileTracker.updatePriorityFiles()));
        context.subscriptions.push(vs.window.onDidChangeActiveTextEditor((e) => openFileTracker.updatePriorityFiles()));
        openFileTracker.updatePriorityFiles(); // Handle already-open files.
    });
    // Handle config changes so we can reanalyze if necessary.
    context.subscriptions.push(vs.workspace.onDidChangeConfiguration(() => handleConfigurationChange(sdks)));
    context.subscriptions.push(vs.workspace.onDidSaveTextDocument((td) => {
        if (path.basename(td.fileName).toLowerCase() === "pubspec.yaml")
            handleConfigurationChange(sdks);
    }));
    // Handle project changes that might affect SDKs.
    context.subscriptions.push(vs.workspace.onDidChangeWorkspaceFolders((f) => {
        handleConfigurationChange(sdks);
    }));
    // Register SDK commands.
    const sdkCommands = new sdk_1.SdkCommands(context, sdks, analytics);
    const debugCommands = new debug_1.DebugCommands(context, analytics);
    // Set up commands for Dart editors.
    context.subscriptions.push(new edit_1.EditCommands(context, analyzer));
    // Register misc commands.
    context.subscriptions.push(new type_hierarchy_1.TypeHierarchyCommand(context, analyzer));
    // Register our view providers.
    const dartPackagesProvider = new packages_view_1.DartPackagesProvider();
    dartPackagesProvider.setWorkspaces(util.getDartWorkspaceFolders());
    context.subscriptions.push(dartPackagesProvider);
    vs.window.registerTreeDataProvider("dartPackages", dartPackagesProvider);
    context.subscriptions.push(vs.workspace.onDidChangeWorkspaceFolders((f) => {
        dartPackagesProvider.setWorkspaces(util.getDartWorkspaceFolders());
    }));
    context.subscriptions.push(vs.commands.registerCommand("dart.package.openFile", (filePath) => {
        if (!filePath)
            return;
        vs.workspace.openTextDocument(filePath).then((document) => {
            vs.window.showTextDocument(document, { preview: true });
        }, (error) => util.logError);
    }));
    // Perform any required project upgrades.
    context.subscriptions.push(vs.workspace.onDidChangeWorkspaceFolders((f) => project_upgrade_1.upgradeProject(f.added.filter(util.isDartWorkspaceFolder))));
    project_upgrade_1.upgradeProject(util.getDartWorkspaceFolders());
    // Prompt user for any special config we might want to set.
    user_prompts_1.showUserPrompts(context);
    // Turn on all the commands.
    setCommandVisiblity(true, sdks.projectType);
    // Prompt for pub get if required
    function checkForPackages() {
        const folders = util.getDartWorkspaceFolders();
        const foldersRequiringPackageFetch = folders.filter((ws) => config_1.config.for(ws.uri).promptToFetchPackages).filter(pub_1.isPubGetProbablyRequired);
        if (foldersRequiringPackageFetch.length > 0)
            pub_1.promptToRunPubGet(foldersRequiringPackageFetch);
    }
    context.subscriptions.push(vs.workspace.onDidChangeWorkspaceFolders((f) => checkForPackages()));
    checkForPackages();
    // Log how long all this startup took.
    const extensionEndTime = new Date();
    analytics.logExtensionStartup(extensionEndTime.getTime() - extensionStartTime.getTime());
    return { sdks };
}
exports.activate = activate;
function recalculateAnalysisRoots() {
    let newRoots = [];
    util.getDartWorkspaceFolders().forEach((f) => {
        newRoots = newRoots.concat(findPackageRoots(f.uri.fsPath));
    });
    analysisRoots = newRoots;
    analyzer.analysisSetAnalysisRoots({
        excluded: [],
        included: analysisRoots,
    });
}
function findPackageRoots(root) {
    // For repos with code inside a "packages" folder, the analyzer doesn't resolve package paths
    // correctly. Until this is fixed in the analyzer, detect this and perform a workaround.
    // This introduces other issues, so don't do it unless we know we need to (eg. flutter repo).
    //
    // See also:
    //   https://github.com/Dart-Code/Dart-Code/issues/275 - Original issue (flutter repo not resolving correctly)
    //   https://github.com/Dart-Code/Dart-Code/issues/280 - Issue introduced by the workaround
    //   https://github.com/dart-lang/sdk/issues/29414 - Analyzer issue (where the real fix will be)
    if (!isPackageRootWorkaroundRequired(root))
        return [root];
    console.log("Workspace root appears to need package root workaround...");
    const roots = getChildren(root, 3);
    if (roots.length === 0 || fs.existsSync(path.join(root, "pubspec.yaml")))
        roots.push(root);
    return roots;
    function getChildren(parent, numLevels) {
        let packageRoots = [];
        const dirs = fs.readdirSync(parent).filter((item) => fs.statSync(path.join(parent, item)).isDirectory());
        dirs.forEach((folder) => {
            const folderPath = path.join(parent, folder);
            // If this is a package, add it. Else, recurse (if we still have levels to go).
            if (fs.existsSync(path.join(folderPath, "pubspec.yaml"))) {
                packageRoots.push(folderPath);
            }
            else if (numLevels > 1)
                packageRoots = packageRoots.concat(getChildren(folderPath, numLevels - 1));
        });
        return packageRoots;
    }
}
function isPackageRootWorkaroundRequired(root) {
    // It's hard to tell if the packages folder is actually a real one (--packages-dir) or
    // this is a repo like Flutter, so we'll use the presence of a file we know exists only
    // in the flutter one. This is very fragile, but hopefully a very temporary workaround.
    return fs.existsSync(path.join(root, "packages", ".gitignore"))
        || (
        // Since Flutter repro removed the .gitignore, also check if there are any non-symlinks.
        fs.existsSync(path.join(root, "packages"))
            && !!fs.readdirSync(path.join(root, "packages"))
                .find((d) => path.join(root, "packages", d) === fs.realpathSync(path.join(root, "packages", d))));
}
function handleConfigurationChange(sdks) {
    // TODOs
    const newShowTodoSetting = config_1.config.showTodos;
    const todoSettingChanged = showTodos !== newShowTodoSetting;
    showTodos = newShowTodoSetting;
    // Lint names.
    const newShowLintNameSetting = config_1.config.showLintNames;
    const showLintNameSettingChanged = showLintNames !== newShowLintNameSetting;
    showLintNames = newShowLintNameSetting;
    // SDK
    const newAnalyzerSettings = getAnalyzerSettings();
    const analyzerSettingsChanged = analyzerSettings !== newAnalyzerSettings;
    analyzerSettings = newAnalyzerSettings;
    // Project Type
    const projectTypeChanged = sdks.projectType !== util.findSdks().projectType;
    if (todoSettingChanged || showLintNameSettingChanged) {
        analyzer.analysisReanalyze({
            roots: analysisRoots,
        });
    }
    if (analyzerSettingsChanged || projectTypeChanged) {
        const reloadAction = "Reload Project";
        vs.window.showWarningMessage("Dart/Flutter SDK settings have changed. Save your work and reload to apply the new settings.", reloadAction).then((res) => {
            if (res === reloadAction)
                vs.commands.executeCommand("workbench.action.reloadWindow");
        });
    }
}
function getAnalyzerSettings() {
    // The return value here is used to detect when any config option changes that requires a project reload.
    // It doesn't matter how these are combined; it just gets called on every config change and compared.
    // Usually these are options that affect the analyzer and need a reload, but config options used at
    // activation time will also need to be included.
    return "CONF-"
        + config_1.config.userDefinedSdkPath
        + config_1.config.sdkPaths
        + config_1.config.analyzerLogFile
        + config_1.config.analyzerPath
        + config_1.config.analyzerDiagnosticsPort
        + config_1.config.analyzerObservatoryPort
        + config_1.config.analyzerInstrumentationLogFile
        + config_1.config.analyzerAdditionalArgs
        + config_1.config.flutterSdkPath
        + config_1.config.flutterDaemonLogFile
        + config_1.config.closingLabels
        + config_1.config.previewAnalyzeAngularTemplates
        + config_1.config.previewDart2;
}
function deactivate() {
    setCommandVisiblity(false, null);
    return analytics.logExtensionShutdown();
}
exports.deactivate = deactivate;
function setCommandVisiblity(enable, projectType) {
    vs.commands.executeCommand("setContext", DART_PROJECT_LOADED, enable);
    vs.commands.executeCommand("setContext", FLUTTER_PROJECT_LOADED, enable && projectType === util.ProjectType.Flutter);
}
//# sourceMappingURL=extension.js.map