#!/usr/bin/env node

// [AI-THREAD P0-QA-CHECK-ROUTES]
// [Dev4-Orchestrator @ 2025-12-01]:
//   Added a CI guard to ensure the Next.js App Router entrypoints remain intact and no legacy pages/ folder sneaks back in.

import fs from 'node:fs';
import path from 'node:path';

const issues = [];
const projectRoot = process.cwd();
const srcAppPath = path.join(projectRoot, 'src', 'app');

if (!fs.existsSync(srcAppPath)) {
  issues.push('Missing "src/app" directory (Next.js App Router entry point).');
} else {
  const requiredEntrypoints = [
    { path: path.join(srcAppPath, 'layout.tsx'), label: 'root layout (src/app/layout.tsx)' },
    { path: path.join(srcAppPath, 'page.tsx'), label: 'home page (src/app/page.tsx)' },
  ];

  for (const entry of requiredEntrypoints) {
    if (!fs.existsSync(entry.path)) {
      issues.push(`Missing ${entry.label}.`);
    }
  }
}

const legacyPagesPath = path.join(projectRoot, 'pages');
if (fs.existsSync(legacyPagesPath)) {
  issues.push('Legacy "pages" directory detected. Remove or migrate routes into "src/app" to avoid mixed routing.');
}

if (issues.length > 0) {
  console.error('[check-routes] Found route structure issues:');
  for (const issue of issues) {
    console.error(` - ${issue}`);
  }
  console.error('\nFix: ensure App Router lives under "src/app" with layout.tsx and page.tsx entrypoints, and remove any legacy "pages" folder.');
  process.exit(1);
}

console.log('[check-routes] OK - App Router entrypoints present and no legacy "pages" directory detected.');
process.exit(0);
