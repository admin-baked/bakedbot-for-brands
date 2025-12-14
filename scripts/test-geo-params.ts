
import { CANNMENUS_CONFIG } from '@/lib/config';
import fs from 'fs';

const BASE = CANNMENUS_CONFIG.API_BASE;
const KEY = CANNMENUS_CONFIG.API_KEY;

async function testParams() {
    let log = 'Starting Test\n';

    // Chicago Coords
    const LAT = 41.8917;
    const LNG = -87.6343;

    const variations = [
        // 1. Current
        { params: { lat: LAT, lng: LNG, sort: 'distance', limit: 3 }, name: 'Current (lat/lng)' },
        // 2. Full names
        { params: { latitude: LAT, longitude: LNG, sort: 'distance', limit: 3 }, name: 'Full Names' },
        // 3. Radius
        { params: { lat: LAT, lng: LNG, radius: 10, limit: 3 }, name: 'With Radius' },
        // 4. State singular
        { params: { lat: LAT, lng: LNG, state: 'IL', limit: 3 }, name: 'State Singular' },
        // 5. States plural
        { params: { lat: LAT, lng: LNG, states: 'IL', limit: 3 }, name: 'States Plural' },
        // 6. With sort param variations
        { params: { lat: LAT, lng: LNG, sort_by: 'distance', limit: 3 }, name: 'Sort By' },
    ];

    for (const v of variations) {
        log += `\n--- Testing: ${v.name} ---\n`;
        const q = new URLSearchParams(v.params as any).toString();
        const url = `${BASE}/v1/retailers?${q}`;

        try {
            const res = await fetch(url, { headers: { 'X-Token': KEY } });
            const data = await res.json();
            const retailers = data.data || [];

            log += `Found: ${retailers.length}\n`;
            if (retailers.length > 0) {
                // Show first result
                const r = retailers[0];
                log += `First: ${r.name || r.dispensary_name} (${r.city}, ${r.state})\n`;
            }
        } catch (e) {
            log += `Error: ${e.message}\n`;
        }
    }

    fs.writeFileSync('params_output.txt', log);
    console.log('Done.');
}

testParams().catch(console.error);
