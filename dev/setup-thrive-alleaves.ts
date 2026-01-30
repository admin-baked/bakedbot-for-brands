/**
 * Thrive Cannabis Syracuse - Alleaves POS Setup Script
 *
 * This script initializes the Firestore configuration for Thrive Syracuse
 * with Alleaves POS integration.
 *
 * Run: npx tsx dev/setup-thrive-alleaves.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
const apps = getApps();
let app;

if (apps.length === 0) {
    // Try to load service account from multiple possible locations
    let serviceAccount;
    const possiblePaths = [
        path.join(process.cwd(), 'firebase-service-account.json'),
        path.join(process.cwd(), 'bakedbot-prod-firebase-adminsdk.json'),
        process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    ];

    for (const filePath of possiblePaths) {
        if (filePath && fs.existsSync(filePath)) {
            serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            console.log(`✅ Loaded service account from: ${filePath}`);
            break;
        }
    }

    if (!serviceAccount) {
        console.error('❌ No service account found. Set GOOGLE_APPLICATION_CREDENTIALS or place firebase-service-account.json in project root.');
        process.exit(1);
    }

    app = initializeApp({
        credential: cert(serviceAccount),
    });
} else {
    app = apps[0];
}

const firestore = getFirestore(app);

async function setupThriveAlleaves() {
    console.log('🚀 Setting up Thrive Cannabis Syracuse with Alleaves POS integration...\n');

    const brandId = 'thrivesyracuse';
    const orgId = 'org_thrive_syracuse';
    const locationId = 'loc_thrive_syracuse_main';

    try {
        // 1. Create/Update Organization
        console.log('1️⃣  Creating organization...');
        await firestore.collection('orgs').doc(orgId).set({
            id: orgId,
            name: 'Thrive Cannabis Syracuse',
            type: 'dispensary',
            brandId: brandId,
            email: 'thrivesyracuse@bakedbot.ai',
            owner: {
                email: 'thrivesyracuse@bakedbot.ai',
                name: 'Ade Adeyemi',
            },
            address: {
                street: '3065 Erie Blvd E',
                city: 'Syracuse',
                state: 'NY',
                zip: '13224',
                country: 'USA',
            },
            phone: '',
            website: 'https://bakedbot.ai/thrivesyracuse',
            settings: {
                timezone: 'America/New_York',
                currency: 'USD',
            },
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }, { merge: true });
        console.log('   ✅ Organization created: ' + orgId);

        // 2. Create/Update Location with Alleaves POS Config
        console.log('2️⃣  Creating location with Alleaves POS config...');
        await firestore.collection('locations').doc(locationId).set({
            id: locationId,
            orgId: orgId,
            brandId: brandId,
            name: 'Thrive Syracuse - Main Store',
            displayName: 'Thrive Cannabis Syracuse',
            address: {
                street: '3065 Erie Blvd E',
                city: 'Syracuse',
                state: 'NY',
                zip: '13224',
                country: 'USA',
                coordinates: {
                    lat: 43.0481,
                    lng: -76.0900,
                },
            },
            hours: {
                monday: { open: '10:00', close: '20:00', closed: false },
                tuesday: { open: '10:00', close: '20:00', closed: false },
                wednesday: { open: '10:00', close: '20:00', closed: false },
                thursday: { open: '10:00', close: '20:00', closed: false },
                friday: { open: '10:00', close: '20:00', closed: false },
                saturday: { open: '10:00', close: '20:00', closed: false },
                sunday: { open: '11:00', close: '18:00', closed: false },
            },
            posConfig: {
                provider: 'alleaves',
                status: 'active',
                locationId: '1000',           // Alleaves location ID
                storeId: '1000',              // Store identifier
                environment: 'production',
                // JWT credentials pulled from env vars: ALLEAVES_USERNAME, ALLEAVES_PASSWORD, ALLEAVES_PIN
                username: 'bakedbotai@thrivesyracuse.com',
                lastSyncAt: null,
                autoSync: true,
                syncIntervalHours: 4,
                enableWebhooks: false,        // Enable when webhooks are configured
            },
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }, { merge: true });
        console.log('   ✅ Location created: ' + locationId);
        console.log('   📍 Alleaves Location ID: 1000');

        // 3. Create Brand Document
        console.log('3️⃣  Creating brand configuration...');
        await firestore.collection('brands').doc(brandId).set({
            id: brandId,
            name: 'Thrive Syracuse',
            displayName: 'Thrive Cannabis Syracuse',
            orgId: orgId,
            email: 'thrivesyracuse@bakedbot.ai',
            phone: '',
            website: 'https://bakedbot.ai/thrivesyracuse',
            description: 'Syracuse\'s premier cannabis dispensary committed to community reinvestment and quality products.',
            tagline: 'Reinvesting in our community, one customer at a time.',
            logoUrl: '',
            primaryColor: '#4ade80',
            secondaryColor: '#142117',
            state: 'NY',
            licenseNumber: '',
            licenseType: 'Adult-Use Dispensary',
            settings: {
                enableSmokey: true,
                enableCraig: true,
                enableEzal: true,
                enableDashboard: true,
                menuStyle: 'grid',
                ageGateEnabled: true,
                ageRequirement: 21,
                showPrices: true,
                showInventory: true,
                enableOnlineOrdering: true,
                enableDelivery: false,       // Coming soon per ground truth
                taxRate: 0.09,                // NY cannabis tax rate
            },
            social: {
                instagram: '',
                facebook: '',
                twitter: '',
            },
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }, { merge: true });
        console.log('   ✅ Brand created: ' + brandId);

        // 4. Set up Ground Truth reference
        console.log('4️⃣  Linking ground truth data...');
        await firestore.collection('ground_truth').doc(brandId).set({
            brandId: brandId,
            sourceFile: 'src/server/grounding/customers/thrive-syracuse.ts',
            version: '1.0',
            lastUpdated: new Date().toISOString(),
            totalQAPairs: 29,
            categories: [
                'store_information',
                'age_and_id',
                'product_categories',
                'effect_based_recommendations',
                'brands_and_products',
                'pricing_and_deals',
                'compliance_and_safety',
                'ordering_and_delivery',
            ],
        }, { merge: true });
        console.log('   ✅ Ground truth linked');

        console.log('\n✅ Setup complete!\n');
        console.log('═'.repeat(60));
        console.log('📊 SUMMARY');
        console.log('═'.repeat(60));
        console.log(`Organization ID:  ${orgId}`);
        console.log(`Brand ID:         ${brandId}`);
        console.log(`Location ID:      ${locationId}`);
        console.log(`POS Provider:     alleaves`);
        console.log(`Alleaves Loc ID:  1000`);
        console.log(`Menu URL:         https://bakedbot.ai/thrivesyracuse`);
        console.log(`Email:            thrivesyracuse@bakedbot.ai`);
        console.log('═'.repeat(60));

        console.log('\n🔄 NEXT STEPS:\n');
        console.log('1. Add Alleaves JWT credentials to Firebase secrets:');
        console.log('   firebase apphosting:secrets:set ALLEAVES_USERNAME="bakedbotai@thrivesyracuse.com"');
        console.log('   firebase apphosting:secrets:set ALLEAVES_PASSWORD="Dreamchasing2030!!@@!!"');
        console.log('   firebase apphosting:secrets:set ALLEAVES_PIN="1234"');
        console.log('');
        console.log('2. Update apphosting.yaml to include these env vars');
        console.log('');
        console.log('3. Test adapter (already passing):');
        console.log('   npx tsx dev/test-alleaves-adapter.ts');
        console.log('');
        console.log('4. Run initial POS sync via dashboard or:');
        console.log('   Call POST /api/pos/sync with brandId=thrivesyracuse');
        console.log('');
        console.log('5. Verify products in:');
        console.log('   - Smokey widget: https://bakedbot.ai/thrivesyracuse');
        console.log('   - Dashboard: /dashboard/content');
        console.log('');

    } catch (error) {
        console.error('❌ Setup failed:', error);
        throw error;
    }
}

// Run setup
setupThriveAlleaves()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
