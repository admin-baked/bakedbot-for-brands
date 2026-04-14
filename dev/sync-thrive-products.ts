/**
 * Sync Thrive Syracuse Products
 * 
 * Triggers a product sync to populate expirationDate fields for clearance bundle feature
 * 
 * Usage:
 *   npx tsx dev/sync-thrive-products.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ALLeavesClient, type ALLeavesConfig } from '../src/lib/pos/adapters/alleaves';
import * as fs from 'fs';

const ORG_ID = 'org_thrive_syracuse';
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
    console.log('🔄 Syncing Thrive Syracuse Products');
    console.log('====================================\n');

    // Get location with POS config
    console.log('📍 Fetching location configuration...');
    const locationDoc = await db.collection('locations').doc(LOCATION_ID).get();

    if (!locationDoc.exists) {
        throw new Error(`Location ${LOCATION_ID} not found`);
    }

    const locationData = locationDoc.data();
    const posConfig = locationData?.posConfig;

    if (!posConfig || posConfig.provider !== 'alleaves') {
        throw new Error('No Alleaves POS configuration found');
    }

    console.log(`✅ Found Alleaves configuration for location ${LOCATION_ID}`);

    // Initialize Alleaves client
    console.log('\n🔌 Connecting to Alleaves API...');

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

    // Validate connection
    const isValid = await client.validateConnection();
    if (!isValid) {
        throw new Error('Failed to validate Alleaves connection');
    }

    console.log('✅ Connected to Alleaves API');

    // Fetch products (this will include expirationDate field)
    console.log('\n📦 Fetching products from Alleaves...');
    const products = await client.fetchMenu();

    console.log(`✅ Fetched ${products.length} products`);

    // Count products with expiration dates
    const productsWithExpiration = products.filter(p => p.expirationDate);
    console.log(`📅 ${productsWithExpiration.length} products have expiration dates`);

    // Update products in Firestore
    console.log('\n💾 Updating products in Firestore...');

    let batch = db.batch();
    let updateCount = 0;

    for (const product of products) {
        const productRef = db
            .collection('tenants')
            .doc(ORG_ID)
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .doc(`${product.externalId}`);

        const updateData: any = {
            name: product.name,
            brand: product.brand,
            category: product.category,
            price: product.price,
            cost: product.cost || null,             // Cost of Good (unit-level COGS from Alleaves)
            batchCost: product.batchCost || null,   // Batch-level COGS from Alleaves
            stockCount: product.stock || 0,         // Normalize stock → stockCount
            stock: product.stock,
            thcPercent: product.thcPercent || null,
            cbdPercent: product.cbdPercent || null,
            imageUrl: product.imageUrl || null,
            expirationDate: product.expirationDate || null, // Batch expiration for clearance
            updatedAt: new Date(),
        };

        batch.set(productRef, updateData, { merge: true });
        updateCount++;

        if (updateCount % 500 === 0) {
            await batch.commit();
            batch = db.batch(); // Create a new batch after committing
            console.log(`  ✅ Updated ${updateCount}/${products.length} products...`);
        }
    }

    // Commit remaining updates
    if (updateCount % 500 !== 0) {
        await batch.commit();
    }

    console.log(`✅ Updated ${updateCount} products in Firestore`);

    // Show sample products with expiration dates
    if (productsWithExpiration.length > 0) {
        console.log('\n📋 Sample products with expiration dates:');
        console.log('------------------------------------------');
        productsWithExpiration.slice(0, 5).forEach(p => {
            const daysUntilExpiration = p.expirationDate
                ? Math.ceil((p.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
            console.log(`  • ${p.name} (${p.brand})`);
            console.log(`    Expires: ${p.expirationDate?.toISOString().split('T')[0]} (${daysUntilExpiration} days)`);
        });
    }

    console.log('\n✅ Product sync complete!');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
