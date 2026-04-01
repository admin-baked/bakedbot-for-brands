// Diagnostic: print key fields from the (potentially adapter-patched) next.config.js
// Run after Firebase adapter patches the config to verify webpack fn and externals survive.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

try {
  const configPath = resolve(__dirname, '..', 'next.config.js');
  const c = require(configPath);
  console.log('[CONFIG-DUMP] top-level keys:', Object.keys(c).join(', '));
  console.log('[CONFIG-DUMP] webpack fn?', typeof c.webpack);
  console.log('[CONFIG-DUMP] serverExternalPackages?', c.serverExternalPackages ? `YES (${c.serverExternalPackages.length} entries)` : 'NO');
  console.log('[CONFIG-DUMP] experimental:', JSON.stringify(c.experimental || {}));
  process.exit(0);
} catch (e) {
  console.error('[CONFIG-DUMP] error:', e.message);
  process.exit(0); // Non-fatal — don't fail the build over diagnostics
}
