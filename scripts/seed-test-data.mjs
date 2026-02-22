#!/usr/bin/env node
/**
 * SP4: Test Data Seeding Template
 *
 * Creates complete test data for org_test_bakedbot with reusable factory functions
 * Enables rapid development and testing without manual Firestore operations
 *
 * Usage:
 *   node scripts/seed-test-data.mjs                # Seed with defaults
 *   node scripts/seed-test-data.mjs --clean       # Delete all test data first
 *   node scripts/seed-test-data.mjs --orgId=...   # Seed different org
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROJECT_ID = 'studio-567050101-bc6e8';

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

function makeCustomer(overrides = {}) {
  const randomId = Math.random().toString(36).substring(7);
  return {
    orgId: 'org_test_bakedbot',
    email: `test+customer${randomId}@bakedbot.ai`,
    tier: 'bronze',
    points: 0,
    segment: 'new',
    enrolledAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    ...overrides
  };
}

function makePlaybookAssignment(overrides = {}) {
  return {
    orgId: 'org_test_bakedbot',
    playbookId: 'playbook_welcome_series',
    status: 'active',
    createdAt: Timestamp.now(),
    ...overrides
  };
}

function makeCampaign(overrides = {}) {
  const randomId = Math.random().toString(36).substring(7);
  return {
    orgId: 'org_test_bakedbot',
    name: `Campaign ${randomId}`,
    status: 'draft',
    type: 'newsletter',
    content: 'Test campaign content',
    createdAt: Timestamp.now(),
    ...overrides
  };
}

function makeInboxThread(overrides = {}) {
  const randomId = Math.random().toString(36).substring(7);
  return {
    userId: `user_test_${randomId}`,
    type: 'message',
    status: 'open',
    createdAt: Timestamp.now(),
    lastActivityAt: Timestamp.now(),
    messages: [],
    ...overrides
  };
}

function makeDriveFile(overrides = {}) {
  const randomId = Math.random().toString(36).substring(7);
  return {
    ownerId: 'user_test_owner',
    name: `test_file_${randomId}.txt`,
    type: 'text',
    category: 'documents',
    createdAt: Timestamp.now(),
    content: 'Test file content',
    isDeleted: false,
    ...overrides
  };
}

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
// MAIN
// ============================================================================

async function main() {
  const shouldClean = process.argv.includes('--clean');
  const targetOrgId = process.argv.find(arg => arg.startsWith('--orgId='))?.split('=')[1] || 'org_test_bakedbot';

  console.log(`\n🌱 Test Data Seeding\n`);

  try {
    // Initialize Firebase
    const serviceAccount = loadServiceAccount();
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: PROJECT_ID,
    });

    const db = getFirestore(app);

    // Clean if requested
    if (shouldClean) {
      console.log(`🗑️  Cleaning test data for ${targetOrgId}...\n`);

      const collections = ['customers', 'playbook_assignments', 'campaigns', 'inbox_threads', 'drive_files'];
      for (const collectionName of collections) {
        const snapshot = await db.collection(collectionName)
          .where('orgId', '==', targetOrgId)
          .select()
          .get();

        let deleted = 0;
        for (const doc of snapshot.docs) {
          await doc.ref.delete();
          deleted++;
        }

        if (deleted > 0) {
          console.log(`   ${collectionName}: deleted ${deleted} docs`);
        }
      }

      console.log();
    }

    // Seed data
    console.log(`✨ Seeding test data for ${targetOrgId}...\n`);

    // Customers (10 with mix of tiers)
    const customerBatch = db.batch();
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    for (let i = 0; i < 10; i++) {
      const docRef = db.collection('customers').doc();
      const customer = makeCustomer({
        tier: tiers[i % tiers.length],
        points: Math.floor(Math.random() * 1000),
        orgId: targetOrgId
      });
      customerBatch.set(docRef, customer);
    }
    await customerBatch.commit();
    console.log(`   ✅ Created 10 customers`);

    // Playbook Assignments (5 with mix of statuses)
    const playbookBatch = db.batch();
    const statuses = ['active', 'paused', 'completed'];
    for (let i = 0; i < 5; i++) {
      const docRef = db.collection('playbook_assignments').doc();
      const assignment = makePlaybookAssignment({
        status: statuses[i % statuses.length],
        orgId: targetOrgId
      });
      playbookBatch.set(docRef, assignment);
    }
    await playbookBatch.commit();
    console.log(`   ✅ Created 5 playbook assignments`);

    // Campaigns (3 with mix of statuses)
    const campaignBatch = db.batch();
    const campaignStatuses = ['draft', 'scheduled', 'sent'];
    for (let i = 0; i < 3; i++) {
      const docRef = db.collection('campaigns').doc();
      const campaign = makeCampaign({
        status: campaignStatuses[i],
        orgId: targetOrgId
      });
      campaignBatch.set(docRef, campaign);
    }
    await campaignBatch.commit();
    console.log(`   ✅ Created 3 campaigns`);

    // Inbox Threads (5 with mix of types)
    const threadBatch = db.batch();
    const threadTypes = ['message', 'support', 'insight'];
    for (let i = 0; i < 5; i++) {
      const docRef = db.collection('inbox_threads').doc();
      const thread = makeInboxThread({
        type: threadTypes[i % threadTypes.length],
        orgId: targetOrgId
      });
      threadBatch.set(docRef, thread);
    }
    await threadBatch.commit();
    console.log(`   ✅ Created 5 inbox threads`);

    // Drive Files (4)
    const fileBatch = db.batch();
    const fileTypes = ['text', 'json', 'markdown', 'pdf'];
    for (let i = 0; i < 4; i++) {
      const docRef = db.collection('drive_files').doc();
      const file = makeDriveFile({
        type: fileTypes[i],
        orgId: targetOrgId
      });
      fileBatch.set(docRef, file);
    }
    await fileBatch.commit();
    console.log(`   ✅ Created 4 drive files`);

    console.log(`\n✅ Seeding complete!\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
