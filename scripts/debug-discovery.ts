
import { discoverNearbyProducts, getRetailersByZipCode } from '../src/server/services/geo-discovery';
import { getRetailerProducts, searchNearbyRetailers } from '../src/lib/cannmenus-api';

// Bypassing Firebase for local debug
const MOCK_COORDS = {
    lat: 33.9497,
    lng: -118.2462,
    city: 'Los Angeles',
    state: 'California'
};

async function run() {
    const zipCode = '90002';
    console.log(`Debugging discovery for ${zipCode} (Bypassing Firebase)...`);

    // 1. Test Retailer Search directly (CannMenus)
    console.log('1. Searching for retailers...');
    const retailers = await searchNearbyRetailers(
        MOCK_COORDS.lat,
        MOCK_COORDS.lng,
        10,
        MOCK_COORDS.state,
        MOCK_COORDS.city
    );

    console.log(`Found ${retailers.length} retailers.`);
    retailers.forEach(r => console.log(` - ${r.name} (ID: ${r.id}) [${r.state}] Dist: ${r.distance?.toFixed(2)} mi`));

    if (retailers.length === 0) {
        console.error('No retailers found! CannMenus API might be returning empty or credentials wrong.');
        return;
    }

    // 2. Test Product Search for first retailer
    const r = retailers[0];
    console.log(`\n2. Fetching products for retailer: ${r.name} (ID: ${r.id})...`);
    console.log(`   Using State param: "${r.state}"`);

    try {
        const products = await getRetailerProducts(r.id, { state: r.state });
        console.log(`   Found ${products.length} products.`);

        if (products.length > 0) {
            console.log('   Sample Product:', JSON.stringify(products[0], null, 2));
        } else {
            console.warn('   0 products found. This implies API connection ok but empty inventory or filter mismatch.');
        }

    } catch (e) {
        console.error('   Error fetching products:', e);
    }
}

run().catch(console.error);
