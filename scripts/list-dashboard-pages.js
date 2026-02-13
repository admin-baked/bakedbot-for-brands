const fs = require('fs');
const path = require('path');

function findDashboardPages(dir, basePath = '') {
  const pages = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);

      if (entry.isDirectory()) {
        pages.push(...findDashboardPages(fullPath, relativePath));
      } else if (entry.name === 'page.tsx') {
        pages.push(basePath || '/dashboard');
      }
    }
  } catch (e) {
    // Skip
  }

  return pages;
}

const dashboardDir = path.join(process.cwd(), 'src', 'app', 'dashboard');
const pages = findDashboardPages(dashboardDir).sort();

console.log(`Total dashboard pages: ${pages.length}\n`);
console.log('All dashboard pages:\n');

pages.forEach(p => console.log(`  /dashboard/${p}`));
