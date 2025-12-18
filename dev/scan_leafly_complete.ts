
import fs from 'fs';
import path from 'path';
import https from 'https';

// --- ENV ---
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
        console.error('Error loading env:', e);
    }
};
loadEnv();

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_ACTOR_ID = '5BLF5SzgsgQjg1AES';
const MAX_STORES = 5; // Updated for sample scan as per user request
const STATE = 'Illinois';

if (!APIFY_TOKEN) {
    console.error('CRITICAL: APIFY_API_TOKEN missing.');
    process.exit(1);
}

// --- HELPERS ---
function apiCall(endpoint: string, method: string, body?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const url = `https://api.apify.com/v2${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${APIFY_TOKEN}`;
        const options: any = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 400) {
                    reject(`API Error ${res.statusCode}: ${data}`);
                } else {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        hash = (hash << 5) - hash + code;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

// --- MAIN ---
async function main() {
    console.log(`Starting Leafly Scan for ${STATE} (Max ${MAX_STORES} stores)...`);

    // 1. Trigger Run
    const input = {
        mode: 'state',
        state: STATE.toLowerCase(),
        maxStores: MAX_STORES,
        taskCount: 5, // Parallel
        proxyType: 'residential',
        includeOffers: true, // Get offers
        includeStrainData: true, // Get products (brands)
        outputFormat: 'dataset'
    };

    let runId = '';
    try {
        const run = await apiCall(`/acts/${APIFY_ACTOR_ID}/runs`, 'POST', input);
        // The API response for run trigger varies slightly for acts vs tasks?
        // Usually data.id
        runId = run.data.id;
        console.log(`Run started: ${runId}`);
    } catch (e) {
        console.error('Failed to start run:', e);
        process.exit(1);
    }

    // 2. Poll
    let status = 'RUNNING';
    while (status === 'RUNNING' || status === 'READY') {
        await sleep(10000); // 10s polling
        const check = await apiCall(`/actor-runs/${runId}`, 'GET');
        status = check.data.status;
        console.log(`Status: ${status} | Duration: ${check.data.stats?.runTimeSecs || 0}s`);
    }

    if (status !== 'SUCCEEDED') {
        console.error(`Run failed with status: ${status}`);
        process.exit(1);
    }

    // 3. Fetch Dataset
    console.log('Fetching dataset...');
    const runInfo = await apiCall(`/actor-runs/${runId}`, 'GET');
    const datasetId = runInfo.data.defaultDatasetId;
    const items = await apiCall(`/datasets/${datasetId}/items`, 'GET');

    console.log(`Fetched ${items.length} items.`);

    // 4. Process
    const dispensaries = new Map<string, any>();
    const brands = new Map<string, any>();

    items.forEach((item: any) => {
        // Dispensary
        if (item.type === 'dispensary' || item.dispensary_name) {
            const name = item.name || item.dispensary_name;
            const slug = item.slug || (name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'unknown');
            const id = hashCode(slug); // Numeric ID simulation

            if (!dispensaries.has(String(id))) {
                dispensaries.set(String(id), {
                    id: id,
                    leaflyId: slug, // Keep slug
                    name: name,
                    city: item.city,
                    state: item.state,
                    address: item.address,
                    zip: item.zip_code,
                    rating: item.rating,
                    leaves: item.review_count,
                    lastViewedAt: null // Match new interface
                });
            }
        }

        // Product (Brand discovery)
        if (item.type === 'product' || (item.product_name && item.brand_name)) {
            const brandName = item.brand_name || item.brand;
            if (brandName) {
                const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const dispensaryName = item.dispensary_name || item.store_name;
                const dispSlug = dispensaryName ? dispensaryName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'unknown';
                const dispId = hashCode(dispSlug);

                if (!brands.has(brandSlug)) {
                    brands.set(brandSlug, {
                        name: brandName,
                        slug: brandSlug,
                        foundInCities: new Set(),
                        sampleRetailerIds: new Set()
                    });
                }

                const b = brands.get(brandSlug);
                b.sampleRetailerIds.add(dispId);
            }
        }
    });

    // 5. Save
    const dispsArray = Array.from(dispensaries.values());
    fs.writeFileSync(path.resolve(process.cwd(), 'dev/discovered_dispensaries.json'), JSON.stringify(dispsArray, null, 2));
    console.log(`Saved ${dispsArray.length} dispensaries.`);

    const brandsArray = Array.from(brands.values()).map(b => ({
        ...b,
        foundInCities: Array.from(b.foundInCities),
        sampleRetailerIds: Array.from(b.sampleRetailerIds)
    }));
    fs.writeFileSync(path.resolve(process.cwd(), 'dev/discovered_brands.json'), JSON.stringify(brandsArray, null, 2));
    console.log(`Saved ${brandsArray.length} brands.`);
}


// allow CLI execution or import
if (require.main === module) {
    main().catch(console.error);
}

export { main, apiCall };
