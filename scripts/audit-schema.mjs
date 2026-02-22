#!/usr/bin/env node
/**
 * SP3: Firestore Schema Audit & Validator
 *
 * Uses service account auth from .env.local
 * Samples documents per collection and validates against schema config
 * Reports field completeness, type mismatches, and data quality issues
 *
 * Usage:
 *   node scripts/audit-schema.mjs                            # All orgs
 *   node scripts/audit-schema.mjs --orgId=org_thrive_syracuse # Single org
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

const SCHEMAS = {
  customers: {
    required: ['orgId', 'email', 'tier', 'points'],
    optional: ['phone', 'firstName', 'lastName', 'segment', 'enrolledAt', 'createdAt'],
    types: {
      orgId: 'string',
      email: 'string',
      tier: 'string',
      points: 'number',
      phone: 'string',
      firstName: 'string',
      lastName: 'string',
      segment: 'string',
    }
  },

  playbook_assignments: {
    required: ['orgId', 'playbookId', 'status'],
    optional: ['subscriptionId', 'createdAt', 'updatedAt'],
    types: {
      orgId: 'string',
      playbookId: 'string',
      status: 'string',
      subscriptionId: 'string',
    }
  },

  campaigns: {
    required: ['orgId', 'status', 'createdAt'],
    optional: ['name', 'content', 'type', 'scheduledAt'],
    types: {
      orgId: 'string',
      status: 'string',
      name: 'string',
      content: 'string',
      type: 'string',
    }
  },

  inbox_threads: {
    required: ['userId', 'type', 'createdAt'],
    optional: ['status', 'lastActivityAt', 'messages'],
    types: {
      userId: 'string',
      type: 'string',
      status: 'string',
    }
  },

  drive_files: {
    required: ['ownerId', 'createdAt'],
    optional: ['name', 'type', 'category', 'isDeleted', 'updatedAt'],
    types: {
      ownerId: 'string',
      name: 'string',
      type: 'string',
      category: 'string',
      isDeleted: 'boolean',
    }
  },

  organizations: {
    required: ['name', 'type'],
    optional: ['createdAt', 'planTier', 'status'],
    types: {
      name: 'string',
      type: 'string',
      planTier: 'string',
    }
  },

  users: {
    required: ['email', 'createdAt'],
    optional: ['name', 'role', 'orgId'],
    types: {
      email: 'string',
      name: 'string',
      role: 'string',
      orgId: 'string',
    }
  },

  playbook_executions: {
    required: ['orgId', 'playbookId', 'startedAt'],
    optional: ['completedAt', 'status', 'result'],
    types: {
      orgId: 'string',
      playbookId: 'string',
      status: 'string',
    }
  },
};

// ============================================================================
// SERVICE ACCOUNT AUTH
// ============================================================================

function loadServiceAccount() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found');
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  let serviceAccountKey = null;

  content.split('\n').forEach(line => {
    if (line.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY=')) {
      serviceAccountKey = line.split('=')[1];
    }
  });

  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  }

  const serviceAccountJson = Buffer.from(serviceAccountKey, 'base64').toString('utf-8');
  return JSON.parse(serviceAccountJson);
}

// ============================================================================
// VALIDATION
// ============================================================================

function getFieldType(value) {
  if (value === null || value === undefined) return 'null';
  if (value instanceof Timestamp) return 'timestamp';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return typeof value;
}

function validateDoc(doc, schema) {
  const issues = [];
  const data = doc.data();
  if (!data) return issues;

  // Check required fields
  for (const field of schema.required) {
    if (!(field in data)) {
      issues.push(`missing required field: ${field}`);
    } else if (data[field] === null || data[field] === undefined) {
      issues.push(`${field} is null/undefined`);
    }
  }

  // Check types
  for (const [field, expectedType] of Object.entries(schema.types)) {
    if (field in data && data[field] !== null) {
      const actualType = getFieldType(data[field]);
      if (actualType !== expectedType && actualType !== 'null') {
        issues.push(`${field}: expected ${expectedType}, got ${actualType}`);
      }
    }
  }

  return issues;
}

/**
 * Format table output
 */
function formatTable(headers, rows) {
  if (rows.length === 0) return 'No data';

  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => String(r[i]).length))
  );

  const separator = '┌' + colWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
  const header = '│ ' + headers.map((h, i) => h.padEnd(colWidths[i])).join(' │ ') + ' │';
  const divider = '├' + colWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';
  const bottom = '└' + colWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';

  const formattedRows = rows.map(row =>
    '│ ' + row.map((r, i) => String(r).padEnd(colWidths[i])).join(' │ ') + ' │'
  );

  return [separator, header, divider, ...formattedRows, bottom].join('\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const targetOrgId = process.argv.find(arg => arg.startsWith('--orgId='))?.split('=')[1];

  console.log('\n🏗️  Firestore Schema Audit\n');

  try {
    // Initialize Firebase
    const serviceAccount = loadServiceAccount();
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: 'studio-567050101-bc6e8',
    });

    const db = getFirestore(app);

    // Audit each collection
    const results = [];

    for (const [collection, schema] of Object.entries(SCHEMAS)) {
      let query = db.collection(collection);

      if (targetOrgId && schema.required.includes('orgId')) {
        query = query.where('orgId', '==', targetOrgId);
      }

      const snapshot = await query.limit(20).get();
      const docs = snapshot.docs;

      if (docs.length === 0) {
        results.push({
          collection,
          count: 0,
          valid: 0,
          invalid: 0,
          percentage: 'N/A',
          issues: []
        });
        continue;
      }

      let validCount = 0;
      const allIssues = [];
      const issuesByDoc = {};

      for (const doc of docs) {
        const issues = validateDoc(doc, schema);
        if (issues.length === 0) {
          validCount++;
        } else {
          allIssues.push(...issues);
          issuesByDoc[doc.id] = issues;
        }
      }

      const percentage = Math.round((validCount / docs.length) * 100);
      results.push({
        collection,
        count: docs.length,
        valid: validCount,
        invalid: docs.length - validCount,
        percentage: `${percentage}%`,
        issues: allIssues.slice(0, 5) // First 5 issues
      });
    }

    // Report
    const rows = results.map(r => [
      r.collection,
      r.count,
      r.valid,
      r.invalid,
      r.percentage
    ]);

    console.log(formatTable(['Collection', 'Sampled', 'Valid', 'Invalid', 'Health'], rows));
    console.log();

    // Details
    for (const r of results) {
      if (r.invalid > 0 && r.issues.length > 0) {
        console.log(`⚠️  ${r.collection}: ${r.issues.length} issues detected`);
        r.issues.forEach(issue => console.log(`    • ${issue}`));
      }
    }

    console.log();
    const totalValid = results.reduce((s, r) => s + r.valid, 0);
    const totalDocs = results.reduce((s, r) => s + r.count, 0);
    console.log(`📊 Overall: ${totalValid}/${totalDocs} documents valid (${Math.round((totalValid / totalDocs) * 100)}%)\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
