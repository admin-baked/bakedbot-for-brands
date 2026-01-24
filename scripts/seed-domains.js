
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

console.log('Starting seed script...');

// Initialize Firebase Admin
let serviceAccount;
try {
    const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!rawKey) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is missing');
    }

    // Check if base64
    if (rawKey.trim().startsWith('ewog')) {
        console.log('Detected base64 encoded service account key. Decoding...');
        const decoded = Buffer.from(rawKey, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
    } else {
        serviceAccount = JSON.parse(rawKey);
    }
} catch (error) {
    console.error('Failed to parse service account key:', error.message);
    process.exit(1);
}

if (!getApps().length) {
    try {
        initializeApp({
            credential: cert(serviceAccount),
        });
        console.log('Firebase initialized.');
    } catch (e) {
        console.error('Firebase init failed:', e);
        process.exit(1);
    }
}

const db = getFirestore();

async function seed() {
    const timestamp = new Date().toISOString();

    // 1. Domain Mapping
    console.log('Writing domain_mappings...');
    await db.collection('domain_mappings').doc('ecstaticedibles.com').set({
        domain: 'ecstaticedibles.com',
        tenantId: 'ecstaticedibles',
        connectionType: 'a_record',
        verifiedAt: timestamp, // Using string timestamp as per robust practice, or Firestore Timestamp? User asked for [current timestamp]. String ISO is safest for JSON compat usually, but Firestore Timestamp is native. I'll stick to ISO string or serverTimestamp if I had the import. I'll use ISO string to match previous pattern.
        createdAt: timestamp,
        updatedAt: timestamp
    });
    console.log('✅ domain_mappings/ecstaticedibles.com created.');

    // 2. Tenant
    console.log('Writing tenants...');
    await db.collection('tenants').doc('ecstaticedibles').set({
        id: 'ecstaticedibles',
        type: 'brand',
        name: 'Ecstatic Edibles',
        customDomain: {
            domain: 'ecstaticedibles.com',
            verificationStatus: 'verified',
            connectionType: 'a_record'
        },
        updatedAt: timestamp
    }, { merge: true });
    console.log('✅ tenants/ecstaticedibles created/updated.');
}

seed().then(() => {
    console.log('Done.');
    process.exit(0);
}).catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
