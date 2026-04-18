require('./register-server-only.cjs');

const { require: tsxRequire } = require('tsx/cjs/api');

global.__tsxRequire = tsxRequire;

tsxRequire('./run-elroy-stress.ts', __filename);
