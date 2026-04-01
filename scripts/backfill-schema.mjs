#!/usr/bin/env node
/**
 * Schema Backfill — patches docs flagged by audit-schema.mjs
 *
 * For each collection, finds docs missing required fields and writes
 * sensible defaults. Dry-run by default; pass --apply to commit.
 *
 * Usage:
 *   node scripts/backfill-schema.mjs                            # dry-run
 *   node scripts/backfill-schema.mjs --apply                    # write to Firestore
 *   node scripts/backfill-schema.mjs --apply --orgId=org_thrive_syracuse
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const DRY_RUN = !process.argv.includes('--apply');
const TARGET_ORG = process.argv.find(a => a.startsWith('--orgId='))?.split('=')[1];

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function loadServiceAccount() {
    const envPath = path.join(ROOT, '.env.local');
    const content = fs.readFileSync(envPath, 'utf-8');
    let key = null;
    for (const line of content.split('\n')) {
        if (line.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY=')) {
            key = line.slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim();
        }
    }
    if (!key) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
    return JSON.parse(Buffer.from(key, 'base64').toString('utf-8'));
}

// ---------------------------------------------------------------------------
// Backfill strategies — one function per collection
// ---------------------------------------------------------------------------

async function backfillCustomers(db, orgId) {
    const patches = [];

    // Query for docs missing each required field (Firestore can't query for absence,
    // so we fetch a sample and filter client-side)
    const snap = await db.collection('customers')
        .where('orgId', '==', orgId ?? 'org_thrive_syracuse')
        .limit(200)
        .get();

    for (const doc of snap.docs) {
        const data = doc.data();
        const update = {};
        if (!('email' in data) || data.email == null)   update.email  = '';
        if (!('tier'  in data) || data.tier  == null)   update.tier   = 'bronze';
        if (!('points' in data) || data.points == null) update.points = 0;
        if (Object.keys(update).length > 0) {
            patches.push({ ref: doc.ref, id: doc.id, update });
        }
    }
    return patches;
}

async function backfillOrganizations(db) {
    const patches = [];
    const snap = await db.collection('organizations').limit(200).get();

    for (const doc of snap.docs) {
        const data = doc.data();
        const update = {};

        if (!('name' in data) || data.name == null) {
            // Derive from doc ID — e.g. "org_thrive_syracuse" → "Thrive Syracuse"
            // Fall back to 'Unknown Organization' for non-standard IDs (e.g. Firebase UIDs)
            const isSlug = /^org_/.test(doc.id) || /^[a-z0-9_-]+$/.test(doc.id);
            const derived = isSlug
                ? doc.id.replace(/^org_/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                : 'Unknown Organization';
            update.name = derived;
        }

        if (!('type' in data) || data.type == null) {
            // Default: infer from name/id, fall back to 'dispensary'
            const id = doc.id.toLowerCase();
            if (id.includes('brand') || id.includes('vendor'))  update.type = 'brand';
            else if (id.includes('grower'))                      update.type = 'grower';
            else                                                 update.type = 'dispensary';
        }

        if (Object.keys(update).length > 0) {
            patches.push({ ref: doc.ref, id: doc.id, update });
        }
    }
    return patches;
}

async function backfillUsers(db, _orgId) {
    const patches = [];
    // Don't filter by orgId — users missing email/createdAt may also lack orgId
    const snap = await db.collection('users').limit(200).get();

    for (const doc of snap.docs) {
        const data = doc.data();
        const update = {};
        if (!('email' in data) || data.email == null)         update.email     = '';
        if (!('createdAt' in data) || data.createdAt == null) update.createdAt = FieldValue.serverTimestamp();
        if (Object.keys(update).length > 0) {
            patches.push({ ref: doc.ref, id: doc.id, update });
        }
    }
    return patches;
}

async function backfillPlaybookExecutions(db, orgId) {
    const patches = [];
    let query = db.collection('playbook_executions').limit(200);
    if (orgId) query = query.where('orgId', '==', orgId);
    const snap = await query.get();

    for (const doc of snap.docs) {
        const data = doc.data();
        const update = {};
        // playbookId is required — use 'unknown' sentinel so audit passes; mark for review
        if (!('playbookId' in data) || data.playbookId == null) {
            update.playbookId = data.playbookName ?? data.type ?? 'unknown';
        }
        if (!('startedAt' in data) || data.startedAt == null) {
            update.startedAt = data.createdAt ?? FieldValue.serverTimestamp();
        }
        if (Object.keys(update).length > 0) {
            patches.push({ ref: doc.ref, id: doc.id, update });
        }
    }
    return patches;
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

async function applyPatches(label, patches, dry) {
    if (patches.length === 0) {
        console.log(`  ✅ ${label}: no patches needed`);
        return;
    }

    console.log(`  ${dry ? '🔍 (dry-run)' : '✏️  patching'} ${label}: ${patches.length} doc(s)`);
    for (const { id, update } of patches) {
        console.log(`    [${id}] ←`, JSON.stringify(update));
    }

    if (!dry) {
        const db = patches[0].ref.firestore;
        const batch = db.batch();
        for (const { ref, update } of patches) {
            batch.update(ref, update);
        }
        await batch.commit();
        console.log(`    ✅ committed`);
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    console.log(`\n🔧 Schema Backfill ${DRY_RUN ? '(DRY RUN — pass --apply to write)' : '(LIVE WRITE)'}\n`);

    const sa = loadServiceAccount();
    initializeApp({ credential: cert(sa), projectId: 'studio-567050101-bc6e8' });
    const db = getFirestore();

    const orgId = TARGET_ORG ?? 'org_thrive_syracuse';

    const [customers, orgs, users, executions] = await Promise.all([
        backfillCustomers(db, orgId),
        backfillOrganizations(db),
        backfillUsers(db, orgId),
        backfillPlaybookExecutions(db, orgId),
    ]);

    await applyPatches('customers', customers, DRY_RUN);
    await applyPatches('organizations', orgs, DRY_RUN);
    await applyPatches('users', users, DRY_RUN);
    await applyPatches('playbook_executions', executions, DRY_RUN);

    const total = customers.length + orgs.length + users.length + executions.length;
    console.log(`\n📊 Total patches: ${total} | ${DRY_RUN ? 'Re-run with --apply to commit' : 'All committed ✅'}\n`);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
