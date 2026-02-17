/**
 * Seed Test Competitor Snapshots for Thrive Syracuse
 *
 * Creates sample competitor_snapshots so the weekly intel report
 * has data to aggregate. Use only for testing the email/report flow.
 *
 * Run with: npx tsx scripts/seed-thrive-test-snapshots.ts
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'studio-567050101-bc6e8',
    });
}

const db = getFirestore();
const THRIVE_ORG_ID = 'org_thrive_syracuse';

const TEST_SNAPSHOTS = [
    {
        competitorId: 'finger-lakes-cannabis',
        competitorName: 'Finger Lakes Cannabis',
        sourceUrl: 'https://www.fingerlakescannabis.com/menu',
        deals: [
            { name: 'Blue Dream 3.5g', price: 42.00, discount: '10% OFF', category: 'Flower' },
            { name: 'Gelato Pre-Roll 5pk', price: 35.00, discount: '15% OFF', category: 'Pre-Roll' },
            { name: 'OG Kush Vape Cart', price: 48.00, category: 'Vape' },
            { name: 'Mango Gummies 100mg', price: 22.00, discount: '20% OFF', category: 'Edibles' },
        ],
        products: [
            { name: 'Blue Dream', price: 48.00, category: 'Flower', inStock: true },
            { name: 'Wedding Cake', price: 52.00, category: 'Flower', inStock: true },
            { name: 'Jack Herer', price: 45.00, category: 'Flower', inStock: false },
            { name: 'Sour Diesel Vape', price: 55.00, category: 'Vape', inStock: true },
        ],
    },
    {
        competitorId: 'vibe-by-california-syracuse',
        competitorName: 'Vibe by California',
        sourceUrl: 'https://www.vibebycalifornia.com/syracuse/menu',
        deals: [
            { name: 'Purple Punch 7g', price: 70.00, discount: '30% OFF', category: 'Flower' },
            { name: 'Live Resin Concentrate', price: 55.00, category: 'Concentrate' },
            { name: 'Infused Pre-Roll 5pk', price: 62.00, discount: '10% OFF', category: 'Pre-Roll' },
        ],
        products: [
            { name: 'Purple Punch', price: 80.00, category: 'Flower', inStock: true },
            { name: 'Banana OG', price: 85.00, category: 'Flower', inStock: true },
            { name: 'Wedding Crashers', price: 90.00, category: 'Flower', inStock: true },
            { name: 'Live Rosin', price: 75.00, category: 'Concentrate', inStock: false },
        ],
    },
    {
        competitorId: 'higher-level-syracuse',
        competitorName: 'Higher Level Syracuse',
        sourceUrl: 'https://www.higherlevel.com/syracuse/menu',
        deals: [
            { name: 'House Flower 1/8', price: 30.00, discount: '25% OFF', category: 'Flower' },
            { name: 'Distillate Cartridge', price: 38.00, discount: '15% OFF', category: 'Vape' },
            { name: 'Gummy Mix Pack', price: 18.00, discount: '30% OFF', category: 'Edibles' },
            { name: 'Pre-Roll 3pk', price: 20.00, discount: '10% OFF', category: 'Pre-Roll' },
            { name: 'Concentrate Sampler', price: 45.00, discount: '20% OFF', category: 'Concentrate' },
        ],
        products: [
            { name: 'House Blend Flower', price: 40.00, category: 'Flower', inStock: true },
            { name: 'Platinum GSC', price: 44.00, category: 'Flower', inStock: true },
            { name: 'AK-47', price: 38.00, category: 'Flower', inStock: true },
            { name: 'Grape Ape', price: 42.00, category: 'Flower', inStock: false },
            { name: 'Cookies n Cream Gummies', price: 22.00, category: 'Edibles', inStock: true },
        ],
    },
    {
        competitorId: 'remedy-dispensary-syracuse',
        competitorName: 'Remedy Dispensary',
        sourceUrl: 'https://www.remedydispensary.com/menu',
        deals: [
            { name: 'Medical Grade Flower 1/4', price: 65.00, category: 'Flower' },
            { name: 'High-CBD Tincture 1000mg', price: 68.00, discount: '5% OFF', category: 'Tincture' },
            { name: 'CBD Capsules 30ct', price: 45.00, category: 'Capsules' },
        ],
        products: [
            { name: 'ACDC (High-CBD)', price: 70.00, category: 'Flower', inStock: true },
            { name: 'Harlequin', price: 65.00, category: 'Flower', inStock: true },
            { name: 'Charlottes Web CBD', price: 72.00, category: 'Flower', inStock: false },
            { name: 'Full Spectrum Tincture', price: 80.00, category: 'Tincture', inStock: true },
        ],
    },
];

async function main() {
    console.log('Seeding test competitor snapshots for Thrive Syracuse...');
    console.log('='.repeat(55));

    const now = new Date();

    for (const snap of TEST_SNAPSHOTS) {
        const avgDealPrice = snap.deals.length > 0
            ? snap.deals.reduce((sum, d) => sum + d.price, 0) / snap.deals.length
            : 0;

        await db
            .collection('tenants')
            .doc(THRIVE_ORG_ID)
            .collection('competitor_snapshots')
            .add({
                ...snap,
                orgId: THRIVE_ORG_ID,
                scrapedAt: now,
                avgDealPrice,
                dealCount: snap.deals.length,
                productCount: snap.products.length,
                rawMarkdown: `# ${snap.competitorName} Menu\n\n_Test snapshot seeded for report validation_`,
            });

        console.log(`  Added snapshot: ${snap.competitorName} (${snap.deals.length} deals, ${snap.products.length} products)`);
    }

    const totalDeals = TEST_SNAPSHOTS.reduce((sum, s) => sum + s.deals.length, 0);
    const totalProducts = TEST_SNAPSHOTS.reduce((sum, s) => sum + s.products.length, 0);

    console.log('');
    console.log(`Done! Seeded ${TEST_SNAPSHOTS.length} competitor snapshots`);
    console.log(`Total: ${totalDeals} deals, ${totalProducts} products`);
    console.log('');
    console.log('Now run the test to generate a report with real data:');
    console.log('  .\\scripts\\test-thrive-intel.ps1');
}

main().catch(err => {
    console.error('Failed:', err.message);
    process.exit(1);
});
