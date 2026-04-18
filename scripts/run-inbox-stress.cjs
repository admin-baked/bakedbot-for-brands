require('./register-server-only.cjs');

const { require: tsxRequire } = require('tsx/cjs/api');

global.__tsxRequire = tsxRequire;

tsxRequire('./run-inbox-stress.ts', __filename);
