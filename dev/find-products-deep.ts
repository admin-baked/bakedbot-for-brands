/**
 * Deep search for product data in Alleaves API
 */

async function findProducts() {
    const username = 'bakedbotai@thrivesyracuse.com';
    const password = 'Dreamchasing2030!!@@!!';
    const pin = '1234';
    const locationId = '1000';
    const baseUrl = 'https://app.alleaves.com/api';

    // Authenticate
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

    // Try various product-related endpoints that might exist
    const endpoints = [
        // Direct product attempts
        '/product',
        '/products',
        '/item',
        '/items',
        '/catalog',
        '/menu',
        '/inventory/product',
        '/inventory/products',
        '/inventory/item',
        '/inventory/items',

        // Location-based product attempts
        `/location/${locationId}/product`,
        `/location/${locationId}/products`,
        `/location/${locationId}/items`,
        `/location/${locationId}/catalog`,
        `/location/${locationId}/menu`,

        // POS-based
        '/pos/products',
        '/pos/items',
        '/pos/catalog',
        '/pos/menu',

        // Sales/order related (might show available products)
        '/pos/order',
        '/pos/orders',

        // Inventory grid (area 1002 from previous test)
        '/inventory/area/open_grid/1002',
    ];

    console.log('🔍 Searching for product endpoints...\n');

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(`${baseUrl}${endpoint}`, { headers });

            if (response.ok) {
                const text = await response.text();
                let data;
                try {
                    data = JSON.parse(text);
                    console.log(`✅ ${endpoint}`);
                    console.log(`   Type: ${Array.isArray(data) ? `Array[${data.length}]` : typeof data}`);

                    if (Array.isArray(data) && data.length > 0) {
                        console.log(`   First item keys:`, Object.keys(data[0]).slice(0, 15).join(', '));

                        // Check if this looks like product data
                        const item = data[0];
                        if (item.name || item.product_name || item.description || item.price || item.sku) {
                            console.log(`   🎉 LOOKS LIKE PRODUCTS!`);
                            console.log(`   Sample:`, JSON.stringify(item, null, 2).substring(0, 600));
                            break; // Found it!
                        }
                    } else if (typeof data === 'object' && data !== null) {
                        const keys = Object.keys(data).slice(0, 20);
                        console.log(`   Keys:`, keys.join(', '));

                        // Check for nested product data
                        if (data.products || data.items || data.menu || data.catalog) {
                            const productList = data.products || data.items || data.menu || data.catalog;
                            console.log(`   🎉 Found product list! Length: ${productList.length}`);
                            if (productList[0]) {
                                console.log(`   Sample:`, JSON.stringify(productList[0], null, 2).substring(0, 600));
                            }
                            break;
                        }
                    }

                    console.log('');
                } catch {
                    console.log(`✅ ${endpoint} (non-JSON)`);
                }
            } else if (response.status !== 404) {
                // console.log(`❌ ${endpoint}: ${response.status}`);
            }
        } catch (error) {
            // Silent
        }
    }

    // Also try getting the full location data which might include a product catalog
    console.log('\n📍 Checking full location data...');
    try {
        const response = await fetch(`${baseUrl}/location`, { headers });
        if (response.ok) {
            const locations = await response.json();
            console.log('✅ Got location data');

            // Save to file for inspection
            const fs = await import('fs');
            fs.writeFileSync('alleaves-location-full.json', JSON.stringify(locations, null, 2));
            console.log('   Saved to: alleaves-location-full.json');

            // Check if there's any product reference
            const jsonStr = JSON.stringify(locations);
            if (jsonStr.includes('product') || jsonStr.includes('item') || jsonStr.includes('catalog')) {
                console.log('   🔍 Found product references in location data!');
            }
        }
    } catch (error) {
        console.log('Error:', error);
    }
}

findProducts().catch(console.error);
