
import { searchNearbyRetailers } from '@/lib/cannmenus-api';

async function main() {
    console.log('Testing Milwaukee (43.0389, -87.9065)...');
    try {
        const retailers = await searchNearbyRetailers(43.0389, -87.9065, 5);
        console.log(`Found ${retailers.length} retailers.`);
        retailers.forEach((r, i) => {
            console.log(`[${i}] ${r.name} | ${r.city}, ${r.state} | ${r.distance?.toFixed(2)} miles`);
        });
    } catch (err) {
        console.error('Error:', err);
    }
}

main();
