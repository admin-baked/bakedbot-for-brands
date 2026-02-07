/**
 * Inspect Alleaves API response for expiration dates
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ALLeavesClient, type ALLeavesConfig } from '../src/lib/pos/adapters/alleaves';
import * as fs from 'fs';

const LOCATION_ID = 'loc_thrive_syracuse';

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
    console.log('🔌 Connecting to Alleaves API...');

    const locationDoc = await db.collection('locations').doc(LOCATION_ID).get();
    const posConfig = locationDoc.data()?.posConfig;

    const alleavesConfig: ALLeavesConfig = {
        apiKey: posConfig.apiKey || '',
        provider: 'alleaves',
        storeId: posConfig.storeId,
        username: posConfig.username || process.env.ALLEAVES_USERNAME!,
        password: posConfig.password || process.env.ALLEAVES_PASSWORD!,
        pin: posConfig.pin || process.env.ALLEAVES_PIN!,
        locationId: posConfig.locationId || posConfig.storeId,
        partnerId: posConfig.partnerId,
        environment: posConfig.environment || 'production',
    };

    const client = new ALLeavesClient(alleavesConfig);
    const products = await client.fetchMenu();

    console.log(`Fetched ${products.length} products.`);

    const withExp = products.filter(p => p.expirationDate);
    console.log(`Products with expirationDate: ${withExp.length}`);

    if (products.length > 0) {
        console.log('\nSample Raw Item (first item):');
        console.log(JSON.stringify(products[0].rawData, null, 2));
    }
}

main()
    .then(() => process.exit(0))
    .catch(console.error);
