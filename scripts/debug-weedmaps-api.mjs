/**
 * Debug: Test WeedMaps API directly to see what it returns
 * Run: node scripts/debug-weedmaps-api.mjs
 */

const WM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://weedmaps.com/',
    'Origin': 'https://weedmaps.com',
};

async function test(label, url) {
    console.log(`\n📡 ${label}`);
    console.log(`   URL: ${url}`);
    try {
        const resp = await fetch(url, { headers: WM_HEADERS });
        console.log(`   Status: ${resp.status} ${resp.statusText}`);
        const contentType = resp.headers.get('content-type') || '';
        console.log(`   Content-Type: ${contentType}`);

        const text = await resp.text();
        if (contentType.includes('json')) {
            try {
                const json = JSON.parse(text);
                console.log(`   Response keys: ${Object.keys(json).join(', ')}`);
                if (json.data) console.log(`   data keys: ${Object.keys(json.data).join(', ')}`);
                if (json.data?.listings) console.log(`   listings count: ${json.data.listings.length}`);
                if (json.errors) console.log(`   errors: ${JSON.stringify(json.errors)}`);
                // Print first listing if any
                if (json.data?.listings?.length > 0) {
                    console.log(`   First listing: ${JSON.stringify(json.data.listings[0]).substring(0, 200)}`);
                }
            } catch (e) {
                console.log(`   Parse error: ${e.message}`);
                console.log(`   Raw (first 300): ${text.substring(0, 300)}`);
            }
        } else {
            console.log(`   Body (first 300): ${text.substring(0, 300)}`);
        }
    } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
    }
}

console.log('🔍 WeedMaps API Diagnostic\n' + '─'.repeat(60));

// Test 1: NY dispensaries (our current URL)
await test(
    'Test 1: Discovery v1 listings (current URL)',
    'https://api.weedmaps.com/discovery/v1/listings?filter[state_abbreviation]=NY&filter[license_type]=dispensary&filter[status]=open&page[limit]=5&page[offset]=0'
);

// Test 2: Without license_type filter
await test(
    'Test 2: Without license_type filter',
    'https://api.weedmaps.com/discovery/v1/listings?filter[state_abbreviation]=NY&page[limit]=5&page[offset]=0'
);

// Test 3: Without status filter
await test(
    'Test 3: Without any filters, just NY',
    'https://api.weedmaps.com/discovery/v1/listings?filter[state_abbreviation]=NY&page[limit]=5'
);

// Test 4: v2 listings endpoint
await test(
    'Test 4: v2 endpoint',
    'https://api.weedmaps.com/discovery/v2/listings?filter[state_abbreviation]=NY&page[limit]=5'
);

// Test 5: Web API (used by weedmaps.com website)
await test(
    'Test 5: Web API v2',
    'https://weedmaps.com/api/web/v2/listings?filter[state_abbreviation]=NY&page[limit]=5'
);

// Test 6: Their known brand endpoint
await test(
    'Test 6: Single dispensary menu',
    'https://api.weedmaps.com/discovery/v1/listings/thrive-cannabis-marketplace-syracuse/menu_items?page[limit]=3'
);

console.log('\n✅ Diagnostic complete');
