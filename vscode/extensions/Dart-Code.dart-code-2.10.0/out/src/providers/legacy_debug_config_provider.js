"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// This provider doesn't implement provideDebugConfigurations so it won't show up in the debug list, however it does support
// resolveDebugConfiguration which gets passed on to the real debugger (which sets its type) so that we can bounce legacy
// debug types over to it.
// This shouldn't really be needed since we're upgrading launch.json, but it's worth having for a few versions.
class LegacyDebugConfigProvider {
    constructor(realConfProvider) {
        this.realConfProvider = realConfProvider;
    }
    resolveDebugConfiguration(folder, debugConfig, token) {
        return this.realConfProvider.resolveDebugConfiguration(folder, debugConfig, token);
    }
}
exports.LegacyDebugConfigProvider = LegacyDebugConfigProvider;
//# sourceMappingURL=legacy_debug_config_provider.js.map