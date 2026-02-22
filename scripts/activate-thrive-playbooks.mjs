#!/usr/bin/env node

/**
 * Thrive Syracuse Playbook Activation Script
 * Converts 22 Empire playbook assignments from PAUSED → ACTIVE
 * Enables email automation and customer communications
 *
 * Usage: node scripts/activate-thrive-playbooks.mjs
 *
 * Requires: FIREBASE_SERVICE_ACCOUNT_KEY in .env.local (base64 encoded)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env.local');

// Load .env.local
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const ORG_ID = 'org_thrive_syracuse';

async function activateThrivePlaybooksAsync() {
  console.log('\n🚀 THRIVE SYRACUSE PLAYBOOK ACTIVATION');
  console.log('═══════════════════════════════════════\n');

  try {
    // 1. Initialize Firebase Admin SDK
    const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKeyBase64) {
      throw new Error('❌ FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
    }

    console.log('📦 Initializing Firebase Admin SDK...');
    const serviceAccountKeyJson = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf-8');
    const serviceAccountKey = JSON.parse(serviceAccountKeyJson);

    const app = initializeApp({
      credential: cert(serviceAccountKey),
      projectId: 'studio-567050101-bc6e8',
    });

    const db = getFirestore(app);
    console.log('✅ Firebase initialized\n');

    // 2. Query all PAUSED playbook assignments for Thrive
    console.log(`🔍 Searching for paused playbooks in ${ORG_ID}...`);

    const assignments = await db.collectionGroup('playbook_assignments')
      .where('orgId', '==', ORG_ID)
      .where('status', '==', 'paused')
      .get();

    console.log(`📊 Found: ${assignments.size} paused assignments\n`);

    if (assignments.empty) {
      console.log('⚠️  No paused playbooks found. All may already be active.');
      process.exit(0);
    }

    // 3. Batch update all to ACTIVE
    console.log('🔄 Activating playbooks...\n');

    const batch = db.batch();
    let count = 0;

    assignments.forEach(doc => {
      const data = doc.data();
      console.log(`  ${++count}. Playbook ID: ${data.playbookId}`);
      console.log(`     Subscription: ${data.subscriptionId}`);
      console.log(`     Status: paused → active`);

      batch.update(doc.ref, {
        status: 'active',
        activatedAt: new Date(),
        lastStatusChange: new Date(),
      });
    });

    console.log('\n⏳ Committing batch update...');
    await batch.commit();

    console.log('\n✅ ACTIVATION COMPLETE\n');
    console.log(`✨ ${assignments.size} playbooks now ACTIVE`);
    console.log('📧 Email automation enabled');
    console.log('🎯 Customer campaigns can now be sent\n');

    // 4. Verification
    console.log('🔐 Verifying activation...\n');

    const verified = await db.collectionGroup('playbook_assignments')
      .where('orgId', '==', ORG_ID)
      .where('status', '==', 'paused')
      .get();

    if (verified.empty) {
      console.log('✅ VERIFIED: All playbooks are now ACTIVE\n');
    } else {
      console.log(`⚠️  WARNING: ${verified.size} playbooks still paused\n`);
    }

    // 5. Summary
    console.log('═══════════════════════════════════════');
    console.log('📋 ACTIVATION SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Org ID: ${ORG_ID}`);
    console.log(`Playbooks Activated: ${assignments.size}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('Status: ✅ READY FOR LAUNCH\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Verify FIREBASE_SERVICE_ACCOUNT_KEY is in .env.local');
    console.error('2. Check it\'s properly base64 encoded');
    console.error('3. Verify Firebase credentials have Firestore write access');
    process.exit(1);
  }
}

// Run the function
activateThrivPlaybooksAsync().catch(err => {
  console.error('Uncaught error:', err);
  process.exit(1);
});
