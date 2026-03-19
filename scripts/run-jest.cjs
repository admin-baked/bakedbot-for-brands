const fs = require('fs');
const path = require('path');

const workspaceHome = path.join(process.cwd(), '.codex-jest-home');
const appDataRoaming = path.join(workspaceHome, 'AppData', 'Roaming');
const appDataLocal = path.join(workspaceHome, 'AppData', 'Local');
const tempDir = path.join(appDataLocal, 'Temp');

for (const dir of [workspaceHome, appDataRoaming, appDataLocal, tempDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

process.env.HOME = workspaceHome;
process.env.USERPROFILE = workspaceHome;
process.env.APPDATA = appDataRoaming;
process.env.LOCALAPPDATA = appDataLocal;
process.env.TEMP = tempDir;
process.env.TMP = tempDir;

const jest = require('jest');

jest.run(process.argv.slice(2));
