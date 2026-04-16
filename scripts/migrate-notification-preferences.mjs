/**
 * Migration: Notification Preferences
 *
 * Run once to backfill notificationPreferences on all tenant docs.
 * Safe to re-run — only writes to docs that don't already have the field.
 *
 * Usage:
 *   node scripts/migrate-notification-preferences.mjs
 *   node scripts/migrate-notification-preferences.mjs --dry-run
 *   node scripts/migrate-notification-preferences.mjs --org=org_thrive_syracuse
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Init Firebase
// ---------------------------------------------------------------------------

const serviceAccountPath = resolve(__dirname, '../service-account.json');
let serviceAccount;
try {
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch {
    console.error('❌  service-account.json not found at', serviceAccountPath);
    process.exit(1);
}

if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

// ---------------------------------------------------------------------------
// Default preferences
// ---------------------------------------------------------------------------

const DEFAULT_PREFS = {
    slack: {
        enabled: true,
        defaultChannel: '#general',
        digestMode: true,
        digestTime: '09:00',
        digestTimezone: 'America/New_York',
        notifications: {
            thrive_daily_briefing:    { enabled: true },
            thrive_sales_summary:     { enabled: true },
            thrive_competitive_intel: { enabled: true },
            revenue_pace_alert:       { enabled: true },
        },
    },
};

// Thrive gets a pre-configured default channel
const THRIVE_PREFS = {
    slack: {
        ...DEFAULT_PREFS.slack,
        defaultChannel: '#thrive-syracuse-pilot',
    },
};

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetOrg = args.find(a => a.startsWith('--org='))?.split('=')[1];

console.log(`\n🔧  Notification Preferences Migration`);
console.log(`   Dry run: ${dryRun}`);
console.log(`   Target org: ${targetOrg ?? 'all'}\n`);

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function migrate() {
    let query = db.collection('tenants');
    if (targetOrg) {
        // Single org mode
        const snap = await db.doc(`tenants/${targetOrg}`).get();
        if (!snap.exists) {
            console.error(`❌  tenants/${targetOrg} not found`);
            process.exit(1);
        }
        await processDoc(snap);
        return;
    }

    const snap = await query.get();
    console.log(`Found ${snap.size} tenant docs\n`);

    let updated = 0;
    let skipped = 0;

    for (const doc of snap.docs) {
        const result = await processDoc(doc);
        if (result === 'updated') updated++;
        else skipped++;
    }

    console.log(`\n✅  Done.  Updated: ${updated}  Skipped (already set): ${skipped}`);
}

async function processDoc(doc) {
    const data = doc.data();
    const orgId = doc.id;

    if (data.notificationPreferences) {
        console.log(`  ⏭️  ${orgId} — already has preferences, skipping`);
        return 'skipped';
    }

    const prefs = orgId === 'org_thrive_syracuse' ? THRIVE_PREFS : DEFAULT_PREFS;

    console.log(`  ${dryRun ? '🔍 (dry run)' : '✍️ '} ${orgId} — writing defaults (digestMode=true, channel=${prefs.slack.defaultChannel})`);

    if (!dryRun) {
        await doc.ref.set({ notificationPreferences: prefs }, { merge: true });
    }

    return 'updated';
}

migrate().catch(err => {
    console.error('❌  Migration failed:', err);
    process.exit(1);
});
