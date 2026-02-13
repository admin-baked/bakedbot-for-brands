/**
 * Bundle Size Analysis Script
 *
 * Analyzes the codebase to identify potential memory bloat:
 * - Count of pages, components, API routes
 * - Large dependencies
 * - Import patterns that might cause bloat
 */

const fs = require('fs');
const path = require('path');

function getDirectorySize(dir) {
  let size = 0;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        size += getDirectorySize(filePath);
      } else {
        size += stats.size;
      }
    }
  } catch (e) {
    // Skip directories we can't read
  }
  return size;
}

function countFiles(dir, extension) {
  let count = 0;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        count += countFiles(filePath, extension);
      } else if (file.endsWith(extension)) {
        count++;
      }
    }
  } catch (e) {
    // Skip
  }
  return count;
}

function analyzeLargestFiles(dir, minSize = 100000) {
  const largeFiles = [];

  function scan(currentDir) {
    try {
      const files = fs.readdirSync(currentDir);
      for (const file of files) {
        const filePath = path.join(currentDir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
          scan(filePath);
        } else if (stats.isFile() && stats.size >= minSize) {
          largeFiles.push({
            path: filePath.replace(dir, ''),
            size: stats.size,
            sizeKB: Math.round(stats.size / 1024),
          });
        }
      }
    } catch (e) {
      // Skip
    }
  }

  scan(dir);
  return largeFiles.sort((a, b) => b.size - a.size);
}

function analyzePackageJson() {
  const pkgPath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  const deps = Object.keys(pkg.dependencies || {});
  const devDeps = Object.keys(pkg.devDependencies || {});

  return {
    totalDeps: deps.length + devDeps.length,
    deps: deps.length,
    devDeps: devDeps.length,
  };
}

console.log('='.repeat(80));
console.log('BAKEDBOT BUNDLE SIZE ANALYSIS');
console.log('='.repeat(80));
console.log();

// 1. Count files
console.log('FILE COUNTS:');
const srcDir = path.join(process.cwd(), 'src');
console.log(`  TypeScript files: ${countFiles(srcDir, '.ts')}`);
console.log(`  TypeScript JSX files: ${countFiles(srcDir, '.tsx')}`);
console.log(`  Total TS/TSX: ${countFiles(srcDir, '.ts') + countFiles(srcDir, '.tsx')}`);
console.log();

// 2. App structure
console.log('APP STRUCTURE:');
const appDir = path.join(srcDir, 'app');
console.log(`  Pages: ${countFiles(path.join(appDir), 'page.tsx')}`);
console.log(`  Layouts: ${countFiles(path.join(appDir), 'layout.tsx')}`);
console.log(`  API Routes: ${countFiles(path.join(appDir, 'api'), 'route.ts')}`);
console.log(`  Server Actions: ${countFiles(path.join(appDir), 'actions.ts')}`);
console.log();

// 3. Directory sizes
console.log('DIRECTORY SIZES (MB):');
const dirs = [
  'src/app',
  'src/components',
  'src/server',
  'src/lib',
  'src/ai',
];

for (const dir of dirs) {
  const dirPath = path.join(process.cwd(), dir);
  const size = getDirectorySize(dirPath);
  const sizeMB = (size / 1024 / 1024).toFixed(2);
  console.log(`  ${dir}: ${sizeMB} MB`);
}
console.log();

// 4. Dependencies
console.log('DEPENDENCIES:');
const pkgInfo = analyzePackageJson();
console.log(`  Production: ${pkgInfo.deps}`);
console.log(`  Development: ${pkgInfo.devDeps}`);
console.log(`  Total: ${pkgInfo.totalDeps}`);
console.log();

// 5. Largest files
console.log('LARGEST SOURCE FILES (>100KB):');
const largeFiles = analyzeLargestFiles(srcDir);
if (largeFiles.length > 0) {
  largeFiles.slice(0, 20).forEach(file => {
    console.log(`  ${file.path} - ${file.sizeKB} KB`);
  });
} else {
  console.log('  None found');
}
console.log();

// 6. Recommendations
console.log('='.repeat(80));
console.log('RECOMMENDATIONS:');
console.log('='.repeat(80));

const totalPages = countFiles(path.join(appDir), 'page.tsx');
if (totalPages > 50) {
  console.log(`⚠️  HIGH PAGE COUNT: ${totalPages} pages may cause build memory issues`);
  console.log('   Consider: Code splitting, lazy loading, or micro-frontend architecture');
}

const totalTSFiles = countFiles(srcDir, '.ts') + countFiles(srcDir, '.tsx');
if (totalTSFiles > 1000) {
  console.log(`⚠️  HIGH FILE COUNT: ${totalTSFiles} TS/TSX files is very large`);
  console.log('   Consider: Breaking into separate packages or monorepo structure');
}

if (pkgInfo.totalDeps > 200) {
  console.log(`⚠️  HIGH DEPENDENCY COUNT: ${pkgInfo.totalDeps} packages`);
  console.log('   Consider: Further dependency audit, remove unused packages');
}

console.log();
console.log('Next steps:');
console.log('1. Run bundle analyzer: ANALYZE=true npm run build');
console.log('2. Check for duplicate dependencies: npm ls');
console.log('3. Review largest files for optimization opportunities');
console.log('='.repeat(80));
