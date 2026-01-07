/**
 * Test Dutchie POS API (api.pos.dutchie.com) - Correct endpoints
 */

const API_KEY = '487c94ca-684f-4237-b3ef-6adb996437f1';

// Basic auth with API key as username, empty password
const basicAuth = Buffer.from(`${API_KEY}:`).toString('base64');

async function testEndpoint(name: string, url: string) {
    console.log(`\n=== ${name} ===`);
    console.log(`URL: ${url}`);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${basicAuth}`,
            },
        });
        
        console.log(`Status: ${response.status} ${response.statusText}`);
        
        const text = await response.text();
        
        try {
            const data = JSON.parse(text);
            
            if (response.status >= 400) {
                console.log(`Error: ${data.message || JSON.stringify(data)}`);
            } else {
                console.log('✅ SUCCESS!');
                if (Array.isArray(data)) {
                    console.log(`Found ${data.length} items`);
                    if (data[0]) {
                        console.log('First item:', JSON.stringify(data[0], null, 2).substring(0, 300));
                    }
                } else {
                    console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500));
                }
            }
            return data;
        } catch (e) {
            console.log('Non-JSON response:', text.substring(0, 200));
        }
    } catch (error: any) {
        console.log(`Error: ${error.message}`);
    }
    return null;
}

async function main() {
    console.log('Testing Dutchie POS API (api.pos.dutchie.com)');
    console.log(`API Key: ${API_KEY.substring(0, 8)}...`);
    console.log(`Auth: Basic (API key as username, empty password)`);
    console.log(`Header: Authorization: Basic ${basicAuth.substring(0, 20)}...`);

    // Test the correct endpoints (no /v1/ prefix)
    await testEndpoint('WhoAmI (Location Identity)', 'https://api.pos.dutchie.com/whoami');
    
    await testEndpoint('Products (Menu)', 'https://api.pos.dutchie.com/products');
    
    await testEndpoint('Inventory (Stock)', 'https://api.pos.dutchie.com/inventory');
    
    await testEndpoint('Product Categories', 'https://api.pos.dutchie.com/product-category');
    
    await testEndpoint('Reporting Products', 'https://api.pos.dutchie.com/reporting/products');

    console.log('\n=== Done ===');
}

main();
