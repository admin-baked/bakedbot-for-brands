import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

// Configuration from "Manual Brand Setup" guide
const BRAND_ID = 'thrive_syracuse';
const BRAND_NAME = 'Thrive Syracuse';

// Credentials from guide (fallen back if env vars missing)
const USERNAME = process.env.ALLEAVES_USERNAME || '';
const PASSWORD = process.env.ALLEAVES_PASSWORD || '';
const PIN = '1234';

const POS_CONFIG = {
    provider: 'alleaves',
    storeId: '1000',
    locationId: '1000',
    username: USERNAME,
    password: PASSWORD,
    pin: PIN,
    environment: 'production'
};

const serviceAccountPath = './firebase-service-account.json';

if (!fs.existsSync(serviceAccountPath)) {
    console.error(`❌ Error: ${serviceAccountPath} not found.`);
    console.error('Please ensure the service account file is in the root directory.');
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const apps = getApps();
const app = apps.length === 0 ? initializeApp({ credential: cert(serviceAccount) }) : apps[0];
const db = getFirestore(app);

async function setupLoyaltyBrand() {
    if (!USERNAME || !PASSWORD) {
        console.error('❌ Missing credentials. Set ALLEAVES_USERNAME and ALLEAVES_PASSWORD env vars.');
        process.exit(1);
    }
    console.log(`🚀 Setting up Brand Document: ${BRAND_ID}...`);
    console.log(`   POS Provider: ${POS_CONFIG.provider}`);
    console.log(`   Username: ${POS_CONFIG.username}`);

    const docRef = db.collection('brands').doc(BRAND_ID);
    const doc = await docRef.get();

    const data = {
        id: BRAND_ID,
        name: BRAND_NAME,
        posConfig: POS_CONFIG,
        updatedAt: new Date() // Firestore Timestamp
    };

    if (!doc.exists) {
        console.log('   Document does not exist. Creating new...');
        await docRef.set({
            ...data,
            createdAt: new Date()
        });
        console.log('✅ Brand document created successfully.');
    } else {
        console.log('   Document exists. Updating...');
        await docRef.update(data);
        console.log('✅ Brand document updated successfully.');
    }
}

setupLoyaltyBrand()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Failed:', err);
        process.exit(1);
    });
