/**
 * ci-remotion-bundle.mjs
 *
 * CI-aware Remotion bundle wrapper.
 *
 * In Firebase App Hosting / Cloud Build environments, the Remotion bundle
 * takes 5-10 minutes and is not needed — the production video rendering
 * pipeline uses @remotion/renderer at runtime against a pre-built bundle
 * that is deployed separately.
 *
 * Rules:
 *   - CI=true (Cloud Build sets this)   → skip, create empty placeholder
 *   - SKIP_REMOTION_BUNDLE=true         → skip, create empty placeholder
 *   - All other cases                   → run the full bundle
 *
 * The placeholder is a zero-byte file at .remotion/bundle/.ci-skip that
 * remotion-video.ts checks for to provide a friendly error instead of
 * crashing when video rendering is attempted in CI/production.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const isCI = process.env.CI === 'true';
const skipExplicit = process.env.SKIP_REMOTION_BUNDLE === 'true';
const shouldSkip = isCI || skipExplicit;

const bundleDir = path.resolve(process.cwd(), '.remotion', 'bundle');

// Create zod/v3 shim — zod@3.x doesn't export /v3 subpath, but @remotion/bundler
// and some server code imports from 'zod/v3'. The shim re-exports from 'zod'.
// We patch zod's package.json exports AND create the v3/ subpath files.
async function createZodV3Shim() {
  const zodDir = path.resolve(process.cwd(), 'node_modules', 'zod');
  const zodPkgPath = path.join(zodDir, 'package.json');
  const zodV3Dir = path.join(zodDir, 'v3');

  // Patch zod's package.json to add ./v3 export
  const pkgContent = await fs.readFile(zodPkgPath, 'utf-8');
  const pkg = JSON.parse(pkgContent);

  if (!pkg.exports) {
    pkg.exports = {};
  }

  pkg.exports['./v3'] = {
    types: './v3/index.d.ts',
    require: './v3/index.js',
    import: './v3/index.mjs',
  };

  await fs.writeFile(zodPkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('[zod-v3-shim] Patched zod/package.json exports');

  // Create v3/ subpath files
  await fs.mkdir(zodV3Dir, { recursive: true });

  const indexJs = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
for (const k in zod_1) {
  if (!exports.hasOwnProperty(k)) {
    Object.defineProperty(exports, k, { enumerable: true, get: () => zod_1[k] });
  }
}
`;

  const indexMjs = `export * from 'zod';
export { z } from 'zod';
export { default } from 'zod';
`;

  const indexDts = `export * from 'zod';
export { z } from 'zod';
export { default } from 'zod';
`;

  await Promise.all([
    fs.writeFile(path.join(zodV3Dir, 'index.js'), indexJs),
    fs.writeFile(path.join(zodV3Dir, 'index.mjs'), indexMjs),
    fs.writeFile(path.join(zodV3Dir, 'index.d.ts'), indexDts),
  ]);
  console.log('[zod-v3-shim] Created zod/v3 subpath files re-exporting from zod');
}

if (shouldSkip) {
  const reason = isCI ? 'CI=true (Cloud Build)' : 'SKIP_REMOTION_BUNDLE=true';
  console.log(`[ci-remotion-bundle] Skipping Remotion bundle in CI environment (${reason})`);
  console.log('[ci-remotion-bundle] Video rendering will use runtime bundling or Cloud Run renderer.');

  // Ensure the directory exists and write a skip marker
  await fs.mkdir(bundleDir, { recursive: true });
  await fs.writeFile(path.join(bundleDir, '.ci-skip'), `Skipped at build time: ${reason}\nBundle at runtime or deploy separately.\n`);

  console.log('[ci-remotion-bundle] Placeholder written. Build continues.');
}

// Always create zod/v3 shim (needed even when bundle is skipped)
await createZodV3Shim();

if (shouldSkip) {
  // Already handled above
} else {
  console.log('[ci-remotion-bundle] Running full Remotion bundle...');
  execSync('node scripts/bundle-remotion.mjs', { stdio: 'inherit' });
  console.log('[ci-remotion-bundle] Bundle complete.');

  // Fix: @remotion/bundler v4 bundles zod/v3 which doesn't exist in zod@3.x
  // Patch the bundle to replace zod/v3 -> zod (matches zod package exports)
  console.log('[ci-remotion-bundle] Patching bundle for zod/v3 compatibility...');
  const bundleFiles = await fs.readdir(bundleDir);
  for (const file of bundleFiles) {
    if (file.endsWith('.js')) {
      const filePath = path.join(bundleDir, file);
      let content = await fs.readFile(filePath, 'utf-8');
      if (content.includes('zod/v3') || content.includes("'zod/v3'") || content.includes('"zod/v3"')) {
        const patched = content
          .replace(/require\(['"]zod\/v3['"]\)/g, "require('zod')")
          .replace(/from ['"]zod\/v3['"]/g, "from 'zod'");
        await fs.writeFile(filePath, patched, 'utf-8');
        console.log(`[ci-remotion-bundle] Patched: ${file}`);
      }
    }
  }
  console.log('[ci-remotion-bundle] zod/v3 patch complete.');
}
