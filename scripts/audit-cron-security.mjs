#!/usr/bin/env node
/**
 * Cron Route Security Audit Script
 * Scans all cron routes to identify which ones implement the safe CRON_SECRET pattern
 *
 * Usage: node scripts/audit-cron-security.mjs
 *
 * Output: Categorizes routes as:
 * - ✅ SAFE: Checks for missing CRON_SECRET before comparison
 * - ❌ UNSAFE: Missing null-check (auth bypass risk)
 * - ⚠️ CUSTOM: Uses non-standard pattern (requires review)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cronDir = path.join(__dirname, '..', 'src', 'app', 'api', 'cron');

function findAllRoutes(dir) {
  const routes = [];

  function walkDir(currentPath) {
    const files = fs.readdirSync(currentPath);

    for (const file of files) {
      const fullPath = path.join(currentPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (file === 'route.ts') {
        routes.push(fullPath);
      }
    }
  }

  walkDir(dir);
  return routes;
}

function analyzeRoute(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relPath = path.relative(cronDir, filePath);
  const name = relPath.split(path.sep)[0];

  const audit = {
    path: relPath,
    name,
    status: 'SAFE',
    hasCronSecretCheck: false,
    hasNullCheck: false,
    pattern: 'UNKNOWN',
    details: '',
    lines: []
  };

  // Check for CRON_SECRET references
  const hasCronSecret = content.includes('CRON_SECRET');

  if (!hasCronSecret) {
    audit.status = 'NO_AUTH';
    audit.details = 'No CRON_SECRET verification found';
    return audit;
  }

  audit.hasCronSecretCheck = true;

  // Look for the safe pattern: const cronSecret = process.env.CRON_SECRET; if (!cronSecret)
  const safePattern1 = /const\s+cronSecret\s*=\s*process\.env\.CRON_SECRET\s*;\s*if\s*\(\s*!cronSecret\s*\)/;
  const safePattern2 = /const\s+cronSecret\s*=\s*process\.env\.CRON_SECRET\s*;\s*if\s*\(\s*!cronSecret\s*\|\|/;

  // Look for null-check before comparison
  const nullCheckPattern = /if\s*\(\s*!cronSecret\s*\)/;

  // Look for unsafe pattern: direct comparison without null check
  const unsafePattern = /if\s*\(\s*authHeader\s*!==\s*`Bearer\s*\$\{process\.env\.CRON_SECRET\}`\s*\)/;
  const unsafePatternVar = /if\s*\(\s*authHeader\s*!==\s*`Bearer\s*\$\{cronSecret\}`\s*\)\s*\{[^}]*return[^}]*status[^}]*401/;

  if (safePattern1.test(content) || safePattern2.test(content)) {
    audit.hasNullCheck = true;
    audit.status = 'SAFE';
    audit.pattern = 'SAFE_INLINE';
    audit.details = 'Has null-check: const cronSecret = ...; if (!cronSecret)';
  } else if (unsafePattern.test(content)) {
    audit.status = 'UNSAFE';
    audit.pattern = 'UNSAFE_DIRECT';
    audit.details = 'Direct CRON_SECRET comparison without null-check';
  } else if (content.includes('authHeader') && content.includes('CRON_SECRET')) {
    // Check if it's a custom pattern (e.g., helper function)
    if (content.includes('function') && content.match(/function.*Cron|function.*Auth/i)) {
      audit.status = 'CUSTOM';
      audit.pattern = 'CUSTOM_HELPER';
      audit.details = 'Uses custom helper function for auth';
    } else if (nullCheckPattern.test(content)) {
      audit.hasNullCheck = true;
      audit.status = 'SAFE';
      audit.pattern = 'SAFE_WITH_CHECK';
      audit.details = 'Has null-check (pattern variant)';
    } else {
      audit.status = 'UNSAFE';
      audit.pattern = 'UNKNOWN_PATTERN';
      audit.details = 'Unclear auth pattern - manual review needed';
    }
  }

  // Extract relevant lines for display
  const cronSecretLines = lines
    .map((line, idx) => ({ line: line.trim(), idx: idx + 1 }))
    .filter(({ line }) =>
      line.includes('CRON_SECRET') ||
      line.includes('authHeader') ||
      line.includes('!cronSecret') ||
      line.includes('if (auth')
    )
    .slice(0, 10);

  audit.lines = cronSecretLines.map(({ line, idx }) => `  ${idx}: ${line}`);

  return audit;
}

function main() {
  console.log('\n🔒 CRON ROUTE SECURITY AUDIT\n');
  console.log(`Scanning: ${cronDir}\n`);

  const routes = findAllRoutes(cronDir);
  routes.sort();

  const audits = routes.map(route => analyzeRoute(route));

  // Categorize
  const safe = audits.filter(a => a.status === 'SAFE');
  const unsafe = audits.filter(a => a.status === 'UNSAFE');
  const custom = audits.filter(a => a.status === 'CUSTOM');
  const noAuth = audits.filter(a => a.status === 'NO_AUTH');

  // Print summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`Total routes scanned:        ${audits.length}`);
  console.log(`✅ SAFE (has null-check):   ${safe.length}`);
  console.log(`❌ UNSAFE (no null-check):  ${unsafe.length}`);
  console.log(`⚠️  CUSTOM (needs review):  ${custom.length}`);
  console.log(`⚪ NO_AUTH (no verification): ${noAuth.length}\n`);

  // Print details by category
  if (unsafe.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`❌ UNSAFE ROUTES (${unsafe.length})`);
    console.log('═══════════════════════════════════════════════════════════\n');

    unsafe.forEach(audit => {
      console.log(`📍 ${audit.name}`);
      console.log(`   File: ${audit.path}`);
      console.log(`   Issue: ${audit.details}`);
      console.log(`   Pattern: ${audit.pattern}`);
      if (audit.lines.length > 0) {
        console.log(`   Code:`);
        audit.lines.forEach(line => console.log(line));
      }
      console.log();
    });
  }

  if (custom.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⚠️  CUSTOM PATTERN ROUTES (${custom.length})`);
    console.log('═══════════════════════════════════════════════════════════\n');

    custom.forEach(audit => {
      console.log(`📍 ${audit.name}`);
      console.log(`   File: ${audit.path}`);
      console.log(`   Pattern: ${audit.pattern}`);
      console.log(`   Details: ${audit.details}`);
      if (audit.lines.length > 0) {
        console.log(`   Code:`);
        audit.lines.forEach(line => console.log(line));
      }
      console.log();
    });
  }

  if (safe.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ SAFE ROUTES (${safe.length})`);
    console.log('═══════════════════════════════════════════════════════════\n');

    safe.forEach(audit => {
      console.log(`✓ ${audit.name} — ${audit.pattern}`);
    });
    console.log();
  }

  if (noAuth.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⚪ NO AUTH VERIFICATION (${noAuth.length})`);
    console.log('═══════════════════════════════════════════════════════════\n');

    noAuth.forEach(audit => {
      console.log(`⚪ ${audit.name}`);
      console.log(`   File: ${audit.path}`);
      console.log(`   Issue: ${audit.details}`);
      console.log();
    });
  }

  // JSON export for programmatic use
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: audits.length,
      safe: safe.length,
      unsafe: unsafe.length,
      custom: custom.length,
      noAuth: noAuth.length
    },
    routes: audits
  };

  fs.writeFileSync(
    path.join(__dirname, '..', 'dev', 'cron-audit-report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 JSON Report saved to: dev/cron-audit-report.json');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Exit with error if unsafe routes found
  if (unsafe.length > 0) {
    console.log(`⚠️  ACTION REQUIRED: ${unsafe.length} unsafe routes need hardening\n`);
    process.exit(1);
  }

  process.exit(0);
}

main();
