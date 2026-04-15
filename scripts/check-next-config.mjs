// Diagnostic: print key fields from the (potentially adapter-patched) next.config.js
// Run after Firebase adapter patches the config to verify webpack fn and externals survive.
// Also validates build-critical settings that have historically caused 57-min INTERNAL_ERROR.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ─────────────────────────────────────────────────────────────
// Guard: package.json build script heap ceiling
//
// The Cloud Build machine has 2048 MB RAM.  Requesting > 4096 MB
// triggers catastrophic swap-thrash → 57-min INTERNAL_ERROR.
// This check has caught real regressions (commit 5518591c8: 8 GB).
// ─────────────────────────────────────────────────────────────
const MAX_ALLOWED_HEAP_MB = 4096;

function checkBuildHeap() {
  try {
    const pkgPath = resolve(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const buildScript = pkg.scripts?.build ?? '';

    const heapMatch = buildScript.match(/--max-old-space-size=(\d+)/);
    if (heapMatch) {
      const heapMb = parseInt(heapMatch[1], 10);
      if (heapMb > MAX_ALLOWED_HEAP_MB) {
        console.error(
          `\n[BUILD-GUARD] ❌ FATAL: package.json build script requests ${heapMb} MB heap.\n` +
          `  Cloud Build machine has 2048 MB RAM — this causes swap-thrash → 57-min timeout.\n` +
          `  Maximum allowed: ${MAX_ALLOWED_HEAP_MB} MB.\n` +
          `  Fix: remove --max-old-space-size from the build script, or set it ≤ ${MAX_ALLOWED_HEAP_MB}.\n` +
          `  Memory is controlled via NODE_OPTIONS in apphosting.yaml (BUILD availability).\n`
        );
        process.exit(1);
      }
      console.log(`[BUILD-GUARD] ✅ Heap: ${heapMb} MB (≤ ${MAX_ALLOWED_HEAP_MB} MB limit)`);
    } else {
      console.log(`[BUILD-GUARD] ✅ Heap: not set in build script (relies on NODE_OPTIONS env)`);
    }
  } catch (e) {
    console.warn('[BUILD-GUARD] Could not check package.json:', e.message);
  }
}

checkBuildHeap();

// ─────────────────────────────────────────────────────────────
// Diagnostic: next.config.js key fields
// ─────────────────────────────────────────────────────────────
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
