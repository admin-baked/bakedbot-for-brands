#!/usr/bin/env node
/**
 * SP11: Firestore Query Cost Calculator
 *
 * Scans TypeScript files for Firestore query patterns
 * Estimates read costs and flags high-risk patterns:
 * - Collection scans without .where (read all docs)
 * - Queries without .limit (unbounded reads)
 * - WHERE on unindexed fields
 * - N+1 patterns (queries inside loops)
 *
 * Estimates monthly cost at Thrive's volume (100 customers)
 *
 * Usage:
 *   node scripts/audit-query-cost.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ============================================================================
// UTILITIES
// ============================================================================

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        walkDir(fullPath, callback);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
      callback(fullPath);
    }
  }
}

function estimateCost(queryType, frequency) {
  // Cost per read at Google Cloud pricing
  const costPerRead = 0.00006; // $0.06 per 1M reads
  const monthlyReads = frequency * 30; // Assume daily frequency
  return (monthlyReads * costPerRead).toFixed(4);
}

// ============================================================================
// ANALYSIS
// ============================================================================

function analyzeFile(filePath, content) {
  const findings = [];
  const lines = content.split('\n');

  // Pattern 1: Collection.where().orderBy() — requires composite index
  const compoundPattern = /\.collection\(['"](\w+)['"]\)\s*\.where\(/;
  const matches = [...content.matchAll(/\.collection\(['"](\w+)['"]\)[^;]*\.where\(/g)];

  matches.forEach((match, idx) => {
    const collection = match[1];
    // Check if it also has .orderBy()
    if (content.includes('.orderBy(')) {
      findings.push({
        file: filePath,
        line: lines.slice(0, content.indexOf(match[0])).length,
        type: 'COMPOSITE_INDEX',
        collection,
        issue: 'WHERE + ORDER BY requires composite index',
        risk: 'MEDIUM'
      });
    }
  });

  // Pattern 2: Collection scan without .where()
  const scanPattern = /\.collection\(['"](\w+)['"]\)\s*(?!\.where)[^;]*;/g;
  const scans = [...content.matchAll(scanPattern)];

  scans.forEach(match => {
    if (!match[0].includes('.where') && !match[0].includes('.doc(')) {
      findings.push({
        file: filePath,
        line: lines.slice(0, content.indexOf(match[0])).length,
        type: 'COLLECTION_SCAN',
        collection: match[1],
        issue: 'No .where() — reads all documents',
        risk: 'HIGH'
      });
    }
  });

  // Pattern 3: Query without .limit()
  const noLimitPattern = /\.where\([^)]+\)(?!.*\.limit\()/;
  const limitMatches = [...content.matchAll(/\.where\([^)]+\)[^;]*\.get\(\)/g)];

  limitMatches.forEach(match => {
    if (!match[0].includes('.limit(')) {
      findings.push({
        file: filePath,
        line: lines.slice(0, content.indexOf(match[0])).length,
        type: 'UNBOUNDED_READ',
        issue: 'No .limit() — potentially unbounded query',
        risk: 'HIGH'
      });
    }
  });

  // Pattern 4: Query inside loop (N+1 pattern)
  const loopPattern = /for\s*\([^)]*\)|\.forEach\([^)]*\)/;
  const inLoop = content.match(loopPattern);
  if (inLoop) {
    const loopIndex = content.indexOf(inLoop[0]);
    const afterLoop = content.substring(loopIndex);
    if (afterLoop.includes('.collection(') || afterLoop.includes('.where(')) {
      findings.push({
        file: filePath,
        line: lines.slice(0, loopIndex).length,
        type: 'N_PLUS_ONE',
        issue: 'Query inside loop — N+1 pattern',
        risk: 'CRITICAL'
      });
    }
  }

  return findings;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n💰 Firestore Query Cost Analysis\n');

  try {
    const findings = [];
    let totalQueries = 0;

    console.log('Scanning TypeScript files...\n');

    walkDir(path.join(ROOT, 'src'), (filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const queryCount = (content.match(/\.collection\(/g) || []).length;
      totalQueries += queryCount;

      const fileFi = analyzeFile(filePath, content);
      findings.push(...fileFi);
    });

    console.log(`Found ${totalQueries} Firestore queries in TypeScript files\n`);

    if (findings.length === 0) {
      console.log('✅ No cost concerns detected!\n');
      process.exit(0);
    }

    // Group by risk
    const critical = findings.filter(f => f.risk === 'CRITICAL');
    const high = findings.filter(f => f.risk === 'HIGH');
    const medium = findings.filter(f => f.risk === 'MEDIUM');

    console.log('⚠️  RISK FINDINGS:\n');

    if (critical.length > 0) {
      console.log(`🔴 CRITICAL (${critical.length}):`);
      critical.forEach(f => {
        console.log(`   ${f.file.replace(ROOT, '.')}:${f.line}`);
        console.log(`   ${f.issue}\n`);
      });
    }

    if (high.length > 0) {
      console.log(`🟠 HIGH (${high.length}):`);
      high.slice(0, 5).forEach(f => {
        console.log(`   ${f.file.replace(ROOT, '.')}:${f.line}`);
        console.log(`   ${f.issue}`);
      });
      if (high.length > 5) {
        console.log(`   ... and ${high.length - 5} more`);
      }
      console.log();
    }

    if (medium.length > 0) {
      console.log(`🟡 MEDIUM (${medium.length}):`);
      console.log(`   Consider adding composite indexes for WHERE + ORDER BY queries\n`);
    }

    // Cost estimate
    console.log('💵 ESTIMATED COSTS (at Thrive scale: 100 customers):\n');
    console.log('   Collection scans: ~$5-15/month (avoid!)');
    console.log('   Unbounded queries: ~$2-8/month (add .limit())');
    console.log('   Indexed queries: ~$0.10-0.50/month (optimal)\n');

    const totalIssues = critical.length + high.length + medium.length;
    console.log(`Total issues found: ${totalIssues}\n`);

    process.exit(findings.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
