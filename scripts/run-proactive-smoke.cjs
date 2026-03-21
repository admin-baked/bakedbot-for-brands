require('./register-server-only.cjs');

const { require: tsxRequire } = require('tsx/cjs/api');

global.__tsxRequire = tsxRequire;

tsxRequire('./smoke-proactive-workflows.ts', __filename);
