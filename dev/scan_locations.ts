
import fs from 'fs';
import path from 'path';

console.log('--- START SMART SCAN ---');

const logFile = path.resolve(process.cwd(), 'dev/scan_log.txt');
fs.writeFileSync(logFile, ''); // Clear file

function log(msg: string) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logMsg = `[${timestamp}] ${msg}`;
    console.log(logMsg);
    fs.appendFileSync(logFile, logMsg + '\n');
}

// --- CONFIG ---
const loadEnv = () => {
    try {
        const pathsToCheck = ['.env.local', '.env'];
        for (const file of pathsToCheck) {
            const envPath = path.resolve(process.cwd(), file);
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf-8');
                envContent.split('\n').forEach(line => {
                    const parts = line.split('=');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const val = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
                        if (key && val && !process.env[key]) {
                            process.env[key] = val;
                        }
                    }
                });
            }
        }
    } catch (e) {
        log('Error loading .env manually: ' + e);
    }
};
loadEnv();

const CANNMENUS_API_KEY = process.env.NEXT_PUBLIC_CANNMENUS_API_KEY || process.env.CANNMENUS_API_KEY;
const CANNMENUS_BASE_URL = process.env.CANNMENUS_API_BASE_URL || 'https://api.cannmenus.com';

if (!CANNMENUS_API_KEY) {
    log('CRITICAL: API Key missing!');
    process.exit(1);
}

// --- TYPES ---
interface ZipRecord {
    zip_code: string;
    city: string;
    state: string;
    market_type?: string;
    has_dispensary?: string | boolean;
    likely_brand_coverage?: string | boolean;
    status?: string;
    dispensary_count?: number;
    scanned?: boolean;
}

const TARGET_STATES = ['Illinois'];

// --- ARGS ---
const args = process.argv.slice(2);
const limitArgIndex = args.indexOf('--limit');
const LIMIT = limitArgIndex !== -1 ? parseInt(args[limitArgIndex + 1], 10) : Infinity;

log(`Target States: ${TARGET_STATES.join(', ')}`);
log(`Limit: ${LIMIT === Infinity ? 'Full Scan' : LIMIT}`);

