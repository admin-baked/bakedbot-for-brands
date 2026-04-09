#!/usr/bin/env node

/**
 * migrate-ecstatic-welcome.mjs — Bring Ecstatic Edibles welcome email inline
 *
 * Assigns the standard `welcome-sequence` playbook to Ecstatic Edibles,
 * which routes through Mrs. Parker AI personalization → hello@bakedbot.ai.
 *
 * Usage:
 *   node scripts/migrate-ecstatic-welcome.mjs              # dry-run
 *   node scripts/migrate-ecstatic-welcome.mjs --apply      # write to Firestore
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// ── Env loading ──────────────────────────────────────────────────────────────
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach((line) => {
        if (line && !line.startsWith('#') && line.includes('=')) {
            const eqIdx = line.indexOf('=');
            const key = line.slice(0, eqIdx).trim();
            const value = line.slice(eqIdx + 1).trim();
            if (key && !process.env[key]) process.env[key] = value;
        }
    });
}

// ── Firebase init ────────────────────────────────────────────────────────────
const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.resolve('service-account.json');

if (!getApps().length) {
    initializeApp({
        credential: cert(JSON.parse(fs.readFileSync(saPath, 'utf-8'))),
        projectId: 'studio-567050101-bc6e8',
    });
}

const db = getFirestore();
const DRY_RUN = !process.argv.includes('--apply');
const ORG_ID = 'brand_ecstatic_edibles';

// ── Same playbook set as other grow-tier pilots ──────────────────────────────
const PLAYBOOKS = [
    'welcome-sequence',
    'menu-health-scan',
    'weekly-competitive-snapshot',
    'inventory-promo',
    'loyalty-engagement',
    'price-match-monitor',
];

async function main() {
    console.log(`\n🔧 Migrate Ecstatic Edibles to Mrs. Parker welcome system`);
    console.log(`   Org: ${ORG_ID}`);
    console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLY'}\n`);

    // Check current state
    const assignmentsRef = db
        .collection('organizations')
        .doc(ORG_ID)
        .collection('playbook_assignments');

    const existing = await assignmentsRef.get();
    const existingIds = existing.docs.map((d) => d.id);
    console.log(`   Existing assignments: ${existingIds.length ? existingIds.join(', ') : '(none)'}`);

    // Assign playbooks
    const batch = db.batch();
    let newCount = 0;

    for (const playbookId of PLAYBOOKS) {
        if (existingIds.includes(playbookId)) {
            console.log(`   ⏭  ${playbookId} — already assigned`);
            continue;
        }

        const ref = assignmentsRef.doc(playbookId);
        if (DRY_RUN) {
            console.log(`   [DRY RUN] Would assign: ${playbookId}`);
        } else {
            batch.set(ref, {
                orgId: ORG_ID,
                playbookId,
                status: 'paused',
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            console.log(`   ✅ Assigning: ${playbookId}`);
        }
        newCount++;
    }

    if (!DRY_RUN && newCount > 0) {
        await batch.commit();
    }

    console.log(`\n   ${newCount} playbook(s) ${DRY_RUN ? 'would be' : ''} assigned.`);

    // Verify org/brand doc exists (Ecstatic Edibles is a brand, not an org)
    const orgDoc = await db.collection('organizations').doc(ORG_ID).get();
    const brandDoc = await db.collection('brands').doc(ORG_ID).get();
    if (!orgDoc.exists && !brandDoc.exists) {
        console.log(`\n   ⚠️  No doc found for '${ORG_ID}' in organizations or brands.`);
        console.log(`      The playbook assignments were written, but the entity may need`);
        console.log(`      to be created first.`);
    } else {
        const doc = orgDoc.exists ? orgDoc : brandDoc;
        const collection = orgDoc.exists ? 'organizations' : 'brands';
        const data = doc.data();
        console.log(`\n   Found in '${collection}': ${data.name || data.slug || ORG_ID}`);
        console.log(`   Plan: ${data.planId || 'not set'}`);
    }

    console.log(`\n   Welcome emails will now route through:`);
    console.log(`   welcome-sequence → welcome_personalized template → Mrs. Parker AI`);
    console.log(`   From: hello@bakedbot.ai / Mrs. Parker\n`);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
