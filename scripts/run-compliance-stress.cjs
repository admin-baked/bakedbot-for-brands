require('./register-server-only.cjs');

const { require: tsxRequire } = require('tsx/cjs/api');

global.__tsxRequire = tsxRequire;

tsxRequire('./run-compliance-stress.ts', __filename);
