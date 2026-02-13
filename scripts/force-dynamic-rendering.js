/**
 * Emergency Build Fix: Force Dynamic Rendering
 *
 * Adds `export const dynamic = 'force-dynamic'` to all dashboard pages
 * This prevents Next.js from trying to pre-render 108 dashboard pages at build time
 * Pages will be generated on-demand instead, dramatically reducing build memory usage
 */

const fs = require('fs');
const path = require('path');

const DYNAMIC_EXPORT = `
// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
`.trim();

function addDynamicExport(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has dynamic export
  if (content.includes("export const dynamic = 'force-dynamic'")) {
    return false;
  }

  // Find the first import or export statement
  const lines = content.split('\n');
  let insertIndex = 0;

  // Skip any comments or empty lines at the start
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*')) {
      insertIndex = i;
      break;
    }
  }

  // Insert the dynamic export at the beginning (after initial comments)
  lines.splice(insertIndex, 0, DYNAMIC_EXPORT, '');
  const newContent = lines.join('\n');

  fs.writeFileSync(filePath, newContent, 'utf8');
  return true;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  let modified = 0;

  for (const file of files) {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory()) {
      modified += processDirectory(filePath);
    } else if (file.name === 'page.tsx') {
      if (addDynamicExport(filePath)) {
        modified++;
        console.log(`✓ Modified: ${filePath.replace(process.cwd(), '')}`);
      }
    }
  }

  return modified;
}

console.log('='.repeat(80));
console.log('EMERGENCY BUILD FIX: Adding force-dynamic exports');
console.log('='.repeat(80));
console.log();

const dashboardDir = path.join(process.cwd(), 'src', 'app', 'dashboard');
const modified = processDirectory(dashboardDir);

console.log();
console.log('='.repeat(80));
console.log(`✓ Modified ${modified} dashboard pages`);
console.log('='.repeat(80));
console.log();
console.log('These pages will now be generated on-demand instead of at build time.');
console.log('This should dramatically reduce build memory usage from 64GB+ to manageable levels.');
console.log();
console.log('To revert this change, run: git checkout src/app/dashboard');
console.log('='.repeat(80));