// --- API ---
async function searchRetailers(zip: string, state: string) {
    try {
        log(`Scanning ZIP: ${zip} -> Geocoding...`);
        // 1. Geocode
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&limit=1`, {
            headers: { 'User-Agent': 'BakedBot-Scanner/1.0' }
        });
        const geoData = await geoRes.json();

        if (!geoData || geoData.length === 0) {
            log(`Geocoding failed for ${zip}`);
            return { error: 'Geocode failed', data: [] };
        }

        const lat = geoData[0].lat;
        const lon = geoData[0].lon;
        log(`Geocoded ${zip}: ${lat}, ${lon}`);

        // 2. Search CannMenus
        const params = new URLSearchParams({
            lat: lat,
            lng: lon,
            limit: '50',
            sort: 'distance',
            states: state // Filter by state at API level
        });

        const apiUrl = `${CANNMENUS_BASE_URL}/v1/retailers?${params}`;
        log(`API URL: ${apiUrl}`);

        const res = await fetch(apiUrl, {
            headers: {
                'X-Token': CANNMENUS_API_KEY || '',
                'Accept': 'application/json'
            }
        });

        if (!res.ok) {
            return { error: `API Error: ${res.statusText}`, data: [] };
        }

        const data = await res.json();
        if (data.data && data.data.length > 0) {
            const first = data.data[0];
            const name = first.dispensary_name || first.name || 'Unknown';
            log(`Found ${data.data.length} retailers in ${state}. First one: ${name} in ${first.city}, ${first.state}`);
        }
        return { error: null, data: data.data || [] };

    } catch (e: any) {
        return { error: e.message, data: [] };
    }
}

async function main() {
    const csvPath = path.resolve(process.cwd(), 'dev/target_locations.csv');
    const updatedCsvPath = path.resolve(process.cwd(), 'dev/target_locations_updated.csv');
    const dispensariesPath = path.resolve(process.cwd(), 'dev/discovered_dispensaries.json');

    // Load Data
    const rawData = fs.readFileSync(csvPath, 'utf-8');
    const lines = rawData.split(/\r?\n/).filter(line => line.trim().length > 0);
    const headers = lines[0].split(',').map(h => h.trim());

    // Load Existing Dispensaries
        ?JSON.parse(fs.readFileSync(dispensariesPath, 'utf-8'))
        : [];

    // FILTER: Sanitize existing data to remove non-target states (e.g. from bad API results)
    const validExisting = existingDispensaries.filter((d: any) =>
        TARGET_STATES.map(s => s.toLowerCase()).includes(d.state?.toLowerCase())
    );
    if (validExisting.length < existingDispensaries.length) {
        log(`Sanitized ${existingDispensaries.length - validExisting.length} non-target dispensaries from existing data.`);
    }

    const uniqueDispensaries = new Map<string, any>();
    validExisting.forEach((d: any) => uniqueDispensaries.set(String(d.id), d));
    log(`Loaded ${uniqueDispensaries.size} existing dispensaries.`);

    const records: ZipRecord[] = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const cols = line.split(',');
        const record: any = {};
        headers.forEach((h, idx) => {
            if (h) record[h] = cols[idx]?.trim();
        });
        record.has_dispensary = record.has_dispensary || 'False';
        record.dispensary_count = parseInt(record.dispensary_count) || 0;
        record.status = record.status || 'pending';
        record.scanned = false;
        records.push(record as ZipRecord);
    }

    // Filter to target states
    let activeRecords = records.filter(r => TARGET_STATES.includes(r.state));
    if (LIMIT !== Infinity) {
        activeRecords = activeRecords.slice(0, LIMIT);
    }

    log(`Processing ${activeRecords.length} records...`);

    // --- STATE ---
    // Use City|State as the discovery key since zip codes are not in the API response
    const verifiedCities = new Set<string>();

    let apiCalls = 0;
    let skipped = 0;

    for (let i = 0; i < activeRecords.length; i++) {
        const record = activeRecords[i];
        const cityKey = `${record.city.toLowerCase()}|${record.state.toLowerCase()}`;

        // Progress Log every 50
        if (i % 50 === 0) {
            process.stdout.write(`\r[${i}/${activeRecords.length}] API Calls: ${apiCalls} | Skipped: ${skipped} | Found: ${uniqueDispensaries.size} Dispensaries`);
        }

        // SMART DISCOVERY CHECK (City-based)
        if (verifiedCities.has(cityKey)) {
            record.has_dispensary = 'True';
            record.likely_brand_coverage = 'True';
            record.status = 'verified (city-inferred)';
            record.scanned = false;
            skipped++;
            continue;
        }

        // Rate Limit - 1 second pause every 10 calls
        if (apiCalls > 0 && apiCalls % 10 === 0) {
            await new Promise(r => setTimeout(r, 1000));
        }

        const { error, data } = await searchRetailers(record.zip_code, record.state);
        apiCalls++;
        record.scanned = true;

        if (error) {
            record.status = 'error: ' + error;
        } else {
            const count = data.length;
            record.dispensary_count = count;

            if (count > 0) {
                record.has_dispensary = 'True';
                record.status = 'verified';
                record.likely_brand_coverage = 'True';

                // HARVEST NEIGHBORS - Mark all discovered cities as verified
                data.forEach((r: any) => {
                    const id = r.id || r.retailer_id;
                    const rCity = r.city?.toLowerCase();
                    const rState = r.state?.toLowerCase(); // API state

                    // STRICT FILTER: Only accept retailers in TARGET_STATES
                    const isTargetState = TARGET_STATES.map(s => s.toLowerCase()).includes(rState);
                    if (!isTargetState) return;

                    const name = r.dispensary_name || r.name || 'Unknown';
                    // Add Retailer
                    if (id && !uniqueDispensaries.has(String(id))) {
                        uniqueDispensaries.set(String(id), {
                            id: id,
                            name: name,
                            city: r.city,
                            state: r.state,
                            address: r.physical_address || r.address
                        });
                    }

                    // Mark City as Verified (only if in target states)
                    if (rCity && rState && TARGET_STATES.map(s => s.toLowerCase()).includes(rState)) {
                        verifiedCities.add(`${rCity}|${rState}`);
                    }
                });
            } else {
                record.status = 'empty';
                record.has_dispensary = 'False';
            }
        }
    }

    process.stdout.write('\n');
    log('Scan Complete.');
    log(`Total API Calls: ${apiCalls}`);
    log(`Smart Skips (City-based): ${skipped}`);
    log(`Total Dispensaries Found: ${uniqueDispensaries.size}`);
    log(`Verified Cities: ${verifiedCities.size}`);

    // --- WRITE OUTPUT ---

    // Back-fill verified status for ALL records (even those not in activeRecords if LIMIT was used)
    for (const r of records) {
        const cityKey = `${r.city.toLowerCase()}|${r.state.toLowerCase()}`;
        if (verifiedCities.has(cityKey) && r.has_dispensary !== 'True') {
            r.has_dispensary = 'True';
            r.status = 'verified (city-inferred)';
            r.likely_brand_coverage = 'True';
        }
    }

    // Write CSV
    // Ensure we don't duplicate columns if they were already in headers
    const baseHeaders = headers.filter(h => h !== 'dispensary_count' && h !== 'status_detail');
    const finalHeaders = [...baseHeaders, 'dispensary_count', 'status_detail'];

    const finalLines = [
        finalHeaders.join(','),
        ...records.map(r => {
            const row = baseHeaders.map(h => (r as any)[h] || '');
            return [...row, r.dispensary_count || 0, r.status || ''].join(',');
        })
    ];
    fs.writeFileSync(updatedCsvPath, finalLines.join('\n'));
    log(`Saved updated CSV to ${updatedCsvPath}`);

    // Write JSON
    fs.writeFileSync(dispensariesPath, JSON.stringify(Array.from(uniqueDispensaries.values()), null, 2));
    log(`Saved dispensaries to ${dispensariesPath}`);
}

main().catch(e => {
    console.error(e);
    log('Fatal Error: ' + e);
});
