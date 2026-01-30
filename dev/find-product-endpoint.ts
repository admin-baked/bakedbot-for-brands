/**
 * Find the correct product endpoint for Alleaves
 */

async function findProductEndpoint() {
    const username = 'bakedbotai@thrivesyracuse.com';
    const password = 'Dreamchasing2030!!@@!!';
    const pin = '1234';
    const locationId = '1000';
    const baseUrl = 'https://app.alleaves.com/api';

    // Authenticate
    console.log('🔐 Authenticating...');
    const authResponse = await fetch(`${baseUrl}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, pin }),
    });
    const authData = await authResponse.json();
    const token = authData.token;
    console.log('✅ Authenticated\n');

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    // Try different product endpoint patterns
    const endpoints = [
        // Direct product endpoints
        '/product',
        '/products',
        '/item',
        '/items',
        '/menu',

        // Location-based
        `/location/${locationId}/product`,
        `/location/${locationId}/products`,
        `/location/${locationId}/items`,
        `/location/${locationId}/menu`,

        // Inventory
        `/location/${locationId}/inventory`,
        `/inventory`,

        // Catalog
        '/catalog',
        `/catalog/${locationId}`,
    ];

    console.log('🔍 Testing product endpoint patterns...\n');

    for (const endpoint of endpoints) {
        const url = `${baseUrl}${endpoint}`;
        try {
            console.log(`Testing GET ${endpoint}`);
            const response = await fetch(url, { headers });

            if (response.ok) {
                const text = await response.text();
                let data;
                try {
                    data = JSON.parse(text);
                    console.log(`  ✅ ${response.status} - SUCCESS!`);
                    console.log(`  Response type:`, Array.isArray(data) ? `Array[${data.length}]` : typeof data);

                    if (Array.isArray(data) && data.length > 0) {
                        console.log(`  Sample item keys:`, Object.keys(data[0]).join(', '));
                        console.log(`  First item:`, JSON.stringify(data[0], null, 2).substring(0, 300));
                    } else if (typeof data === 'object') {
                        console.log(`  Response keys:`, Object.keys(data).join(', '));
                        if (data.data || data.products || data.items) {
                            const items = data.data || data.products || data.items;
                            if (Array.isArray(items) && items.length > 0) {
                                console.log(`  Found ${items.length} items`);
                                console.log(`  Sample item:`, JSON.stringify(items[0], null, 2).substring(0, 300));
                            }
                        }
                    }
                    console.log('');
                    break; // Found it!
                } catch {
                    console.log(`  ✅ ${response.status} - Non-JSON response:`, text.substring(0, 100));
                }
            } else {
                if (response.status !== 404) {
                    console.log(`  ❌ ${response.status} - ${response.statusText}`);
                }
            }
        } catch (error) {
            console.log(`  ⚠️  Error:`, error instanceof Error ? error.message : String(error));
        }
    }
}

findProductEndpoint().catch(console.error);
