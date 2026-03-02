#!/usr/bin/env node
/**
 * provision-ny-outreach.mjs
 *
 * Provisions and verifies the NY dispensary outreach lead magnet infrastructure.
 * Windows-compatible — run with: node scripts/provision-ny-outreach.mjs
 * Or: npm run provision:ny-outreach
 *
 * What it does:
 *   1. Verifies Firebase connectivity
 *   2. Reports current lead counts per NY source
 *   3. Checks founding partner spot availability
 *   4. Prints deployment checklist (Firestore indexes, Cloud Scheduler)
 *
 * Prerequisites:
 *   - .env.local with FIREBASE_SERVICE_ACCOUNT_KEY (base64-encoded)
 *   - Project: studio-567050101-bc6e8
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ─── Load .env.local ────────────────────────────────────────────────────────
function loadEnv() {
    const envPath = join(__dirname, '..', '.env.local');
    let raw;
    try {
        raw = readFileSync(envPath, 'utf-8');
    } catch {
        console.error('❌  .env.local not found. Run from project root.');
        process.exit(1);
    }

    const env = {};
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        env[key] = val;
    }
    return env;
}

// ─── Init Firebase Admin ─────────────────────────────────────────────────────
function initFirebase(env) {
    const admin = require('firebase-admin');

    if (admin.apps.length > 0) return admin.firestore();

    const keyB64 = env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!keyB64) {
        console.error('❌  FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
        process.exit(1);
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf-8'));
    } catch {
        console.error('❌  Failed to decode FIREBASE_SERVICE_ACCOUNT_KEY (expected base64 JSON)');
        process.exit(1);
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'studio-567050101-bc6e8',
    });

    return admin.firestore();
}

// ─── NY Sources ───────────────────────────────────────────────────────────────
const NY_SOURCES = [
    { key: 'ny-competitive-report', label: 'Competitive Landscape Report', url: '/ny/competitive-report' },
    { key: 'ny-founding-partner',   label: 'Founding Partner Program',    url: '/ny/founding-partner' },
    { key: 'ny-caurd-grant',        label: 'CAURD Tech Grant Playbook',   url: '/ny/caurd-grant' },
    { key: 'ny-roi-calculator',     label: 'ROI Calculator',              url: '/ny/roi-calculator' },
    { key: 'ny-price-war',          label: 'Syracuse Price War Report',   url: '/ny/price-war' },
];

const FOUNDING_PARTNER_MAX = 10;

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🗽  BakedBot NY Outreach — Provisioning Script');
    console.log('═'.repeat(55));

    const env = loadEnv();
    const db = initFirebase(env);

    console.log('\n✅  Firebase connected  (studio-567050101-bc6e8)\n');

    // ── 1. Lead counts per source ────────────────────────────────────────────
    console.log('📊  Lead Counts by Source');
    console.log('─'.repeat(45));

    let grandTotal = 0;
    const counts = {};

    for (const source of NY_SOURCES) {
        try {
            const snap = await db.collection('email_leads')
                .where('source', '==', source.key)
                .count()
                .get();
            const n = snap.data().count;
            counts[source.key] = n;
            grandTotal += n;
            const bar = '█'.repeat(Math.min(n, 20));
            console.log(`  ${source.label.padEnd(35)} ${String(n).padStart(4)}  ${bar}`);
        } catch (err) {
            console.log(`  ${source.label.padEnd(35)}  ERR: ${err.message}`);
            counts[source.key] = 0;
        }
    }

    console.log('─'.repeat(45));
    console.log(`  ${'TOTAL'.padEnd(35)} ${String(grandTotal).padStart(4)}`);

    // ── 2. Founding partner spots ────────────────────────────────────────────
    const fpCount = counts['ny-founding-partner'] ?? 0;
    const spotsLeft = Math.max(0, FOUNDING_PARTNER_MAX - fpCount);
    console.log(`\n🤝  Founding Partner Spots: ${fpCount}/${FOUNDING_PARTNER_MAX} claimed — ${spotsLeft} remaining`);

    if (spotsLeft === 0) {
        console.log('    ⚠️  All spots claimed. Update FOUNDING_PARTNER_MAX in ny-lead-capture.ts if expanding.');
    }

    // ── 3. Consent breakdown ────────────────────────────────────────────────
    if (grandTotal > 0) {
        console.log('\n📬  Consent Breakdown (all NY leads)');
        console.log('─'.repeat(45));
        try {
            const emailOptIn = await db.collection('email_leads')
                .where('state', '==', 'NY')
                .where('emailConsent', '==', true)
                .count()
                .get();
            const smsOptIn = await db.collection('email_leads')
                .where('state', '==', 'NY')
                .where('smsConsent', '==', true)
                .count()
                .get();
            console.log(`  Email opt-in:  ${emailOptIn.data().count}`);
            console.log(`  SMS opt-in:    ${smsOptIn.data().count}`);
        } catch {
            console.log('  (consent queries require indexes — deploy indexes first)');
        }
    }

    // ── 4. Deployment checklist ──────────────────────────────────────────────
    console.log('\n📋  Deployment Checklist');
    console.log('═'.repeat(55));

    console.log('\n  Step 1 — Deploy Firestore indexes (already added to firestore.indexes.json):');
    console.log('    firebase deploy --only firestore:indexes');
    console.log('    (3 new email_leads indexes: source, state, emailConsent)');

    console.log('\n  Step 2 — Verify NY pages are live:');
    for (const s of NY_SOURCES) {
        console.log(`    https://bakedbot.ai${s.url}`);
    }

    console.log('\n  Step 3 — (Optional) Cloud Scheduler follow-up sequences:');
    console.log('    If you want automated follow-up emails after lead capture,');
    console.log('    create a cron job that calls POST /api/cron/ny-lead-followup');
    console.log('    Schedule: 0 14 * * *  (9 AM EST daily)');
    console.log('    Auth:     Bearer $CRON_SECRET');
    console.log('    Command:');
    console.log('      gcloud scheduler jobs create http ny-lead-followup \\');
    console.log('        --schedule="0 14 * * *" \\');
    console.log('        --uri="https://bakedbot.ai/api/cron/ny-lead-followup" \\');
    console.log('        --message-body="{}" \\');
    console.log('        --headers="Authorization=Bearer YOUR_CRON_SECRET" \\');
    console.log('        --time-zone="America/New_York" \\');
    console.log('        --location=us-central1 \\');
    console.log('        --attempt-deadline=300s');

    console.log('\n  Step 4 — Monitor leads in Firestore Console:');
    console.log('    https://console.firebase.google.com/project/studio-567050101-bc6e8/firestore/data/email_leads');

    console.log('\n✅  Provisioning check complete.\n');
}

main().catch(err => {
    console.error('\n❌  Fatal error:', err.message);
    process.exit(1);
});
