
import { searchNearbyRetailers } from '@/lib/cannmenus-api';

async function main() {
    console.log('Testing Milwaukee Hemp Search (43.0389, -87.9065)...');
    try {
        // Search for 'hemp' near Milwaukee
        console.log('--- Searching for "hemp" ---');
        const hempRetailers = await searchNearbyRetailers(43.0389, -87.9065, 5, undefined, undefined, 'hemp');
        hempRetailers.forEach(r => console.log(`[HEMP] ${r.name} | ${r.city} | ${r.distance?.toFixed(2)} mi`));

        // Search for 'smoke' near Milwaukee
        console.log('\n--- Searching for "smoke" ---');
        const smokeRetailers = await searchNearbyRetailers(43.0389, -87.9065, 5, undefined, undefined, 'smoke');
        smokeRetailers.forEach(r => console.log(`[SMOKE] ${r.name} | ${r.city} | ${r.distance?.toFixed(2)} mi`));

    } catch (err) {
        console.error('Error:', err);
    }
}

main();
