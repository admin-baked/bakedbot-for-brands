/**
 * Set Thrive Syracuse Market State
 * 
 * Updates the organizations/org_thrive_syracuse.marketState field to 'NY'
 * 
 * Usage:
 *   npx tsx dev/set-thrive-market-state.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const ORG_ID = 'org_thrive_syracuse';
const MARKET_STATE = 'NY';

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
    console.log('🔧 Setting Thrive Syracuse Market State');
    console.log('=====================================\n');

    // Update organization marketState
    console.log(`📝 Updating organizations/${ORG_ID}.marketState to '${MARKET_STATE}'...`);

    await db.collection('organizations').doc(ORG_ID).update({
        marketState: MARKET_STATE,
        updatedAt: new Date().toISOString(),
    });

    console.log('✅ Organization marketState updated successfully');

    // Verify the update
    const orgDoc = await db.collection('organizations').doc(ORG_ID).get();
    const orgData = orgDoc.data();

    console.log('\n📊 Verification:');
    console.log('------------------');
    console.log(`Organization ID: ${ORG_ID}`);
    console.log(`Market State: ${orgData?.marketState}`);
    console.log(`Updated At: ${orgData?.updatedAt}`);

    console.log('\n✅ Done!');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
