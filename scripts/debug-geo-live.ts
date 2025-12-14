
import * as dotenv from 'dotenv';
import { getZipCodeCoordinates } from '../src/server/services/geo-discovery';
import { searchNearbyRetailers, geocodeZipCode } from '../src/lib/cannmenus-api';

// Load env vars
dotenv.config({ path: '.env.local' });

async function debugLive() {
    console.log('--- Debugging Live Geo Logic for 90004 ---');

    // 1. Check Geocoding Service directly
    console.log('\n1. Testing geocodeZipCode direct call:');
    const geoRaw = await geocodeZipCode('90004');
    console.log('geocodeZipCode result:', geoRaw);

    // 2. Check Service Layer (Cache + Fetch)
    console.log('\n2. Testing getZipCodeCoordinates (Cache layer):');
    const coords = await getZipCodeCoordinates('90004');
    console.log('getZipCodeCoordinates result:', coords);

    if (!coords) {
        console.error('FAILED: No coords returned.');
        return;
    }

    if (!coords.city) {
        console.error('FAILED: City is missing from coords!');
    } else {
        console.log(`PASS: City is present: "${coords.city}"`);
    }

    // 3. Test Retailer Search with explicit params
    console.log(`\n3. Testing searchNearbyRetailers with city="${coords.city}":`);
    const retailers = await searchNearbyRetailers(coords.lat, coords.lng, 10, coords.state, coords.city);

    console.log(`Found ${retailers.length} retailers.`);
    if (retailers.length > 0) {
        console.log('Top 3 matches:');
        retailers.slice(0, 3).forEach(r => {
            console.log(` - ${r.name} (${r.city}, ${r.state}) [${r.distance?.toFixed(2)} mi]`);
        });
    }

    // 4. Test Retailer Search explicitly WITHOUT city (Control Group)
    console.log(`\n4. Control Test: searchNearbyRetailers WITHOUT city:`);
    const retailersControl = await searchNearbyRetailers(coords.lat, coords.lng, 3);
    console.log('Top match (Control):', retailersControl[0]?.name, retailersControl[0]?.distance);
}

debugLive();
