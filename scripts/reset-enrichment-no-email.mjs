#!/usr/bin/env node
/**
 * Reset enrichment flag on leads that were processed but got no email.
 *
 * These leads were marked enriched=true but email=null, typically because
 * Jina Reader was called without the API key (rate-limited → empty content → Apollo skipped).
 * After fixing lead-enrichment.ts to pass the JINA_API_KEY, reset them so they
 * get a second pass on the next enrichment run.
 *
 * Usage:
 *   node scripts/reset-enrichment-no-email.mjs           # dry run (shows count)
 *   node scripts/reset-enrichment-no-email.mjs --apply   # write to Firestore
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DRY_RUN = !process.argv.includes('--apply');

function initFirebase() {
    if (getApps().length > 0) return getFirestore();
    const keyPath = path.join(ROOT, 'service-account.json');
    if (fs.existsSync(keyPath)) {
        initializeApp({ credential: cert(keyPath) });
    } else {
        initializeApp(); // ADC
    }
    return getFirestore();
}

async function main() {
    const db = initFirebase();
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLY'}`);

    // Find leads that were enriched but got no email and no contactFormUrl
    // (outreachSent=false guards against resetting leads that already had emails sent)
    const snap = await db.collection('ny_dispensary_leads')
        .where('enriched', '==', true)
        .where('outreachSent', '==', false)
        .get();

    const toReset = snap.docs.filter(doc => {
        const d = doc.data();
        return !d.email && !d.contactFormUrl;
    });

    console.log(`Total enriched+no-outreach leads: ${snap.size}`);
    console.log(`Leads with no email AND no contactFormUrl: ${toReset.length}`);

    if (toReset.length === 0) {
        console.log('Nothing to reset.');
        return;
    }

    console.log('\nSample leads to reset:');
    toReset.slice(0, 5).forEach(doc => {
        const d = doc.data();
        console.log(`  ${doc.id}: ${d.dispensaryName} (${d.city}, ${d.state})`);
    });
    if (toReset.length > 5) console.log(`  ... and ${toReset.length - 5} more`);

    if (DRY_RUN) {
        console.log('\nDry run — pass --apply to reset enriched flag on these leads.');
        return;
    }

    // Batch reset in groups of 400 (Firestore batch limit)
    let reset = 0;
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of toReset) {
        batch.update(doc.ref, { enriched: false, updatedAt: Date.now() });
        batchCount++;
        reset++;

        if (batchCount >= 400) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
        }
    }

    if (batchCount > 0) await batch.commit();

    console.log(`\nReset ${reset} leads to enriched=false. Ready for re-enrichment.`);
}

main().catch(err => { console.error(err); process.exit(1); });
