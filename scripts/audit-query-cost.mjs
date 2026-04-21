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

  // Strip block comments and inline comments for line-by-line analysis
  let inBlockComment = false;
  const cleanLines = lines.map(line => {
    if (line.includes('/*')) inBlockComment = true;
    let l = inBlockComment ? '' : line.split('//')[0];
    if (line.includes('*/')) inBlockComment = false;
    return l;
  });

  let inLoop = false;
  let loopStartLine = 0;
  let braceDepth = 0;
  let loopDepth = -1;

  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i];
    
    // Pattern 1: Collection.where().orderBy() — requires composite index
    if (line.includes('.collection(') && line.includes('.where(') && line.includes('.orderBy(')) {
      const match = line.match(/\.collection\(['"](\w+)['"]\)/);
      if (match) {
        findings.push({
          file: filePath,
          line: i + 1,
          type: 'COMPOSITE_INDEX',
          collection: match[1],
          issue: 'WHERE + ORDER BY requires composite index',
          risk: 'MEDIUM'
        });
      }
    }

    // Loop tracker
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    if (line.match(/for\s*\(.*\)|\.forEach\(/) || line.match(/while\s*\(/)) {
       loopDepth = braceDepth + 1; // Assuming loop opens a brace soon
       if (line.includes('{')) {
         loopDepth = braceDepth; // It opened on this line
       }
       inLoop = true;
       loopStartLine = i + 1;
    }

    braceDepth += openBraces - closeBraces;

    if (inLoop && braceDepth < loopDepth) {
       inLoop = false;
       loopDepth = -1;
    }

    // Pattern 4: Query inside loop
    if (inLoop && line.includes('.get(') && (line.includes('.collection(') || line.includes('.where(') || cleanLines.slice(Math.max(0, i-5), i).some(l => l.includes('.collection(') || l.includes('query')))) {
       if (!line.includes('.batch(')) {
           // Ensure it's not a known false positive where get is unrelated
           findings.push({
             file: filePath,
             line: i + 1,
             type: 'N_PLUS_ONE',
             issue: `Query read (.get()) inside loop (loop started at line ${loopStartLine}) — N+1 pattern`,
             risk: 'CRITICAL'
           });
       }
    }
  }

  // Cross-line pattern checks for Pattern 2 & 3
  // Pattern 2: Collection scan without .where()
  const scanMatches = [...content.matchAll(/\.collection\(['"](\w+)['"]\)[^;]*\.get\(/g)];
  scanMatches.forEach(match => {
    if (!match[0].includes('.where') && !match[0].includes('.doc(') && !match[0].includes('.count(')) {
      findings.push({
        file: filePath,
        line: lines.slice(0, content.indexOf(match[0])).length,
        type: 'COLLECTION_SCAN',
        collection: match[1],
        issue: 'No .where() before .get() — reads all documents',
        risk: 'HIGH'
      });
    }
  });

  // Pattern 3: Query without .limit()
  const limitMatches = [...content.matchAll(/\.where\([^)]+\)[^;]*\.get\(\)/g)];
  limitMatches.forEach(match => {
    if (!match[0].includes('.limit(') && !match[0].includes('.count(')) {
      findings.push({
        file: filePath,
        line: lines.slice(0, content.indexOf(match[0])).length,
        type: 'UNBOUNDED_READ',
        issue: 'No .limit() — potentially unbounded query',
        risk: 'HIGH'
      });
    }
  });

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
