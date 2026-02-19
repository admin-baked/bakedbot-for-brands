/**
 * Activate Empire-Tier Playbooks for an Organization
 *
 * Seeds the `playbook_assignments` Firestore collection with all
 * Empire-tier playbooks for a given org. Safe to re-run (idempotent).
 *
 * Usage:
 *   node scripts/activate-empire-playbooks.mjs <orgId>
 *
 * Example (Thrive Syracuse):
 *   node scripts/activate-empire-playbooks.mjs org_thrive_syracuse
 *
 * Example (Herbalist Samui):
 *   node scripts/activate-empire-playbooks.mjs dispensary_herbalistsamui
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Empire-tier playbook IDs (from src/config/playbooks.ts — verified 2026-02-18)
// Includes all playbooks where tiers array contains 'empire'.
// Note: 'weekly-competitive-snapshot' is scout-only — NOT included here.
const EMPIRE_PLAYBOOK_IDS = [
    // Onboarding (4)
    'welcome-sequence',
    'owner-quickstart-guide',
    'menu-health-scan',
    'white-glove-onboarding',
    // Engagement (5)
    'post-purchase-thank-you',
    'birthday-loyalty-reminder',
    'win-back-sequence',
    'new-product-launch',
    'vip-customer-identification',
    // Competitive Intel (3 — 'weekly-competitive-snapshot' is scout-only)
    'pro-competitive-brief',
    'daily-competitive-intel',
    'real-time-price-alerts',
    // Compliance
    'weekly-compliance-digest',
    'pre-send-campaign-check',
    'jurisdiction-change-alert',
    'audit-prep-automation',
    // Analytics
    'weekly-performance-snapshot',
    'campaign-roi-report',
    'executive-daily-digest',
    'multi-location-rollup',
    // Seasonal (1)
    'seasonal-template-pack',
    // System (1 — usage-alert for all paid tiers; tier-upgrade-nudge is auto-managed)
    'usage-alert',
];

async function activateEmpirePlaybooks(orgId) {
    console.log(`\n🔧 Initializing Firebase Admin SDK...`);

    if (!admin.apps.length) {
        const serviceAccountPath = join(__dirname, '..', 'firebase-service-account.json');
        try {
            const fileContent = fs.readFileSync(serviceAccountPath, 'utf-8');
            const serviceAccount = JSON.parse(fileContent);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id,
            });
            console.log(`✅ Firebase Admin initialized (project: ${serviceAccount.project_id})`);
        } catch (err) {
            console.error(`❌ Could not load firebase-service-account.json: ${err.message}`);
            console.log(`   → Download from Firebase Console → Project Settings → Service Accounts`);
            process.exit(1);
        }
    }

    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    console.log(`\n📋 Activating ${EMPIRE_PLAYBOOK_IDS.length} Empire playbooks for org: ${orgId}`);
    console.log('─'.repeat(60));

    // Get existing assignments for this org
    const existingSnap = await db
        .collection('playbook_assignments')
        .where('orgId', '==', orgId)
        .get();

    const existingMap = new Map();
    for (const doc of existingSnap.docs) {
        existingMap.set(doc.data().playbookId, doc);
    }

    console.log(`   Found ${existingMap.size} existing assignments`);

    // Batch write all assignments
    const BATCH_SIZE = 400;
    let batch = db.batch();
    let batchCount = 0;
    let created = 0;
    let reactivated = 0;
    let skipped = 0;

    for (const playbookId of EMPIRE_PLAYBOOK_IDS) {
        const existing = existingMap.get(playbookId);

        if (existing) {
            const currentStatus = existing.data().status;
            if (currentStatus === 'active') {
                skipped++;
                continue;
            }
            // Reactivate paused/completed assignments
            batch.update(existing.ref, {
                status: 'active',
                updatedAt: now,
            });
            reactivated++;
        } else {
            // Create new assignment
            const ref = db.collection('playbook_assignments').doc();
            batch.set(ref, {
                subscriptionId: orgId,  // Org-level subscription reference
                orgId,
                playbookId,
                status: 'active',
                lastTriggered: null,
                triggerCount: 0,
                createdAt: now,
                updatedAt: now,
            });
            created++;
        }

        batchCount++;
        if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
            console.log(`   Batch committed (${created + reactivated} so far)...`);
        }
    }

    // Commit remaining
    if (batchCount > 0) {
        await batch.commit();
    }

    console.log('─'.repeat(60));
    console.log(`✅ Complete!`);
    console.log(`   Created:      ${created} new assignments`);
    console.log(`   Reactivated:  ${reactivated} paused assignments`);
    console.log(`   Skipped:      ${skipped} already-active`);
    console.log(`   Total active: ${created + reactivated + skipped} / ${EMPIRE_PLAYBOOK_IDS.length}`);
    console.log(`\n🎉 ${orgId} is now running all ${EMPIRE_PLAYBOOK_IDS.length} Empire playbooks!`);
    console.log(`   View at: https://bakedbot.ai/dashboard/playbooks\n`);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

const orgId = process.argv[2];
if (!orgId) {
    console.error('\n❌ Usage: node scripts/activate-empire-playbooks.mjs <orgId>');
    console.error('   Example: node scripts/activate-empire-playbooks.mjs org_thrive_syracuse\n');
    process.exit(1);
}

activateEmpirePlaybooks(orgId).catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
});
