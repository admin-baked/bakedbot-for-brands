// Load env vars BEFORE tsx imports any TypeScript (avoids hoisting problem)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

require('./register-server-only.cjs');

const { require: tsxRequire } = require('tsx/cjs/api');

global.__tsxRequire = tsxRequire;

tsxRequire('./seed-compliance-kb.ts', __filename);
