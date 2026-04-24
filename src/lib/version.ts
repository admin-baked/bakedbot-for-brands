/**
 * Single source of truth for app version.
 * Format: MAJOR.MINOR.PATCH-AGENT (CL=Claude, GEM=Gemini, COD=Codex)
 * Bump on every push — see AGENTS.md → Versioning Convention.
 */
export const APP_VERSION = '4.10.51-COD';
export const APP_VERSION_DISPLAY = `v${APP_VERSION}`;
