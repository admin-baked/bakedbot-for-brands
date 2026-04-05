#!/usr/bin/env node
/**
 * Seed sample purchase history + customer profile for the Thrive tablet test customer.
 *
 * Customer: org_thrive_syracuse_phone_13126840522 (312-684-0522)
 *
 * Usage:
 *   node scripts/seed-thrive-test-customer.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ENV = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');

function getEnv(key) {
    const line = ENV.split('\n').find(l => l.startsWith(key + '='));
    if (!line) throw new Error(`Missing env var: ${key}`);
    return line.slice(key.length + 1).replace(/^['"]|['"]$/g, '').trim();
}

const serviceAccount = JSON.parse(
    Buffer.from(getEnv('FIREBASE_SERVICE_ACCOUNT_KEY'), 'base64').toString('utf8')
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const ORG_ID = 'org_thrive_syracuse';
const CUSTOMER_ID = 'org_thrive_syracuse_phone_13126840522';
const PHONE_DIGITS = '13126840522';
const PHONE_LAST4 = '0522';

function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return Timestamp.fromDate(d);
}

const SAMPLE_ORDERS = [
    {
        id: `${CUSTOMER_ID}_order_1`,
        orgId: ORG_ID,
        customerId: CUSTOMER_ID,
        phoneDigits: PHONE_DIGITS,
        phoneLast4: PHONE_LAST4,
        items: [
            { name: 'Blue Dream Pre-Roll', category: 'Pre-Rolls', price: 12.00, qty: 2 },
            { name: 'Durban Poison 3.5g', category: 'Flower', price: 45.00, qty: 1 },
        ],
        total: 69.00,
        status: 'completed',
        createdAt: daysAgo(45),
    },
    {
        id: `${CUSTOMER_ID}_order_2`,
        orgId: ORG_ID,
        customerId: CUSTOMER_ID,
        phoneDigits: PHONE_DIGITS,
        phoneLast4: PHONE_LAST4,
        items: [
            { name: 'Watermelon Gummies 100mg', category: 'Edibles', price: 22.00, qty: 1 },
            { name: 'Pineapple Express Vape Cart', category: 'Vapes', price: 38.00, qty: 1 },
        ],
        total: 60.00,
        status: 'completed',
        createdAt: daysAgo(30),
    },
    {
        id: `${CUSTOMER_ID}_order_3`,
        orgId: ORG_ID,
        customerId: CUSTOMER_ID,
        phoneDigits: PHONE_DIGITS,
        phoneLast4: PHONE_LAST4,
        items: [
            { name: 'GG4 Flower 7g', category: 'Flower', price: 75.00, qty: 1 },
            { name: 'OG Kush Pre-Roll 5-Pack', category: 'Pre-Rolls', price: 28.00, qty: 1 },
            { name: 'Sleep Tincture 1000mg', category: 'Tinctures', price: 55.00, qty: 1 },
        ],
        total: 158.00,
        status: 'completed',
        createdAt: daysAgo(14),
    },
    {
        id: `${CUSTOMER_ID}_order_4`,
        orgId: ORG_ID,
        customerId: CUSTOMER_ID,
        phoneDigits: PHONE_DIGITS,
        phoneLast4: PHONE_LAST4,
        items: [
            { name: 'Sour Diesel Pre-Roll', category: 'Pre-Rolls', price: 12.00, qty: 3 },
            { name: 'Live Resin Concentrate 1g', category: 'Concentrates', price: 55.00, qty: 1 },
        ],
        total: 91.00,
        status: 'completed',
        createdAt: daysAgo(5),
    },
];

async function run() {
    // 1. Update/patch customer doc with phone fields
    console.log(`Patching customer doc: ${CUSTOMER_ID}`);
    await db.collection('customers').doc(CUSTOMER_ID).set({
        orgId: ORG_ID,
        firstName: 'Martez',
        lastName: 'Test',
        phone: `+${PHONE_DIGITS}`,
        phoneDigits: PHONE_DIGITS,
        phoneLast4: PHONE_LAST4,
        loyaltyPoints: 378,
        visitCount: 8,
        totalSpent: 378.00,
        segment: 'regular',
        topCategories: ['Pre-Rolls', 'Flower', 'Edibles'],
        badges: ['Loyal Customer', 'Flower Lover'],
        lastVisitAt: daysAgo(0),
        createdAt: daysAgo(90),
        updatedAt: daysAgo(0),
    }, { merge: true });
    console.log('  ✓ Customer doc patched');

    // 2. Seed orders
    const batch = db.batch();
    for (const order of SAMPLE_ORDERS) {
        const ref = db.collection('orders').doc(order.id);
        batch.set(ref, order, { merge: true });
        console.log(`  ✓ Order: ${order.id} (${order.total})`);
    }
    await batch.commit();
    console.log('  ✓ Orders committed');

    // 3. Seed a checkin_visits entry so visit count is real
    const visitRef = db.collection('checkin_visits').doc(`${CUSTOMER_ID}_visit_latest`);
    await visitRef.set({
        orgId: ORG_ID,
        customerId: CUSTOMER_ID,
        phoneDigits: PHONE_DIGITS,
        visitedAt: daysAgo(0),
        mood: 'relaxed',
        source: 'loyalty_tablet_checkin',
    }, { merge: true });
    console.log('  ✓ Visit record seeded');

    console.log('\nDone. Test customer 312-684-0522 is fully seeded.');
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
