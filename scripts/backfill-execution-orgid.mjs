#!/usr/bin/env node
/**
 * Backfill: Set orgId on playbook_executions docs that are missing it.
 *
 * Resolution order per doc:
 *   1. playbookId → playbooks/{playbookId}.orgId
 *   2. subscriptionId → playbook_assignments where subscriptionId matches → orgId
 *   3. Skip (log warning) — no source found
 *
 * Usage:
 *   node scripts/backfill-execution-orgid.mjs          # dry run
 *   node scripts/backfill-execution-orgid.mjs --apply  # write to Firestore
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DRY_RUN = !process.argv.includes('--apply');

// ---------------------------------------------------------------------------
// Firebase init (same pattern as other scripts)
// ---------------------------------------------------------------------------

function initFirebase() {
    if (getApps().length > 0) return getFirestore();

    const envPath = path.join(ROOT, '.env.local');
    if (!fs.existsSync(envPath)) throw new Error('.env.local not found');

    const env = fs.readFileSync(envPath, 'utf8');
    let rawKey = null;
    for (const line of env.split('\n')) {
        if (line.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY=')) {
            rawKey = line.slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim();
            break;
        }
    }
    if (!rawKey) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not in .env.local');

    const serviceAccount = JSON.parse(Buffer.from(rawKey, 'base64').toString('utf-8'));
    initializeApp({ credential: cert(serviceAccount) });
    return getFirestore();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    console.log(`\n🔧 Backfill: playbook_executions.orgId`);
    console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (pass --apply to write)' : '⚡ LIVE — writing to Firestore'}\n`);

    const db = initFirebase();

    // 1. Fetch all execution docs missing orgId
    const snap = await db.collection('playbook_executions').get();
    const missing = snap.docs.filter(d => !d.data().orgId);

    console.log(`   Found ${snap.size} total docs, ${missing.length} missing orgId\n`);

    if (missing.length === 0) {
        console.log('✅ Nothing to fix.');
        return;
    }

    // 2. Build a cache: playbookId → orgId from the playbooks collection
    const playbookOrgCache = new Map();
    const playbookIds = [...new Set(missing.map(d => d.data().playbookId).filter(Boolean))];

    for (const pid of playbookIds) {
        const pdoc = await db.collection('playbooks').doc(pid).get();
        if (pdoc.exists && pdoc.data()?.orgId) {
            playbookOrgCache.set(pid, pdoc.data().orgId);
        }
    }

    // 3. Build a cache: subscriptionId → orgId from playbook_assignments
    const subscriptionIds = [...new Set(missing.map(d => d.data().subscriptionId).filter(Boolean))];
    const assignmentOrgCache = new Map();

    for (const sid of subscriptionIds) {
        if (assignmentOrgCache.has(sid)) continue;
        const asnap = await db.collection('playbook_assignments')
            .where('subscriptionId', '==', sid)
            .limit(1)
            .get();
        if (!asnap.empty && asnap.docs[0].data().orgId) {
            assignmentOrgCache.set(sid, asnap.docs[0].data().orgId);
        }
    }

    // 4. Resolve + apply
    let fixed = 0, skipped = 0;
    const batch = db.batch();

    for (const doc of missing) {
        const data = doc.data();
        // ops_* playbooks are internal system playbooks with no tenant orgId
        const isOpsPlaybook = typeof data.playbookId === 'string' && data.playbookId.startsWith('ops_');
        const orgId =
            playbookOrgCache.get(data.playbookId) ||
            assignmentOrgCache.get(data.subscriptionId) ||
            (isOpsPlaybook ? 'bakedbot-internal' : null);

        if (!orgId) {
            console.log(`   ⚠️  SKIP ${doc.id} — could not resolve orgId (playbookId=${data.playbookId})`);
            skipped++;
            continue;
        }

        console.log(`   ${DRY_RUN ? '[DRY]' : '✏️ '} ${doc.id} → orgId=${orgId}`);
        if (!DRY_RUN) {
            batch.update(doc.ref, { orgId });
        }
        fixed++;
    }

    if (!DRY_RUN && fixed > 0) {
        await batch.commit();
        console.log(`\n✅ Committed batch: ${fixed} docs updated, ${skipped} skipped.`);
    } else {
        console.log(`\n${DRY_RUN ? '🔍 Dry run complete' : '✅ Done'}: ${fixed} would be fixed, ${skipped} skipped.`);
    }
}

main().catch(err => {
    console.error('❌ Backfill failed:', err.message);
    process.exit(1);
});
