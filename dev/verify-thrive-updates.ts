/**
 * Verify Thrive Setup and Product Sync
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const ORG_ID = 'org_thrive_syracuse';

// Initialize Firebase
const apps = getApps();
let app;

if (apps.length === 0) {
    const serviceAccount = JSON.parse(
        fs.readFileSync('./service-account.json', 'utf8')
    );
    app = initializeApp({
        credential: cert(serviceAccount),
    });
} else {
    app = apps[0];
}

const db = getFirestore(app);

async function main() {
    console.log('🔍 Verifying Thrive Setup');
    console.log('========================\n');

    // 1. Verify Organization marketState
    const orgDoc = await db.collection('organizations').doc(ORG_ID).get();
    const orgData = orgDoc.data();
    console.log(`✅ Organization ${ORG_ID} marketState: ${orgData?.marketState}`);
    if (orgData?.marketState !== 'NY') {
        console.error('❌ marketState is NOT NY');
    }

    // 2. Verify Products expirationDate
    console.log('\n📦 Checking products for expirationDate...');
    const productsSnap = await db
        .collection('tenants')
        .doc(ORG_ID)
        .collection('publicViews')
        .doc('products')
        .collection('items')
        .limit(20)
        .get();

    let countWithExpiration = 0;
    productsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.expirationDate) {
            countWithExpiration++;
            console.log(`  • [Synced] ${data.name} - Expiration: ${data.expirationDate.toDate().toISOString().split('T')[0]}`);
        }
    });

    console.log(`\n📊 Found expiration dates on ${countWithExpiration}/${productsSnap.size} sampled products.`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
