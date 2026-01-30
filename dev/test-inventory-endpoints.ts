/**
 * Test Alleaves inventory endpoints to find product data
 */

async function testInventoryEndpoints() {
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

    // Test 1: POS Configuration (might include product catalog)
    console.log('📦 TEST 1: POS Configuration');
    console.log('─'.repeat(70));
    try {
        const response = await fetch(`${baseUrl}/pos/configuration`, { headers });
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Success! Keys:', Object.keys(data).join(', '));

            // Check for product-related data
            if (data.products || data.items || data.catalog) {
                console.log('🎉 Found product data!');
                const products = data.products || data.items || data.catalog;
                if (Array.isArray(products)) {
                    console.log(`   Found ${products.length} products`);
                    if (products[0]) {
                        console.log('   Sample:', JSON.stringify(products[0], null, 2).substring(0, 500));
                    }
                }
            } else {
                console.log('   Data structure:', JSON.stringify(data, null, 2).substring(0, 500));
            }
        } else {
            console.log(`❌ ${response.status}:`, await response.text());
        }
    } catch (error) {
        console.log('Error:', error);
    }

    // Test 2: Inventory Areas
    console.log('\n📦 TEST 2: Inventory Areas');
    console.log('─'.repeat(70));
    try {
        const response = await fetch(`${baseUrl}/inventory/area`, { headers });
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Success!');

            if (Array.isArray(data)) {
                console.log(`   Found ${data.length} inventory areas`);
                if (data[0]) {
                    console.log('   First area:', JSON.stringify(data[0], null, 2).substring(0, 500));

                    // Check if areas have products
                    const areaId = data[0].id_area || data[0].id;
                    if (areaId) {
                        console.log(`\n   Testing area grid for area ${areaId}...`);
                        const gridResponse = await fetch(
                            `${baseUrl}/inventory/area/open_grid/${areaId}`,
                            { headers }
                        );
                        if (gridResponse.ok) {
                            const gridData = await gridResponse.json();
                            console.log('   ✅ Grid data:', JSON.stringify(gridData, null, 2).substring(0, 800));
                        }
                    }
                }
            } else {
                console.log('   Data:', JSON.stringify(data, null, 2).substring(0, 500));
            }
        } else {
            console.log(`❌ ${response.status}:`, await response.text());
        }
    } catch (error) {
        console.log('Error:', error);
    }

    // Test 3: Location Areas (might list products by location)
    console.log('\n📦 TEST 3: Location Areas');
    console.log('─'.repeat(70));
    try {
        const response = await fetch(`${baseUrl}/location/area`, { headers });
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Success!');
            console.log('   Data:', JSON.stringify(data, null, 2).substring(0, 800));
        } else {
            console.log(`❌ ${response.status}:`, await response.text());
        }
    } catch (error) {
        console.log('Error:', error);
    }

    // Test 4: Try customer endpoint to see structure
    console.log('\n📦 TEST 4: Customer Search (to understand API structure)');
    console.log('─'.repeat(70));
    try {
        const response = await fetch(`${baseUrl}/customer/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query: '' }),
        });
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Success! Structure:', JSON.stringify(data, null, 2).substring(0, 500));
        } else {
            console.log(`❌ ${response.status}`);
        }
    } catch (error) {
        console.log('Error:', error);
    }
}

testInventoryEndpoints().catch(console.error);
