
import fs from 'fs';
import path from 'path';

console.log('--- BRAND SCANNER ---');

const logFile = path.resolve(process.cwd(), 'dev/brand_scan_log.txt');
fs.writeFileSync(logFile, '');

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

// --- ARGS ---
const args = process.argv.slice(2);
const limitArgIndex = args.indexOf('--limit');
const LIMIT = limitArgIndex !== -1 ? parseInt(args[limitArgIndex + 1], 10) : 50; // Brands to find limit? Or Calls limit?
// Let's interpret limit as "Max API Calls" or "Max Cities to Scan"
const MAX_CITIES_TO_SCAN = LIMIT;

// --- TYPES ---
interface DiscoveredDispensary {
    id: number;
    name: string;
    city: string;
    state: string;
}

interface DiscoveredBrand {
    name: string;
    slug: string;
    foundInCities: string[]; // City|State keys
    sampleRetailerIds: number[];
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

async function getRetailerMenu(retailerId: number): Promise<{ error?: string, products: any[] }> {
    try {
        const apiUrl = `${CANNMENUS_BASE_URL}/v2/products?retailers=${retailerId}&search=cannabis&limit=100`; // Search returns products with brand info
        const res = await fetch(apiUrl, {
            headers: {
                'X-Token': CANNMENUS_API_KEY || '',
                'Accept': 'application/json'
            }
        });

        if (!res.ok) {
            return { error: `API Error: ${res.statusText}`, products: [] };
        }

        const data = await res.json();
        const products = data.data?.products || [];
        // DEBUG
        if (products.length === 0) {
            console.log('DEBUG: data keys:', Object.keys(data));
            if (data.data) console.log('DEBUG: data.data keys:', Object.keys(data.data));
        }
        return { products };
    } catch (e: any) {
        return { error: e.message, products: [] };
    }
}

async function main() {
    const dispensariesPath = path.resolve(process.cwd(), 'dev/discovered_dispensaries.json');
    const brandsPath = path.resolve(process.cwd(), 'dev/discovered_brands.json');

    // 1. Load Dispensaries
    if (!fs.existsSync(dispensariesPath)) {
        log('Error: discovered_dispensaries.json not found. Run scan_locations.ts first.');
        return;
    }
    const dispensaries: DiscoveredDispensary[] = JSON.parse(fs.readFileSync(dispensariesPath, 'utf-8'));

    // 2. Group by City
    const cityGroups = new Map<string, DiscoveredDispensary[]>();
    dispensaries.forEach(d => {
        const key = `${d.city}|${d.state}`; // Case sensitive logic? Assume data is normalized or handle it
        if (!cityGroups.has(key)) {
            cityGroups.set(key, []);
        }
        cityGroups.get(key)?.push(d);
    });

    log(`Loaded ${dispensaries.length} dispensaries from ${cityGroups.size} cities.`);

    // 3. Scan Brands (City Sampling)
    let processedCities = 0;
    let apiCalls = 0;
    const discoveredBrands = new Map<string, DiscoveredBrand>(); // Key: slug

    const SAMPLE_SIZE = 2; // Scan max 2 dispensaries per city to infer brand presence

    for (const [cityKey, disps] of Array.from(cityGroups.entries())) {
        if (processedCities >= MAX_CITIES_TO_SCAN) break;

        log(`Scanning city: ${cityKey} (${disps.length} dispensaries)`);

        // Pick sample
        const sample = disps.slice(0, SAMPLE_SIZE);

        for (const disp of sample) {
            // Rate Limit
            if (apiCalls > 0 && apiCalls % 10 === 0) {
                await new Promise(r => setTimeout(r, 1000));
            }

            const { error, products } = await getRetailerMenu(disp.id);
            apiCalls++;

            if (error) {
                log(`  Error scanning dispensary ${disp.id}: ${error}`);
                continue;
            }

            // Extract Brands
            let brandsFound = 0;
            for (const p of products) {
                const bName = p.brand_name;
                if (bName) {
                    const slug = slugify(bName);
                    if (!discoveredBrands.has(slug)) {
                        discoveredBrands.set(slug, {
                            name: bName,
                            slug,
                            foundInCities: [cityKey],
                            sampleRetailerIds: [disp.id]
                        });
                    } else {
                        const brand = discoveredBrands.get(slug)!;
                        if (!brand.foundInCities.includes(cityKey)) {
                            brand.foundInCities.push(cityKey);
                        }
                        if (!brand.sampleRetailerIds.includes(disp.id)) {
                            brand.sampleRetailerIds.push(disp.id);
                        }
                    }
                    brandsFound++;
                }
            }
            log(`  Found ${brandsFound} products -> Extracted brands from dispensary ${disp.id}`);
        }

        processedCities++;
    }

    // 4. Save Output
    const brandsArray = Array.from(discoveredBrands.values());
    fs.writeFileSync(brandsPath, JSON.stringify(brandsArray, null, 2));

    log(`Scan Complete.`);
    log(`Total API Calls: ${apiCalls}`);
    log(`Total Brands Discovered: ${brandsArray.length}`);
    log(`Saved to ${brandsPath}`);
}

main().catch(e => {
    console.error(e);
    log('Fatal Error: ' + e);
});
