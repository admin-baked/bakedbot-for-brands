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

if (shouldSkip) {
  const reason = isCI ? 'CI=true (Cloud Build)' : 'SKIP_REMOTION_BUNDLE=true';
  console.log(`[ci-remotion-bundle] Skipping Remotion bundle in CI environment (${reason})`);
  console.log('[ci-remotion-bundle] Video rendering will use runtime bundling or Cloud Run renderer.');

  // Ensure the directory exists and write a skip marker
  await fs.mkdir(bundleDir, { recursive: true });
  await fs.writeFile(path.join(bundleDir, '.ci-skip'), `Skipped at build time: ${reason}\nBundle at runtime or deploy separately.\n`);

  console.log('[ci-remotion-bundle] Placeholder written. Build continues.');
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
