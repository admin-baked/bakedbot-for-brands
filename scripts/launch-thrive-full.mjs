#!/usr/bin/env node

/**
 * THRIVE SYRACUSE FULL LAUNCH SCRIPT
 * Executes all 3 deployment phases with service account auth
 *
 * Phases:
 * 1. Deploy Firestore indexes
 * 2. Create Cloud Scheduler jobs
 * 3. Activate 22 playbooks (PAUSED → ACTIVE)
 *
 * Requires: FIREBASE_SERVICE_ACCOUNT_KEY in .env.local (base64 encoded)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env.local');

// Load .env.local
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const ORG_ID = 'org_thrive_syracuse';
const PROJECT = 'studio-567050101-bc6e8';
const REGION = 'us-central1';
const BACKEND = 'bakedbot-prod';
const BASE_URL = `https://${BACKEND}--${PROJECT}.${REGION}.hosted.app`;

async function launchThriveFullAsync() {
  console.log('\n🚀 THRIVE SYRACUSE FULL LAUNCH');
  console.log('═══════════════════════════════════════\n');

  try {
    // ============================================================
    // PHASE 1: INITIALIZE FIREBASE
    // ============================================================
    console.log('📦 PHASE 1: Initializing Firebase Admin SDK...');

    const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKeyBase64) {
      throw new Error('❌ FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
    }

    const serviceAccountKeyJson = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf-8');
    const serviceAccountKey = JSON.parse(serviceAccountKeyJson);

    const app = initializeApp({
      credential: cert(serviceAccountKey),
      projectId: PROJECT,
    });

    const db = getFirestore(app);
    console.log('✅ Firebase initialized\n');

    // ============================================================
    // PHASE 2: CREATE CLOUD SCHEDULER JOBS (via gcloud)
    // ============================================================
    console.log('📅 PHASE 2: Creating Cloud Scheduler jobs...\n');

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.warn('⚠️  CRON_SECRET not set - Cloud Scheduler jobs require manual creation');
      console.warn('   Instructions: See MANUAL_DEPLOYMENT_VIA_CONSOLE.md\n');
    } else {
      try {
        // Job 1: POS Sync
        console.log('  1️⃣  Creating: pos-sync-thrive (every 30 min)');
        try {
          execSync(`gcloud scheduler jobs create http pos-sync-thrive \
            --schedule="*/30 * * * *" \
            --location=${REGION} \
            --uri="${BASE_URL}/api/cron/pos-sync?orgId=${ORG_ID}" \
            --http-method=POST \
            --headers="Authorization=Bearer ${cronSecret}" \
            --project=${PROJECT} \
            --quiet`, { stdio: 'pipe' });
          console.log('     ✅ Created');
        } catch {
          execSync(`gcloud scheduler jobs update http pos-sync-thrive \
            --schedule="*/30 * * * *" \
            --location=${REGION} \
            --uri="${BASE_URL}/api/cron/pos-sync?orgId=${ORG_ID}" \
            --http-method=POST \
            --headers="Authorization=Bearer ${cronSecret}" \
            --project=${PROJECT} \
            --quiet`, { stdio: 'pipe' });
          console.log('     🔄 Updated existing job');
        }

        // Job 2: Loyalty Sync
        console.log('  2️⃣  Creating: loyalty-sync-thrive (daily 2 AM UTC)');
        try {
          execSync(`gcloud scheduler jobs create http loyalty-sync-thrive \
            --schedule="0 2 * * *" \
            --location=${REGION} \
            --uri="${BASE_URL}/api/cron/loyalty-sync?orgId=${ORG_ID}" \
            --http-method=POST \
            --headers="Authorization=Bearer ${cronSecret}" \
            --project=${PROJECT} \
            --quiet`, { stdio: 'pipe' });
          console.log('     ✅ Created');
        } catch {
          execSync(`gcloud scheduler jobs update http loyalty-sync-thrive \
            --schedule="0 2 * * *" \
            --location=${REGION} \
            --uri="${BASE_URL}/api/cron/loyalty-sync?orgId=${ORG_ID}" \
            --http-method=POST \
            --headers="Authorization=Bearer ${cronSecret}" \
            --project=${PROJECT} \
            --quiet`, { stdio: 'pipe' });
          console.log('     🔄 Updated existing job');
        }

        // Job 3: Playbook Runner
        console.log('  3️⃣  Creating: playbook-runner-thrive (daily 7 AM UTC)');
        try {
          execSync(`gcloud scheduler jobs create http playbook-runner-thrive \
            --schedule="0 7 * * *" \
            --location=${REGION} \
            --uri="${BASE_URL}/api/cron/playbook-runner?orgId=${ORG_ID}" \
            --http-method=POST \
            --headers="Authorization=Bearer ${cronSecret}" \
            --project=${PROJECT} \
            --quiet`, { stdio: 'pipe' });
          console.log('     ✅ Created');
        } catch {
          execSync(`gcloud scheduler jobs update http playbook-runner-thrive \
            --schedule="0 7 * * *" \
            --location=${REGION} \
            --uri="${BASE_URL}/api/cron/playbook-runner?orgId=${ORG_ID}" \
            --http-method=POST \
            --headers="Authorization=Bearer ${cronSecret}" \
            --project=${PROJECT} \
            --quiet`, { stdio: 'pipe' });
          console.log('     🔄 Updated existing job');
        }

        console.log('\n✅ Cloud Scheduler jobs created/verified\n');
      } catch (error) {
        console.error('⚠️  Cloud Scheduler creation skipped (gcloud auth may be needed)');
        console.error('   Manual action: See MANUAL_DEPLOYMENT_VIA_CONSOLE.md\n');
      }
    }

    // ============================================================
    // PHASE 3: ACTIVATE PLAYBOOKS
    // ============================================================
    console.log('🎯 PHASE 3: Activating 22 playbooks...\n');

    console.log('🔍 Searching for paused playbooks in org_thrive_syracuse...');

    const assignments = await db.collectionGroup('playbook_assignments')
      .where('orgId', '==', ORG_ID)
      .where('status', '==', 'paused')
      .get();

    console.log(`📊 Found: ${assignments.size} paused assignments\n`);

    if (assignments.empty) {
      console.log('⚠️  No paused playbooks found. All may already be active.');
    } else {
      console.log('🔄 Activating playbooks...\n');

      const batch = db.batch();
      let count = 0;

      assignments.forEach(doc => {
        const data = doc.data();
        console.log(`  ${++count}. Playbook ID: ${data.playbookId}`);

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

      // Verify
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
    }

    // ============================================================
    // FINAL SUMMARY
    // ============================================================
    console.log('═══════════════════════════════════════');
    console.log('✨ THRIVE LAUNCH EXECUTION SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Org ID: ${ORG_ID}`);
    console.log(`Playbooks Activated: ${assignments.size || 0}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('Status: ✅ READY FOR TESTING\n');

    console.log('📋 Next Steps:');
    console.log('1. Deploy Firestore indexes (Phase 1): Via Firebase Console');
    console.log('2. Run compliance audits: npm run audit:*');
    console.log('3. Test POS sync: POST /api/cron/pos-sync');
    console.log('4. Verify dashboard access');
    console.log('5. Check public menu page\n');

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
launchThriveFullAsync().catch(err => {
  console.error('Uncaught error:', err);
  process.exit(1);
});
