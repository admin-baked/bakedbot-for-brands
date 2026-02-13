const fs = require('fs');
const path = require('path');

function findPages(dir, basePath = '') {
  const pages = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);

      if (entry.isDirectory()) {
        pages.push(...findPages(fullPath, relativePath));
      } else if (entry.name === 'page.tsx') {
        pages.push(basePath || '/');
      }
    }
  } catch (e) {
    // Skip
  }

  return pages;
}

const appDir = path.join(process.cwd(), 'src', 'app');
const pages = findPages(appDir).sort();

console.log(`Total pages: ${pages.length}\n`);
console.log('Pages by section:\n');

// Group by top-level route
const grouped = {};
for (const page of pages) {
  const section = page.split(path.sep)[0] || 'root';
  if (!grouped[section]) grouped[section] = [];
  grouped[section].push(page);
}

for (const [section, sectionPages] of Object.entries(grouped).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${section}: ${sectionPages.length} pages`);
}

console.log('\n\nFirst 30 pages:');
pages.slice(0, 30).forEach(p => console.log(`  ${p}`));
