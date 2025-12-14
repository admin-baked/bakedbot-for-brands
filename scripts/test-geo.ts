
import { geocodeZipCode, searchNearbyRetailers } from '@/lib/cannmenus-api';
import fs from 'fs';

async function test60654() {
    console.log('Starting test with state filter...');
    const coords = await geocodeZipCode('60654');

    let retailers: any[] = [];
    if (coords) {
        // Pass 'IL' as the state (4th argument)
        retailers = await searchNearbyRetailers(coords.lat, coords.lng, 20, 'IL');
    }

    const output = {
        coords,
        retailers: retailers.map(r => ({
            name: r.name,
            city: r.city,
            state: r.state,
            distance: r.distance
        }))
    };

    fs.writeFileSync('debug_output_state.json', JSON.stringify(output, null, 2));
    console.log('Done.');
}

test60654().catch(console.error);
