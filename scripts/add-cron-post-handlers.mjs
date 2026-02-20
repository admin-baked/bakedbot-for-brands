#!/usr/bin/env node
/**
 * Add POST handlers to cron endpoints that only have GET
 * Cloud Scheduler sends POST by default
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cronDirs = [
  'brand-pilot',
  'cleanup-brands',
  'dayday-discovery',
  'dayday-review',
  'playbook-retries',
  'seo-pilot',
  'tick',
];

const postHandler = `
/**
 * POST handler for Cloud Scheduler compatibility
 * Cloud Scheduler sends POST requests by default
 */
export async function POST(request: NextRequest) {
    return GET(request);
}
`;

for (const dir of cronDirs) {
  const filePath = path.join(__dirname, '..', 'src', 'app', 'api', 'cron', dir, 'route.ts');

  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check if POST handler already exists
    if (content.includes('export async function POST')) {
      console.log(`✓ ${dir} already has POST handler`);
      continue;
    }

    // Add POST handler at the end
    const newContent = content.trimEnd() + postHandler;
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✓ Added POST to ${dir}`);
  } catch (error) {
    console.error(`✗ Failed to process ${dir}:`, error.message);
  }
}

console.log('\nDone!');
