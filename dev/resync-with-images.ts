/**
 * Re-sync Thrive Syracuse products with placeholder images
 */

import { syncPOSProducts } from '@/server/actions/pos-sync';

async function resyncWithImages() {
    console.log('🔄 Re-syncing Thrive Syracuse products with images...\n');

    const orgId = 'org_thrive_syracuse';

    try {
        const result = await syncPOSProducts(orgId);

        if (result.success) {
            console.log('✅ Sync completed successfully!');
            console.log(`   Products synced: ${result.productCount}`);
            console.log(`   All products now have category-based placeholder images`);
        } else {
            console.error('❌ Sync failed:', result.error);
        }
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

resyncWithImages()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
