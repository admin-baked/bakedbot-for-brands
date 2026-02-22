#!/usr/bin/env node
/**
 * SP6: Build Error Auto-Fixer
 *
 * Runs npm run check:types and attempts to auto-fix common TypeScript errors
 * Common patterns: wrong import paths, missing async, console.log instead of logger
 *
 * Usage:
 *   node scripts/fix-build.mjs           # Report fixes only (dry-run)
 *   node scripts/fix-build.mjs --apply   # Apply fixes
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ============================================================================
// KNOWN FIXES
// ============================================================================

const KNOWN_FIXES = [
  {
    pattern: /from ['"]@\/server\/auth\/require-user['"]/g,
    replacement: "from '@/server/auth/auth'",
    description: 'Fix wrong auth import path',
    filePattern: /\.ts$/
  },
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.info(',
    description: 'Replace console.log with logger.info',
    filePattern: /\/(server|actions|services|agents)\//,
    context: 'server file'
  },
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error(',
    description: 'Replace console.error with logger.error',
    filePattern: /\/(server|actions|services|agents)\//,
    context: 'server file'
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn(',
    description: 'Replace console.warn with logger.warn',
    filePattern: /\/(server|actions|services|agents)\//,
    context: 'server file'
  }
];

// ============================================================================
// UTILITIES
// ============================================================================

function runTypeCheck() {
  try {
    const output = execSync('npm run check:types 2>&1', {
      encoding: 'utf-8',
      cwd: ROOT
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, output: error.stdout || error.message };
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content);
    return true;
  } catch {
    return false;
  }
}

function parseTypeScriptErrors(output) {
  const lines = output.split('\n');
  const errors = [];

  for (const line of lines) {
    // Match pattern: src/file.ts:123:45 - error TS1234: Error message
    const match = line.match(/^(src\/[^:]+):(\d+):(\d+) - error TS\d+: (.+)$/);
    if (match) {
      const [, filePath, lineNum, col, message] = match;
      errors.push({
        filePath: path.join(ROOT, filePath),
        lineNum: parseInt(lineNum),
        col: parseInt(col),
        message,
        line: line
      });
    }
  }

  return errors;
}

// ============================================================================
// FIXES
// ============================================================================

function applyFixes(filePath, content) {
  let modified = false;
  let result = content;

  for (const fix of KNOWN_FIXES) {
    if (!fix.filePattern.test(filePath)) continue;

    const hasMatch = fix.pattern.test(result);
    if (!hasMatch) continue;

    result = result.replace(fix.pattern, fix.replacement);
    modified = true;

    console.log(`   ${filePath.replace(ROOT, '.')} — ${fix.description}`);
  }

  return { result, modified };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const shouldApply = process.argv.includes('--apply');

  console.log('\n🔧 Build Error Auto-Fixer\n');
  console.log('Running type check...\n');

  const typeCheckResult = runTypeCheck();

  if (typeCheckResult.success) {
    console.log('✅ Build passed! No errors to fix.\n');
    process.exit(0);
  }

  console.log('Found errors in type check.\n');

  // Find fixable files
  const serverFiles = [];
  const walkDir = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          walkDir(fullPath);
        }
      } else if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
        serverFiles.push(fullPath);
      }
    }
  };

  walkDir(path.join(ROOT, 'src/server'));
  walkDir(path.join(ROOT, 'src/app/api'));

  // Apply fixes to each file
  const fixedFiles = [];

  for (const filePath of serverFiles) {
    const content = readFile(filePath);
    if (!content) continue;

    const { result, modified } = applyFixes(filePath, content);

    if (modified) {
      fixedFiles.push({ filePath, content: result });
    }
  }

  if (fixedFiles.length === 0) {
    console.log('No auto-fixable patterns found.\n');
    console.log('Possible next steps:');
    console.log('  1. Review errors in type check output above');
    console.log('  2. Add custom fix pattern to KNOWN_FIXES array');
    console.log('  3. Fix manually or ask Claude Code for help\n');
    process.exit(1);
  }

  console.log(`\n📝 Found ${fixedFiles.length} file(s) with fixable issues:\n`);

  for (const { filePath } of fixedFiles) {
    console.log(`   • ${filePath.replace(ROOT, '.')}`);
  }

  if (!shouldApply) {
    console.log(`\n💡 Run with --apply to apply fixes\n`);
    process.exit(1);
  }

  console.log(`\n✏️  Applying fixes...\n`);

  for (const { filePath, content } of fixedFiles) {
    if (!writeFile(filePath, content)) {
      console.error(`   ❌ Failed to write ${filePath}`);
      process.exit(1);
    }
  }

  console.log(`\n✅ Applied fixes to ${fixedFiles.length} file(s)`);
  console.log(`   Re-running type check...\n`);

  const finalCheck = runTypeCheck();
  if (finalCheck.success) {
    console.log('✅ Type check passed! Build is healthy.\n');
  } else {
    console.log('⚠️  Type check still has errors. Additional fixes may be needed.\n');
    process.exit(1);
  }
}

main();
