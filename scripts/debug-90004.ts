
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars from .env.local
dotenv.config({ path: '.env.local' });

// Need to import AFTER dotenv config if the modules use env vars at toplevel (usually best practice)
// But here the functions use process.env at runtime likely.
import { searchNearbyRetailers, geocodeZipCode } from '../src/lib/cannmenus-api';

async function debug90004() {
    const logData: any[] = [];
    const log = (msg: any) => {
        console.log(msg);
        logData.push(msg);
    };

    log('--- Debugging 90004 ---');
    log(`API Key present: ${!!process.env.CANNMENUS_API_KEY}`);

    // 1. Verify Coordinates
    const coords = await geocodeZipCode('90004');
    log({ step: 'geocode', coords });

    if (!coords) {
        log('Failed to geocode 90004');
        fs.writeFileSync('debug_results_90004.json', JSON.stringify(logData, null, 2));
        return;
    }

    // 2. Search Retailers (Default)
    log('\n--- Search Retailers (Default Params) ---');
    try {
        const retailers = await searchNearbyRetailers(coords.lat, coords.lng, 20); // Limit 20
        log({ step: 'search_default', count: retailers.length });

        retailers.forEach(r => {
            // log minimal info
            log({ name: r.name, dist: r.distanceMiles, city: r.city });
        });
    } catch (e: any) {
        log({ step: 'search_error', error: e.message });
    }

    fs.writeFileSync('debug_results_90004.json', JSON.stringify(logData, null, 2));
}

debug90004();
