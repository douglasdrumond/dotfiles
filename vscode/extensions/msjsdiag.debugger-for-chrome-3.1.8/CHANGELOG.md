## 3.1.8
* Fix for old runtimes that don't support setAsyncCallStackDepth - [Microsoft/vscode-chrome-debug-core#226](https://github.com/microsoft/vscode-chrome-debug-core/issues/226)
* Download sourcemaps referenced with file:/// properly - [Microsoft/vscode-chrome-debug-core#205](https://github.com/microsoft/vscode-chrome-debug-core/issues/205)
* Fix errors when stepping too quickly - [Microsoft/vscode#27696](https://github.com/Microsoft/vscode/issues/27696)
* Fix some values not formatted correctly in the debug console - [Microsoft/vscode#32064](https://github.com/Microsoft/vscode/issues/32064)

## 3.1.7
* Fix hover on variables defined in async functions using TS transpilation - [Microsoft/vscode#31469](https://github.com/Microsoft/vscode/issues/31469)
* Decrease extension package size

## 3.1.6
* Support `console.dir` and other missing `console` APIs - [Microsoft/vscode#29602](https://github.com/Microsoft/vscode/issues/29602)
* Resolve longer `pathMapping` mappings before resolving shorter ones - [#444](https://github.com/microsoft/vscode-chrome-debug/issues/444)

## 3.1.5
* Fix evaluating object literals in the console - [Microsoft/vscode-node-debug2#104](https://github.com/Microsoft/vscode-node-debug2/issues/104)
* Fix error callstacks in console sometimes not being sourcemapped - [Microsoft/vscode-chrome-debug-core#212](https://github.com/microsoft/vscode-chrome-debug-core/issues/212)

## 3.1.4
* Fix breakpoints not binding in apps built with Angular 1.1.1 (or any other app with a particular webpack config) - [Microsoft/vscode#28730](https://github.com/Microsoft/vscode/issues/28730)
* Restore ability to create a launch.json with the default configs when pressing F5, and one is not already present.

## 3.1.3
* Fix longstanding sourcemap location mapping error - [#112](https://github.com/Microsoft/vscode-chrome-debug-core/issues/112)
* Add existing default values to the `sourceMapPathOverrides` launch config setting

## 3.1.2
* Fix first frame appearing twice (in VS Code 1.13) and fix callstack paging - [Microsoft/vscode#25594](https://github.com/Microsoft/vscode/issues/25594)
* Enhance path matching by accepting partial paths in `pathMapping` - thanks to [llgcode](https://github.com/llgcode) for the PR! - [Microsoft/vscode-chrome-debug-core#202](https://github.com/Microsoft/vscode-chrome-debug-core/pull/202)

## 3.1.1
* Fix "extension.chrome-debug.startSession not found" error due to bad publish

## 3.1.0
* Implement column breakpoints (with shift+F9) for recent Chrome versions - [Microsoft/vscode-chrome-debug-core#144](https://github.com/Microsoft/vscode-chrome-debug-core/issues/144)
* Show a quickpick with available tabs when there are multiple - [#280](https://github.com/Microsoft/vscode-chrome-debug/issues/280)
* Add `webpack:///./~/` sourcemap mapping by default - [#401](https://github.com/Microsoft/vscode-chrome-debug/issues/401)
* Add `webpack:///src/*` sourcemap mapping for create-react-app by default - [#315](https://github.com/Microsoft/vscode-chrome-debug/issues/315)
* Show exception widget for breaking on promise rejection - [Microsoft/vscode#21929](https://github.com/Microsoft/vscode/issues/21929)
* Completely fix showing empty property names as "" - [Microsoft/vscode#24143](https://github.com/Microsoft/vscode/issues/24143)
* Fix "Open or close parenthesis in file path prevents debugger from discovering the target" - [#373](https://github.com/Microsoft/vscode-chrome-debug/issues/373)
* Remove "unimplemented console API" warning
* Specify languages for creating a launch config when none is set up - [#334](https://github.com/Microsoft/vscode-chrome-debug/issues/334)

## 3.0.1
* Fix "Windows - Electron app fails to start after upgrading to 3.0.0" - [#407](https://github.com/Microsoft/vscode-chrome-debug/issues/407)
  * On Windows, the code to prevent Chrome from closing when opening Chrome Devtools - [#116](https://github.com/microsoft/vscode-chrome-debug/issues/116) is now not enabled when specifying a runtimeExecutable, until I find a better solution.

## 3.0.0
* Enable userDataDir by default - [#210](https://github.com/microsoft/vscode-chrome-debug/issues/210)
* Keep Chrome open when launching chrome devtools (now also on Windows) - [#116](https://github.com/microsoft/vscode-chrome-debug/issues/116)
* Error while debugging: Unable to open 'undefined': File not found (/undefined) - [Microsoft/vscode-chrome-debug-core#189](https://github.com/Microsoft/vscode-chrome-debug-core/issues/189)
* Show empty property names as "" - [Microsoft/vscode#24143](https://github.com/Microsoft/vscode/issues/24143)

## 2.7.3
* Fix missing variables and error "Cannot read property 'length' of undefined" - [Microsoft/vscode-chrome-debug-core#195](https://github.com/Microsoft/vscode-chrome-debug-core/issues/195)
* Fix sourcemapping issue when throwing non-Error
* Fix exception messages in the console missing a trailing newline
* Exception sourcemapping should also map non-sourcemapped scripts to file on disk

## 2.7.2
* Fix "pathMapping key must end in '/'" - thanks to [@mlewand](https://github.com/mlewand) for the PR! - [#393](https://github.com/Microsoft/vscode-chrome-debug/issues/393)
* Add "Toggle skipping this file" context menu option to callstack - [Microsoft/vscode-chrome-debug-core#172](https://github.com/Microsoft/vscode-chrome-debug-core/issues/172)
* Document "showAsyncStacks" launch config option (VS Code 1.11 recommended)
* Don't repeat exception description in exception info widget - [Microsoft/vscode-chrome-debug-core#192](https://github.com/Microsoft/vscode-chrome-debug-core/issues/192)
* Fix error in async stacks when no sourcemaps are present

## 2.7.1
* Support source mapping of stack traces in the Debug Console - thanks to [nojvek](https://github.com/nojvek) for the PR! - [Microsoft/vscode-chrome-debug-core#190](https://github.com/Microsoft/vscode-chrome-debug-core/issues/190)
* Show error callstack in new Exception widget when pausing on an exception (sourcemapped, thanks to the above)
* Fix BPs sometimes removed when editing while debugging - [Microsoft/vscode#22492](https://github.com/microsoft/vscode/issues/22492)
* Fix some errors when stepping quickly - [Microsoft/vscode#22855](https://github.com/microsoft/vscode/issues/22855)
* Show "Chrome" instead of "Thread 1" as thread name when debugging multiple things at once
* Fix crash when debugging with async callstacks and sourcemaps disabled

## 2.7.0
* Implement `disableNetworkCache` option - [#358](https://github.com/Microsoft/vscode-chrome-debug/issues/358)
* If you are using VS Code 1.11, set the undocumented property `showAsyncStacks` to see async callstacks.
* Implement `urlFilter` to give 'launch' configs a way to select which page to attach to, e.g. for Electron apps with multiple BrowserWindows - [#382](https://github.com/Microsoft/vscode-chrome-debug/issues/382)
* Nicer error messages when a source map fails to parse - thanks to [nojvek](https://github.com/nojvek) for the PR! - [Microsoft/vscode-chrome-debug-core#188](https://github.com/Microsoft/vscode-chrome-debug-core/issues/188)
* Fix code that prevents the extension from incorrectly attaching to a Chrome extension
* Fix crash when 'url' is not specified in an 'attach'-type config

## 2.6.0
* When opening Chrome Devtools, Chrome will no longer crash. The debugger will still detach (only one debugger can be attached at a time) but you should be able to switch back and forth.
* The timeout when launching or attaching to Chrome is now configurable. It's 10s by default. - [#346](https://github.com/Microsoft/vscode-chrome-debug/issues/346)
* Fix setting BPs in source that's inlined in a sourcemap - [Microsoft/vscode-chrome-debug-core#180](https://github.com/Microsoft/vscode-chrome-debug-core/issues/180)
* Fix breakpoints shifting in some situations where they shouldn't, when Chrome returns a BP location that can't be sourcemapped - [Microsoft-node-debug2#90](https://github.com/Microsoft/vscode-node-debug2/issues/90)
* Add a pause reason for promise rejection - [Microsoft-node-debug2#46](https://github.com/Microsoft/vscode-node-debug2/issues/46)
* Show exception text in the new exception widget in VS Code 1.10 - [Microsoft/vscode-chrome-debug-core#181](https://github.com/Microsoft/vscode-chrome-debug-core/issues/181)
* `diagnosticLogging` and `verboseDiagnosticLogging` are now deprecated in favor of the `trace` option. `"trace": true` will write all logs to a file, and write the path to the file in the debug console. `"trace": "verbose"` will write all logs to the debug console, and to the file.

## 2.5.5
* Fix "Cannot find context with specified id" error spam - [#264](https://github.com/Microsoft/vscode-chrome-debug/issues/364)

## 2.5.4
* pathMapping doesn't work on attaching to existing tab, thanks for the PR from [llgcode](https://github.com/llgcode) - [Microsoft/vscode#175](https://github.com/Microsoft/vscode-chrome-debug-core/issues/175)
* Disabled column BPs for VS Code 1.10, since they aren't supported yet.
* Don't show TypeError for watch when not at a BP - [Microsoft/vscode#173](https://github.com/Microsoft/vscode-chrome-debug-core/issues/173)

## 2.5.3
* Fix "Cannot read property 'line' of null", breakpoints not working - [#353](https://github.com/Microsoft/vscode-chrome-debug/issues/353)

## 2.5.2
* Fix watches being broken while stepping - [Microsoft/vscode-chrome-debug-core#166](https://github.com/Microsoft/vscode-chrome-debug-core/issues/166)
* Fix error "Error processing 'stackTrace': TypeError: Cannot read property 'scriptId' of undefined" - [Microsoft/vscode-chrome-debug-core#167](https://github.com/Microsoft/vscode-chrome-debug-core/issues/167)

## 2.5.1
* Just removing the 'languages' entry in package.json to work around a VS Code 1.9 issue - [#348](https://github.com/Microsoft/vscode-chrome-debug/issues/348)

## 2.5.0
* Resolving sourcemaps from https, thanks to a PR from [kanongil](https://github.com/kanongil) - [Microsoft/vscode-chrome-debug-core#151](https://github.com/Microsoft/vscode-chrome-debug-core/pull/151)
* Add the 'pathMapping' property to handle cases when 'webRoot' is not enough to map URLs to local paths, thanks to a PR from [llgcode](https://github.com/llgcode) - [Microsoft/vscode-chrome-debug-core#147](https://github.com/Microsoft/vscode-chrome-debug-core/pull/147)
* Implemented dynamic 'skipFiles' support, which you will also see in the `node2` debug adapter. Right click on a stack frame to skip it. VS Code 1.9+ only. [Microsoft/vscode-chrome-debug-core#129](https://github.com/Microsoft/vscode-chrome-debug-core/issues/129)
* Log expandable objects in the console, instead of just static string representations of objects - [Microsoft/vscode-chrome-debug-core#145](https://github.com/Microsoft/vscode-chrome-debug-core/issues/145)
* 'step in' with a watch sometimes opens empty editor and crashes adapter - [Microsoft/vscode-chrome-debug-core#148](https://github.com/Microsoft/vscode-chrome-debug-core/issues/148)
* Show skip frame status in callstack. With VS Code 1.9, skipped frames will be grayed out. - [Microsoft/vscode-chrome-debug-core#150](https://github.com/Microsoft/vscode-chrome-debug-core/issues/150)
* Add configurationSnippets for common launch config scenarios - [#336](https://github.com/Microsoft/vscode-chrome-debug/issues/336)
* Use correct sourcemaps after the page reloads - [#152](https://github.com/Microsoft/vscode-chrome-debug/issues/152)
* And even more bugfixes that I won't enumerate

## 2.4.2
* Enable `sourceMaps` by default. You no longer need to set `"sourceMaps": true` in your launch config, but can set it to false to disable loading sourcemaps - [#134](https://github.com/Microsoft/vscode-chrome-debug-core/issues/134)
* Fix boolean properties showing as strings - [#312](https://github.com/Microsoft/vscode-chrome-debug/issues/312)
* Fix unhandled exceptions not being logged to the console - [#130](https://github.com/Microsoft/vscode-chrome-debug-core/issues/130)

## 2.4.1
* Fix hover not working when using sourcemaps, and scripts are not on disk - [#309](https://github.com/Microsoft/vscode-chrome-debug/issues/309)

## 2.4.0
* Change `experimentalSkipFiles` name to `skipFiles`, as this feature is shipping with the Node debugger in 1.8.
* Fix issues with hover by correctly applying sourcemaps to scope locations - [#141](https://github.com/Microsoft/vscode-chrome-debug-core/issues/141)

## 2.3.2
* Fix console.log regression in 2.3.1

## 2.3.1
* Fix crash when refreshing the page in some cases - [#297](https://github.com/Microsoft/vscode-chrome-debug/issues/297)

## 2.3.0
* The restart button will now refresh the page instead of relaunching Chrome (works in Insiders, or VS Code 1.8) - [#91](https://github.com/Microsoft/vscode-chrome-debug-core/issues/91)
* The `experimentalLibraryCode` setting is now called `experimentalSkipFiles`
* The `experimentalSkipFiles` setting now takes a glob pattern instead of a regex - [#127](https://github.com/Microsoft/vscode-chrome-debug-core/issues/127)
* The `experimentalSkipFiles` setting can now take sourcemapped paths to exclude - [#128](https://github.com/Microsoft/vscode-chrome-debug-core/issues/128)
* An issue with breakpoints moving around on a page refresh has hopefully been fixed - [#296](https://github.com/Microsoft/vscode-chrome-debug/issues/296)
* Fix crash "path must be a string" when parsing sourcemaps on some eval scripts - [#268](https://github.com/Microsoft/vscode-chrome-debug/issues/268)
* Fix errors when pausing in chrome extension scripts by blackboxing extension content scripts - [#124](https://github.com/Microsoft/vscode-chrome-debug/issues/124)

## 2.2.2
* Handle another format of Console.MessageAdded - [#276](https://github.com/Microsoft/vscode-chrome-debug/issues/276)
* Fix "Pending breakpoints resolved after refreshing the page sometimes don't bind correctly" - [#279](https://github.com/Microsoft/vscode-chrome-debug/issues/279)
* Strip %c color specifiers - [#282](https://github.com/Microsoft/vscode-chrome-debug/issues/282)

## 2.2.1
* Add the `experimentalLibraryCode` launch option (see README).
* Log unhandled exceptions for [#276](https://github.com/Microsoft/vscode-chrome-debug/issues/276)
* Tweak in-box webpack configs to fit default configs that I've seen.
* Fix "Breakpoints can go to wrong lines when set in merged files on startup" [#277](https://github.com/Microsoft/vscode-chrome-debug/issues/277)

## 2.2.0
* Implement the `.scripts` command in the debug console to print all the scripts loaded in Chrome, their sourcemap details, and inferred local paths, to make it easier to debug a project's debug config. See the README for more details.
* Make the "Add watch" context menu item work much more robustly.
* Fix "Console logs missing in pre-Chrome 54" [#265](https://github.com/Microsoft/vscode-chrome-debug/issues/265)
* Fix "sourceMapPathOverrides matching doesn't work when sourceRoot does not end in /" - [Microsoft/vscode-chrome-debug-core](https://github.com/microsoft/vscode-chrome-debug-core/issues/78)

## 2.1.3
* Error handling for invalid messages from Chrome, to avoid crashing - [#274](https://github.com/Microsoft/vscode-chrome-debug/issues/274)
* Fix potential issue with sourcemap path handling on Windows

## 2.1.2
* Revert an earlier change to the filtering logic, which only worked for vscode 1.7+, and caused some objects to not be expandable - [#273](https://github.com/Microsoft/vscode-chrome-debug/issues/273)

## 2.1.1
* Fix setting breakpoints before startup in scripts that don't have sourcemaps - [Microsoft/vscode-chrome-debug-core#121](https://github.com/Microsoft/vscode-chrome-debug-core/issues/121)
* Fix a certain format of sourceMappingUrl - [#269](https://github.com/Microsoft/vscode-chrome-debug/issues/269)

## 2.1.0
* Object previews - see the first several properties of an object or array inline, without having to expand it - [Microsoft/vscode-chrome-debug-core#120](https://github.com/Microsoft/vscode-chrome-debug-core/issues/120)
* Fix debugging with file:/// paths on windows - [#264](https://github.com/Microsoft/vscode-node-debug2/issues/264)

## 2.0.0
* New feature - set `"smartStep": true` to automatically step over code that doesn't have a sourcemapping - [Microsoft/vscode-chrome-debug-core#34](https://github.com/Microsoft/vscode-chrome-debug-core/issues/34)
* Switch to new log API to fix [#245](https://github.com/Microsoft/vscode-chrome-debug/issues/245)
* Invalid watches say "not available" instead of showing an error - [Microsoft/vscode-node-debug2#31](https://github.com/Microsoft/vscode-node-debug2/issues/31)
* Completions are shown when typing in the console - [Microsoft/vscode-chrome-debug-core#87](https://github.com/Microsoft/vscode-chrome-debug-core/issues/87)
* Variables tree is not jarringly redrawn between steps - [Microsoft/vscode-node-debug2#30](https://github.com/Microsoft/vscode-node-debug2/issues/30)
* Target userAgent is logged under 'diagnosticLogging'
* And a few large non-feature engineering changs

## 1.2.2
* Fix occasional error that can cause breakpoints to not bind

## 1.2.1
* Disable caching downloaded sourcemaps, hoping to fix [#247](https://github.com/Microsoft/vscode-chrome-debug/issues/247)

## 1.2.0
* Change the way that sourcemaps are downloaded, hoping to fix [#251](https://github.com/Microsoft/vscode-chrome-debug/issues/251)
* Fix breakpoints being moved around after refreshing the page - [#250](https://github.com/Microsoft/vscode-chrome-debug/issues/250)
* Fix global eval sometimes failing, and incorrect error handling - [#244](https://github.com/Microsoft/vscode-chrome-debug/issues/244)
* Fix error with sourcemaps for eval scripts - [#256](https://github.com/Microsoft/vscode-chrome-debug/issues/256)

## 1.1.0
* Changed the way that targets are queried for, hoping to fix [#237](https://github.com/Microsoft/vscode-chrome-debug/issues/237)
* Enable breakpoints for fsharp - [#243](https://github.com/Microsoft/vscode-chrome-debug/pull/243) - Thanks @octref
* Fix -core links in changelog - [#239](https://github.com/Microsoft/vscode-chrome-debug/pull/239) - Thanks @marvinhagemeister

## 1.0.0 - Largest update ever!
* Evaluate getters in the variables pane - [Microsoft/vscode-chrome-debug-core#77](https://github.com/Microsoft/vscode-chrome-debug-core/issues/77)
* Paging chunks of large arrays - [Microsoft/vscode-chrome-debug-core#4](https://github.com/Microsoft/vscode-chrome-debug-core/issues/4)
* Show Map/Set members - [Microsoft/vscode-chrome-debug-core#31](https://github.com/Microsoft/vscode-chrome-debug-core/issues/31)
* Show inlined sources when the source can't be resolved to a file on disk - [Microsoft/vscode-chrome-debug-core#85](https://github.com/Microsoft/vscode-chrome-debug-core/issues/85)
* Hover on breakpoints to see error messages when breakpoints don't bind - [Microsoft/vscode-chrome-debug-core#38](https://github.com/Microsoft/vscode-chrome-debug-core/issues/38)
* Editing variable values - [Microsoft/vscode-chrome-debug-core#58](https://github.com/Microsoft/vscode-chrome-debug-core/issues/58)
* Conditional breakpoints - [Microsoft/vscode-chrome-debug-core#10](https://github.com/Microsoft/vscode-chrome-debug-core/issues/10)

## 0.4.8
* Fix for not attaching correctly when using the 'launch' config with Chrome already open - [#79](https://github.com/Microsoft/vscode-chrome-debug/issues/79)
    * Note - as part of this, it will no longer attach to a random tab when it can't find a match using the `"url"` parameter. If that parameter is set in the launch config, there must be a match.
* Make the attach retry logic more resilient.
* Support wildcards in the `"url"` parameter for 'attach' configs - [#200](https://github.com/Microsoft/vscode-chrome-debug/issues/200)
* Fix `NaN` and `Infinity` display - [#190](https://github.com/Microsoft/vscode-chrome-debug/issues/190)
* Fix `sourceMapPathOverrides` doc mistake - [#194](https://github.com/Microsoft/vscode-chrome-debug/issues/194), thanks @lijunle!
