
// scripts/check-app-structure.mjs
import fs from 'node:fs';

const hasApp = fs.existsSync('app');
const hasSrcApp = fs.existsSync('src/app');

if (hasApp && hasSrcApp) {
  console.error(`
[check-app-structure] Both "app/" and "src/app/" exist.

Next.js will prioritize the root "app/" directory and ignore "src/app/",
which will break your routes (404s on /, /dashboard, etc).

Fix:
  - Move or rename "app/" (e.g. app_legacy_backup)
  - Or delete it if it's not needed.
`);
  process.exit(1);
}

process.exit(0);
