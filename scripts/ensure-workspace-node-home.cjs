const fs = require('fs');
const path = require('path');

const WORKSPACE_NODE_OPTIONS = ['--preserve-symlinks', '--preserve-symlinks-main'];

function ensureWorkspaceNodeHome(cwd = process.cwd()) {
  const workspaceHome = path.join(cwd, '.codex-jest-home');
  const appDataRoaming = path.join(workspaceHome, 'AppData', 'Roaming');
  const appDataLocal = path.join(workspaceHome, 'AppData', 'Local');
  const tempDir = path.join(appDataLocal, 'Temp');
  const npmCacheDir = path.join(appDataLocal, 'npm-cache');

  for (const dir of [workspaceHome, appDataRoaming, appDataLocal, tempDir, npmCacheDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  process.env.HOME = workspaceHome;
  process.env.USERPROFILE = workspaceHome;
  process.env.APPDATA = appDataRoaming;
  process.env.LOCALAPPDATA = appDataLocal;
  process.env.TEMP = tempDir;
  process.env.TMP = tempDir;
  process.env.npm_config_cache = npmCacheDir;
  process.env.NODE_OPTIONS = Array.from(new Set([
    ...WORKSPACE_NODE_OPTIONS,
    ...(process.env.NODE_OPTIONS ?? '').split(/\s+/).filter(Boolean),
  ])).join(' ');

  return {
    workspaceHome,
    appDataRoaming,
    appDataLocal,
    tempDir,
    npmCacheDir,
  };
}

module.exports = {
  ensureWorkspaceNodeHome,
};
