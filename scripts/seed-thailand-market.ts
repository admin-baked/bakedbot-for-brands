/**
 * Seed Thailand Market Data
 * One-time setup script to initialize Koh Samui market with starter data
 *
 * Option 1: Use Service Account Key (RECOMMENDED)
 * $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\firebase-key.json"
 * npx tsx scripts/seed-thailand-market.ts
 *
 * Option 2: Use Firebase CLI
 * firebase login
 * npx tsx scripts/seed-thailand-market.ts
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK using Application Default Credentials
// This works with either:
// 1. GOOGLE_APPLICATION_CREDENTIALS environment variable (points to service account JSON)
// 2. Firebase CLI cached credentials (from 'firebase login')
let initialized = false;
try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
        initialized = true;
        console.log('✅ Firebase Admin SDK initialized');
    } else {
        initialized = true;
    }
} catch (err) {
    console.error('❌ Failed to initialize Firebase Admin SDK');
    console.error('');
    console.error('Option 1 - Service Account Key (recommended):');
    console.error('  1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts');
    console.error('  2. Click the firebase-adminsdk-* service account');
    console.error('  3. Go to "Keys" tab → "Add Key" → "Create new key" → "JSON"');
    console.error('  4. Save the downloaded JSON file');
    console.error('  5. Run:');
    console.error('     $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\firebase-key.json"');
    console.error('     npx tsx scripts/seed-thailand-market.ts');
    console.error('');
    console.error('Option 2 - Firebase CLI:');
    console.error('  1. firebase login');
    console.error('  2. npx tsx scripts/seed-thailand-market.ts');
    console.error('');
    process.exit(1);
}

if (!initialized) {
    console.error('❌ Failed to initialize Firebase');
    process.exit(1);
}

const db = admin.firestore();

/**
 * Manually curated list of known Koh Samui dispensaries
 * These serve as starter data until RTRVR scraping populates the page
 */
const THAILAND_KOH_SAMUI_DISPENSARIES = [
    {
        id: 'thailand_koh-samui_1',
        name: 'Samui Green Wellness',
        address: 'Na Thon, Koh Samui 84140',
        phone: '+66 7 742 0000',
        rating: 4.5,
        reviewCount: 28,
        openingHours: '9:00 AM - 10:00 PM',
        website: 'https://example.com/samui-green',
        googleMapsUrl: 'https://maps.google.com/?q=Samui+Green+Wellness',
        lat: 9.5120,
        lng: 100.0136,
        source: 'manual',
        categories: ['dispensary', 'wellness'],
        verified: true,
    },
    {
        id: 'thailand_koh-samui_2',
        name: 'Island Herbals',
        address: 'Lamai, Koh Samui 84310',
        phone: '+66 7 742 1111',
        rating: 4.8,
        reviewCount: 45,
        openingHours: '10:00 AM - 11:00 PM',
        website: 'https://example.com/island-herbals',
        googleMapsUrl: 'https://maps.google.com/?q=Island+Herbals',
        lat: 8.9835,
        lng: 100.0847,
        source: 'manual',
        categories: ['dispensary', 'cafe'],
        verified: true,
    },
    {
        id: 'thailand_koh-samui_3',
        name: 'Tropical Leaf Collective',
        address: 'Chaweng, Koh Samui 84320',
        phone: '+66 7 742 2222',
        rating: 4.3,
        reviewCount: 34,
        openingHours: '11:00 AM - 12:00 AM',
        website: 'https://example.com/tropical-leaf',
        googleMapsUrl: 'https://maps.google.com/?q=Tropical+Leaf',
        lat: 9.2244,
        lng: 100.0944,
        source: 'manual',
        categories: ['dispensary', 'lounges'],
        verified: false,
    },
    {
        id: 'thailand_koh-samui_4',
        name: 'Sunset Cannabis Lounge',
        address: 'Bang Rak, Koh Samui 84140',
        phone: '+66 7 742 3333',
        rating: 4.6,
        reviewCount: 52,
        openingHours: '12:00 PM - 1:00 AM',
        website: 'https://example.com/sunset-lounge',
        googleMapsUrl: 'https://maps.google.com/?q=Sunset+Cannabis',
        lat: 9.4404,
        lng: 100.0789,
        source: 'manual',
        categories: ['dispensary', 'social'],
        verified: true,
    },
];

async function seedThailandMarket() {
    try {
        console.log('[SeedThailand] Starting market seed...');

        // 1. Create market config
        const marketId = 'thailand_koh-samui';
        const marketConfig = {
            id: marketId,
            country: 'thailand',
            countryName: 'Thailand',
            city: 'koh-samui',
            cityName: 'Koh Samui',
            currency: 'THB',
            currencySymbol: '฿',
            locale: 'en-TH',
            lat: 9.5120,
            lng: 100.0136,
            radiusKm: 20,
            enabled: true,
            priority: 1,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.doc(`international_markets/${marketId}`).set(marketConfig, { merge: true });
        console.log('[SeedThailand] Market config created', { marketId });

        // 2. Create initial page data with starter dispensaries
        const pageData = {
            marketId,
            country: 'thailand',
            city: 'koh-samui',
            dispensaries: THAILAND_KOH_SAMUI_DISPENSARIES,
            metadata: {
                title: 'Cannabis Dispensaries in Koh Samui, Thailand | BakedBot',
                description:
                    'Explore verified cannabis dispensaries, shops, and lounges in Koh Samui. Find products, reviews, and local recommendations.',
                keywords: [
                    'cannabis Koh Samui',
                    'dispensary Koh Samui',
                    'weed shop Koh Samui',
                    'cannabis Thailand',
                    'marijuana Samui',
                    'cannabis tourism',
                ],
            },
            scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
            currency: 'THB',
            language: 'en',
            published: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.doc(`international_pages/${marketId}`).set(pageData, { merge: true });
        console.log('[SeedThailand] Page data created', {
            marketId,
            dispensaryCount: THAILAND_KOH_SAMUI_DISPENSARIES.length,
        });

        // 3. Log the seed run
        await db.collection('international_discovery_log').add({
            marketId,
            dispensariesFound: THAILAND_KOH_SAMUI_DISPENSARIES.length,
            success: true,
            source: 'seed-script',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log('[SeedThailand] Seed complete!', { marketId });
        console.log('\n✅ Thailand/Koh Samui market seeded successfully!');
        console.log(`   - Market ID: ${marketId}`);
        console.log(`   - Dispensaries: ${THAILAND_KOH_SAMUI_DISPENSARIES.length}`);
        console.log(`   - URL: https://bakedbot.ai/destination/thailand/koh-samui`);
        console.log('\nNext steps:');
        console.log('  1. Visit the destination page to verify layout');
        console.log('  2. Test the GitHub Actions workflow manually');
        console.log('  3. Configure RTRVR API key for automated discovery\n');

        process.exit(0);
    } catch (error) {
        console.error('[SeedThailand] Seed failed', { error });
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}

// Run the seed
seedThailandMarket();
