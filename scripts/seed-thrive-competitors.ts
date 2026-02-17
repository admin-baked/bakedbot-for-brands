/**
 * Seed Thrive Syracuse Local Competitors
 *
 * Seeds 4 nearest Syracuse dispensary competitors into
 * tenants/org_thrive_syracuse/competitors/ collection
 * (the path that generateWeeklyIntelReport reads from).
 *
 * Run with: npx tsx scripts/seed-thrive-competitors.ts
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

// 4 nearest competitors to Thrive Syracuse (3065 Erie Blvd E, Syracuse NY)
const SYRACUSE_COMPETITORS = [
    {
        id: 'finger-lakes-cannabis',
        name: 'Finger Lakes Cannabis',
        type: 'dispensary' as const,
        primaryDomain: 'www.fingerlakescannabis.com',
        state: 'NY',
        city: 'Syracuse',
        zip: '13206',
        brandsFocus: [],
        active: true,
        weedmapsSlug: 'finger-lakes-cannabis',
        leaflySlug: 'finger-lakes-cannabis',
        metadata: {
            distance: '2.1 miles',
            notes: 'Major competitor on East Side',
        },
    },
    {
        id: 'vibe-by-california-syracuse',
        name: 'Vibe by California',
        type: 'dispensary' as const,
        primaryDomain: 'www.vibebycalifornia.com',
        state: 'NY',
        city: 'Syracuse',
        zip: '13202',
        brandsFocus: [],
        active: true,
        weedmapsSlug: 'vibe-by-california-syracuse',
        leaflySlug: 'vibe-by-california-syracuse',
        metadata: {
            distance: '3.5 miles',
            notes: 'Premium brand, downtown location',
        },
    },
    {
        id: 'higher-level-syracuse',
        name: 'Higher Level Syracuse',
        type: 'dispensary' as const,
        primaryDomain: 'www.higherlevel.com',
        state: 'NY',
        city: 'Syracuse',
        zip: '13219',
        brandsFocus: [],
        active: true,
        weedmapsSlug: 'higher-level-syracuse',
        metadata: {
            distance: '4.2 miles',
            notes: 'Chain dispensary, competitive pricing',
        },
    },
    {
        id: 'remedy-dispensary-syracuse',
        name: 'Remedy Dispensary',
        type: 'dispensary' as const,
        primaryDomain: 'www.remedydispensary.com',
        state: 'NY',
        city: 'Syracuse',
        zip: '13210',
        brandsFocus: [],
        active: true,
        weedmapsSlug: 'remedy-dispensary',
        metadata: {
            distance: '5.8 miles',
            notes: 'Medical focus, expanding adult-use',
        },
    },
];

async function main() {
    console.log('Seeding Thrive Syracuse competitors...');
    console.log('='.repeat(50));

    let added = 0;
    let updated = 0;

    for (const comp of SYRACUSE_COMPETITORS) {
        const { id, metadata, ...rest } = comp;

        const docRef = db
            .collection('tenants')
            .doc(THRIVE_ORG_ID)
            .collection('competitors')
            .doc(id);

        const existing = await docRef.get();
        const isNew = !existing.exists;

        await docRef.set({
            id,
            tenantId: THRIVE_ORG_ID,
            ...rest,
            metadata,
            scrapingEnabled: true,
            consecutiveFailures: 0,
            lastScraped: null,
            createdAt: isNew ? new Date() : existing.data()?.createdAt,
            updatedAt: new Date(),
        }, { merge: true });

        if (isNew) {
            added++;
            console.log(`  Added: ${comp.name} (${metadata.distance})`);
        } else {
            updated++;
            console.log(`  Updated: ${comp.name}`);
        }
    }

    console.log('');
    console.log(`Done: ${added} added, ${updated} updated`);
    console.log(`Collection: tenants/${THRIVE_ORG_ID}/competitors`);
    console.log('');
    console.log('Now run the competitive intel report to see data:');
    console.log('  .\\scripts\\test-thrive-intel.ps1');
}

main().catch(err => {
    console.error('Failed:', err.message);
    process.exit(1);
});
