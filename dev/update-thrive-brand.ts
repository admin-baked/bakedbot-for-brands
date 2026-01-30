/**
 * Update Thrive brand to link to tenant catalog
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
const apps = getApps();
if (apps.length === 0) {
    const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
        credential: cert(serviceAccount),
    });
}

const db = getFirestore();

async function updateThriveBrand() {
    console.log('🔧 Updating Thrive brand to use tenant catalog\n');

    const brandId = 'thrivesyracuse';
    const orgId = 'org_thrive_syracuse';

    try {
        // Update brand document
        await db.collection('brands').doc(brandId).update({
            orgId: orgId,
            menuDesign: 'dispensary', // Use dispensary menu mode
            updatedAt: new Date().toISOString(),
        });

        console.log(`✅ Updated brand ${brandId}`);
        console.log(`   - Added orgId: ${orgId}`);
        console.log(`   - Set menuDesign: dispensary`);
        console.log('\nNow the menu will:');
        console.log('  1. Fetch products from tenants/org_thrive_syracuse/publicViews/products/items');
        console.log('  2. Display in dispensary mode (hero carousel, featured brands, etc.)');
        console.log('  3. Show all 374 synced products\n');

    } catch (error) {
        console.error('❌ Update failed:', error);
        throw error;
    }
}

updateThriveBrand()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
