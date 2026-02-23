const API_BASE = 'https://api.dispenseapp.com';
const VENUE_ID = '13455748f2d363fd';
const API_KEY = '49dac8e0-7743-11e9-8e3f-a5601eb2e936';
const PROSPECT = '7ea68582-80ef-4885-8f75-d0c78dcc90a3';

const resp = await fetch(
    `${API_BASE}/v1/venues/${VENUE_ID}/product-categories/778d114c5cfe6f27/products?skip=0&limit=5&orderPickUpType=IN_STORE`,
    {
        headers: {
            'Accept': 'application/json',
            'api-key': API_KEY,
            'x-prospect-token': PROSPECT,
            'Origin': 'https://thrivesyracuse.com',
            'Referer': 'https://thrivesyracuse.com/menu',
        }
    }
);

const body = await resp.json();
const products = Array.isArray(body) ? body : body.products || body.data || [];
console.log(`Total products: ${products.length}`);

if (products.length > 0) {
    const p = products[0];
    console.log('\nProduct keys:', Object.keys(p).join(', '));
    console.log('Name:', p.name);

    // Find all fields containing URLs
    const urlFields = [];
    const findUrls = (obj, path = '') => {
        if (!obj || typeof obj !== 'object') return;
        for (const [k, v] of Object.entries(obj)) {
            const fullPath = path ? `${path}.${k}` : k;
            if (typeof v === 'string' && (v.includes('http') || v.includes('imgix'))) {
                urlFields.push(`${fullPath}: ${v.slice(0, 100)}`);
            } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                findUrls(v, fullPath);
            } else if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
                findUrls(v[0], `${fullPath}[0]`);
            }
        }
    };
    findUrls(p);

    console.log('\nURL fields:');
    urlFields.forEach(f => console.log(' ', f));

    console.log('\nFull first product (stripped):');
    const stripped = JSON.parse(JSON.stringify(p));
    // Remove large arrays for readability
    for (const k of Object.keys(stripped)) {
        if (Array.isArray(stripped[k]) && stripped[k].length > 3) {
            stripped[k] = `[${stripped[k].length} items...]`;
        }
    }
    console.log(JSON.stringify(stripped, null, 2).slice(0, 3000));
}
