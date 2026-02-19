/**
 * Test: WeedMaps __NEXT_DATA__ extraction
 *
 * Tests whether we can pull product images from WeedMaps web pages
 * without using their dead REST API.
 *
 * Run: node scripts/test-weedmaps-web-scrape.mjs
 */

const WM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
};

function extractNextData(html) {
    try {
        const match = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/);
        if (!match?.[1]) return null;
        return JSON.parse(match[1]);
    } catch (e) {
        return null;
    }
}

function findProductsInJson(obj, depth = 0, results = []) {
    if (depth > 10 || !obj || typeof obj !== 'object') return results;

    if (Array.isArray(obj)) {
        for (const item of obj) {
            const product = tryExtractProduct(item);
            if (product) {
                results.push(product);
            } else {
                findProductsInJson(item, depth + 1, results);
            }
        }
    } else {
        for (const val of Object.values(obj)) {
            findProductsInJson(val, depth + 1, results);
        }
    }
    return results;
}

function tryExtractProduct(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;

    const name = typeof obj.name === 'string' ? obj.name.trim() : '';
    if (!name || name.length < 2) return null;

    let imageUrl = null;

    if (Array.isArray(obj.photos) && obj.photos.length > 0) {
        const photo = obj.photos[0];
        const urls = photo?.urls;
        imageUrl = urls?.large || urls?.medium || urls?.original || photo?.url || null;
    }
    if (!imageUrl && obj.avatar_image) {
        imageUrl = obj.avatar_image?.original_url || obj.avatar_image?.small_url || null;
    }
    if (!imageUrl) {
        imageUrl = (typeof obj.image_url === 'string' ? obj.image_url : null)
            || (typeof obj.imageUrl === 'string' ? obj.imageUrl : null);
    }
    if (!imageUrl && Array.isArray(obj.images) && obj.images.length > 0) {
        const img = obj.images[0];
        imageUrl = img?.url || img?.src || null;
    }

    if (!imageUrl || !imageUrl.startsWith('http')) return null;

    let brand = '';
    if (obj.brand && typeof obj.brand === 'object') {
        brand = obj.brand?.name?.trim() || '';
    } else if (typeof obj.brand === 'string') {
        brand = obj.brand.trim();
    } else if (typeof obj.brand_name === 'string') {
        brand = obj.brand_name.trim();
    }

    let category = 'Other';
    if (obj.category && typeof obj.category === 'object') {
        category = obj.category?.name?.trim() || 'Other';
    } else if (typeof obj.category === 'string') {
        category = obj.category.trim();
    }

    return { name, brand, category, imageUrl };
}

async function testUrl(label, url) {
    console.log(`\n📡 ${label}`);
    console.log(`   URL: ${url}`);
    try {
        const resp = await fetch(url, { headers: WM_HEADERS });
        console.log(`   Status: ${resp.status} ${resp.statusText}`);

        if (!resp.ok) {
            console.log(`   ❌ Non-OK response`);
            return;
        }

        const html = await resp.text();
        console.log(`   HTML length: ${html.length.toLocaleString()} chars`);

        // Check for __NEXT_DATA__
        const hasNextData = html.includes('__NEXT_DATA__');
        console.log(`   Has __NEXT_DATA__: ${hasNextData ? '✅ YES' : '❌ NO'}`);

        if (hasNextData) {
            const nextData = extractNextData(html);
            if (nextData) {
                const topKeys = Object.keys(nextData).join(', ');
                console.log(`   __NEXT_DATA__ top keys: ${topKeys}`);

                // Show structure depth
                const props = nextData.props;
                if (props && typeof props === 'object') {
                    console.log(`   props keys: ${Object.keys(props).join(', ')}`);
                    const pageProps = props.pageProps;
                    if (pageProps && typeof pageProps === 'object') {
                        console.log(`   pageProps keys: ${Object.keys(pageProps).join(', ')}`);
                    }
                }

                // Try to find products
                const products = findProductsInJson(nextData);
                console.log(`   Products with images found: ${products.length}`);
                if (products.length > 0) {
                    console.log(`   First 3 products:`);
                    for (const p of products.slice(0, 3)) {
                        console.log(`     - ${p.brand || '(no brand)'} / ${p.name}`);
                        console.log(`       Image: ${p.imageUrl.substring(0, 80)}...`);
                    }
                }

                // Show raw JSON structure for first listing/menu_item if any
                const jsonStr = JSON.stringify(nextData).substring(0, 500);
                console.log(`   JSON preview: ${jsonStr}...`);
            } else {
                console.log(`   ❌ Could not parse __NEXT_DATA__ JSON`);
            }
        }

        // Check for any image URLs in the HTML
        const imageMatches = html.match(/https:\/\/[^"'\s]+\.(jpg|jpeg|png|webp)/gi) || [];
        const cannabisImages = imageMatches.filter(u =>
            u.includes('weedmaps') || u.includes('iheartjane') || u.includes('dutchie') || u.includes('leafly')
        );
        console.log(`   Cannabis CDN images found in HTML: ${cannabisImages.length}`);
        if (cannabisImages.length > 0) {
            console.log(`   Sample: ${cannabisImages[0]}`);
        }

    } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
    }
}

console.log('🌿 WeedMaps Web Scraping Diagnostic\n' + '─'.repeat(60));

// Test Thrive's WeedMaps menu page
await testUrl(
    'Test 1: Thrive Syracuse — dispensary page',
    'https://weedmaps.com/dispensaries/thrive-cannabis-marketplace-syracuse'
);

await testUrl(
    'Test 2: Thrive Syracuse — /menu path',
    'https://weedmaps.com/dispensaries/thrive-cannabis-marketplace-syracuse/menu'
);

// Test NY listings page
await testUrl(
    'Test 3: NY listings page (new URL format)',
    'https://weedmaps.com/dispensaries/us/new-york'
);

await testUrl(
    'Test 4: NY listings (legacy)',
    'https://weedmaps.com/dispensaries/new-york'
);

// Test a single known product URL
await testUrl(
    'Test 5: WeedMaps strain/product page',
    'https://weedmaps.com/products/flower'
);

console.log('\n✅ Diagnostic complete');
