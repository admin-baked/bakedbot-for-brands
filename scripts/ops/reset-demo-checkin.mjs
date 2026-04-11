/**
 * Reset demo account (312-684-0522) for fresh check-in testing.
 * Clears: email_leads, customer_onboarding_runs, customer visitCount/lastCheckinAt
 *
 * Usage: node tmp/reset-demo-checkin.mjs [--new]
 *   --new  = reset fully so next check-in is treated as NEW customer
 *   (default) = only reset onboarding run so welcome email fires again
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
const envPath = resolve(process.cwd(), '.env.local');
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('='); if (eq === -1) continue;
  const k = t.slice(0, eq).trim(); let v = t.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function parseSA() {
  const r = process.env.FIREBASE_SERVICE_ACCOUNT_KEY; if (!r) return null;
  try { return JSON.parse(r); } catch { try { return JSON.parse(Buffer.from(r, 'base64').toString('utf-8')); } catch { return null; } }
}
const sa = parseSA(); if (sa?.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');

const DEMO_PHONE = '+13126840522';
const ORG_ID = 'org_thrive_syracuse';
const fullReset = process.argv.includes('--new');

const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app);

async function main() {
    console.log(`Resetting demo account ${DEMO_PHONE} for org ${ORG_ID}`);
    console.log(`Mode: ${fullReset ? 'FULL (new customer)' : 'SOFT (re-trigger emails only)'}`);

    // 1. Find customer doc
    const customerSnap = await db.collection('customers')
        .where('orgId', '==', ORG_ID)
        .where('normalizedPhone', '==', DEMO_PHONE)
        .limit(1)
        .get();

    if (customerSnap.empty) {
        console.log('No customer doc found for demo phone — will be created fresh on next check-in');
    } else {
        const customerId = customerSnap.docs[0].id;
        console.log(`Found customer: ${customerId}`);

        // 2. Delete onboarding runs for this customer
        const runsSnap = await db.collection('customer_onboarding_runs')
            .where('customerId', '==', customerId)
            .get();
        console.log(`Found ${runsSnap.size} onboarding run(s) to delete`);
        for (const doc of runsSnap.docs) {
            await doc.ref.delete();
            console.log(`  Deleted run ${doc.id}`);
        }

        // 3. Delete checkin_visits
        const visitsSnap = await db.collection('checkin_visits')
            .where('customerId', '==', customerId)
            .limit(50)
            .get();
        console.log(`Found ${visitsSnap.size} visit(s) to delete`);
        for (const doc of visitsSnap.docs) {
            await doc.ref.delete();
        }

        if (fullReset) {
            // 4. Reset customer doc fields
            await customerSnap.docs[0].ref.update({
                visitCount: 0,
                totalVisits: 0,
                lastCheckinAt: FieldValue.delete(),
                lastVisitAt: FieldValue.delete(),
                loyaltyPoints: 0,
            });
            console.log('Reset customer visit/loyalty fields');

            // 5. Delete email_leads for this phone
            const leadsSnap = await db.collection('email_leads')
                .where('orgId', '==', ORG_ID)
                .where('normalizedPhone', '==', DEMO_PHONE)
                .get();
            console.log(`Found ${leadsSnap.size} lead(s) to delete`);
            for (const doc of leadsSnap.docs) {
                await doc.ref.delete();
                console.log(`  Deleted lead ${doc.id}`);
            }
        }
    }

    console.log('\nDone! Next check-in will trigger:');
    if (fullReset) {
        console.log('  → customer.signup playbook event');
        console.log('  → Welcome email (sendWelcomeEmail)');
    } else {
        console.log('  → customer.checkin playbook event');
        console.log('  → Returning welcome email (queueReturningWelcomeEmail, 2hr delay)');
    }
}

main().catch(console.error);
