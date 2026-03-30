const { ensureWorkspaceNodeHome } = require('./ensure-workspace-node-home.cjs');

ensureWorkspaceNodeHome();

const jest = require('jest');

jest.run(process.argv.slice(2));
