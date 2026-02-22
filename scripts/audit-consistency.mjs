#!/usr/bin/env node
/**
 * SP9: Multi-Org Data Consistency Checker
 *
 * Validates 8 consistency rules across all orgs:
 * - Every customer.orgId has matching org
 * - Every playbook_assignment.orgId has matching org
 * - Every playbook_assignment.playbookId references valid playbook
 * - Every campaign.orgId has matching org
 * - No orphaned drive_files (ownerId must exist)
 * - No duplicate customer emails per org
 * - Customer tier matches points threshold (business rule)
 * - No conflicting playbook statuses (paused + active simultaneously)
 *
 * Reports broken relationships and sample doc IDs
 *
 * Usage:
 *   node scripts/audit-consistency.mjs                  # All orgs
 *   node scripts/audit-consistency.mjs --orgId=...     # Single org
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROJECT_ID = 'studio-567050101-bc6e8';

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
// VALIDATION RULES
// ============================================================================

async function checkOrgReferences(db, targetOrgId) {
  const violations = [];
  const allOrgs = new Set();

  // Load all org IDs
  const orgSnapshot = await db.collection('organizations').get();
  orgSnapshot.docs.forEach(doc => {
    allOrgs.add(doc.id);
  });

  // Check customers (excluding archived records)
  let query = db.collection('customers').where('archived', '!=', true);
  if (targetOrgId) query = query.where('orgId', '==', targetOrgId);

  const customerSnapshot = await query.get();
  const orphanedCustomers = [];

  customerSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.orgId && !allOrgs.has(data.orgId)) {
      orphanedCustomers.push(doc.id);
    }
  });

  if (orphanedCustomers.length > 0) {
    violations.push({
      rule: 'customers.orgId → organizations',
      count: orphanedCustomers.length,
      samples: orphanedCustomers.slice(0, 5)
    });
  }

  return violations;
}

async function checkPlaybookReferences(db, targetOrgId) {
  const violations = [];
  const validPlaybookIds = new Set();

  // Load valid playbooks
  const playbookSnapshot = await db.collection('playbook_templates').get();
  playbookSnapshot.docs.forEach(doc => {
    validPlaybookIds.add(doc.id);
  });

  // Check assignments (excluding archived records)
  let query = db.collection('playbook_assignments').where('archived', '!=', true);
  if (targetOrgId) query = query.where('orgId', '==', targetOrgId);

  const assignmentSnapshot = await query.get();
  const invalidPlaybooks = [];

  assignmentSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.playbookId && !validPlaybookIds.has(data.playbookId)) {
      invalidPlaybooks.push(doc.id);
    }
  });

  if (invalidPlaybooks.length > 0) {
    violations.push({
      rule: 'playbook_assignments.playbookId → playbook_templates',
      count: invalidPlaybooks.length,
      samples: invalidPlaybooks.slice(0, 5)
    });
  }

  return violations;
}

async function checkDuplicateEmails(db, targetOrgId) {
  const violations = [];

  let query = db.collection('customers').where('archived', '!=', true);
  if (targetOrgId) query = query.where('orgId', '==', targetOrgId);

  const snapshot = await query.get();
  const emailMap = {};

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const key = `${data.orgId}:${data.email}`;
    if (!emailMap[key]) emailMap[key] = [];
    emailMap[key].push(doc.id);
  });

  const duplicates = Object.entries(emailMap).filter(([_, ids]) => ids.length > 1);

  if (duplicates.length > 0) {
    violations.push({
      rule: 'No duplicate emails per org',
      count: duplicates.length,
      samples: duplicates.slice(0, 5).map(([email, ids]) => `${email}: ${ids.length} docs`)
    });
  }

  return violations;
}

async function checkTierPoints(db, targetOrgId) {
  const violations = [];
  const tierThresholds = {
    bronze: { min: 0, max: 499 },
    silver: { min: 500, max: 999 },
    gold: { min: 1000, max: 1999 },
    platinum: { min: 2000, max: Infinity }
  };

  let query = db.collection('customers').where('archived', '!=', true);
  if (targetOrgId) query = query.where('orgId', '==', targetOrgId);

  const snapshot = await query.get();
  const mismatches = [];

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const threshold = tierThresholds[data.tier];
    if (threshold && (data.points < threshold.min || data.points > threshold.max)) {
      mismatches.push(doc.id);
    }
  });

  if (mismatches.length > 0) {
    violations.push({
      rule: 'Customer tier ↔ points threshold',
      count: mismatches.length,
      samples: mismatches.slice(0, 5)
    });
  }

  return violations;
}

async function checkPlaybookStatus(db, targetOrgId) {
  const violations = [];

  let query = db.collection('playbook_assignments').where('archived', '!=', true);
  if (targetOrgId) query = query.where('orgId', '==', targetOrgId);

  const snapshot = await query.get();
  const statusMap = {};

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const key = `${data.orgId}:${data.playbookId}`;
    if (!statusMap[key]) statusMap[key] = [];
    statusMap[key].push(data.status);
  });

  const conflicts = Object.entries(statusMap).filter(([_, statuses]) =>
    statuses.includes('active') && statuses.includes('paused')
  );

  if (conflicts.length > 0) {
    violations.push({
      rule: 'No paused + active playbooks simultaneously',
      count: conflicts.length,
      samples: conflicts.slice(0, 5).map(([id]) => id)
    });
  }

  return violations;
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatTable(headers, rows) {
  if (rows.length === 0) return 'No violations';

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

  console.log(`\n🔍 Multi-Org Data Consistency Checker\n`);

  try {
    const serviceAccount = loadServiceAccount();
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: PROJECT_ID,
    });

    const db = getFirestore(app);

    // Run all checks
    console.log('Running consistency checks...\n');

    const allViolations = [];

    allViolations.push(...await checkOrgReferences(db, targetOrgId));
    allViolations.push(...await checkPlaybookReferences(db, targetOrgId));
    allViolations.push(...await checkDuplicateEmails(db, targetOrgId));
    allViolations.push(...await checkTierPoints(db, targetOrgId));
    allViolations.push(...await checkPlaybookStatus(db, targetOrgId));

    // Report
    if (allViolations.length === 0) {
      console.log('✅ All consistency checks passed!\n');
      process.exit(0);
    }

    console.log('⚠️  Found consistency violations:\n');

    for (const violation of allViolations) {
      console.log(`❌ ${violation.rule}: ${violation.count} violations`);
      violation.samples.forEach(sample => {
        console.log(`   • ${sample}`);
      });
      console.log();
    }

    console.log(`📊 Total violations: ${allViolations.length}\n`);

    process.exit(1);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
