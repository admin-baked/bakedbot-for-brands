/**
 * Quick Dutchie API diagnostic - Testing multiple auth methods
 */

async function testAuth(name: string, headers: Record<string, string>) {
    const STORE_ID = '3af693f9-ee33-43de-9d68-2a8c25881517';
    
    console.log(`\n--- Testing: ${name} ---`);
    
    const query = `
        query CheckConnection($retailerId: ID!) {
            menu(retailerId: $retailerId) {
                products {
                    id
                    name
                }
            }
        }
    `;
    
    try {
        const response = await fetch('https://plus.dutchie.com/plus/2021-07/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify({ 
                query, 
                variables: { retailerId: STORE_ID } 
            }),
        });
        
        console.log('HTTP Status:', response.status, response.statusText);
        
        const data = await response.json();
        
        if (data.errors) {
            console.log('Error:', data.errors[0]?.message || 'Unknown error');
            console.log('Code:', data.errors[0]?.extensions?.code || 'N/A');
        }
        
        if (data.data?.menu?.products) {
            const products = data.data.menu.products;
            console.log(`✅ SUCCESS! Found ${products.length} products`);
            if (products[0]) {
                console.log(`First product: ${products[0].name}`);
            }
            return true;
        }
        return false;
    } catch (error: any) {
        console.error('Fetch error:', error.message);
        return false;
    }
}

async function main() {
    const API_KEY = '487c94ca-684f-4237-b3ef-6adb996437f1';
    const CLIENT_ID = '7ce3ca6c-ab87-479f-8a8e-cc713cbc67dd';
    const ORDER_AHEAD_CLIENT_ID = 'DuhGhnVA5nKbokCDDDtcXO3kdt8VdyzG';
    const ORDER_AHEAD_TOKEN = '6AnJC-ZcHoxbIE5IGg1kJFQtyyIDRx2Jz1cpY3eY0fwI8WldMjf6tU-2kyhNQP9s';
    
    console.log('Testing Dutchie Plus GraphQL API with multiple auth methods...\n');
    console.log('Store ID: 3af693f9-ee33-43de-9d68-2a8c25881517');
    console.log('API Key:', API_KEY.substring(0, 8) + '...');
    
    // Method 1: Bearer Token
    await testAuth('Bearer Token (API Key)', {
        'Authorization': `Bearer ${API_KEY}`,
    });
    
    // Method 2: Basic Auth (API Key as username, empty password)
    const basicAuth = Buffer.from(`${API_KEY}:`).toString('base64');
    await testAuth('Basic Auth (API Key)', {
        'Authorization': `Basic ${basicAuth}`,
    });
    
    // Method 3: Basic Auth (Client ID as username, API Key as password)
    const basicAuth2 = Buffer.from(`${CLIENT_ID}:${API_KEY}`).toString('base64');
    await testAuth('Basic Auth (Client ID : API Key)', {
        'Authorization': `Basic ${basicAuth2}`,
    });
    
    // Method 4: x-dutchie-plus-token header
    await testAuth('x-dutchie-plus-token header', {
        'x-dutchie-plus-token': API_KEY,
    });
    
    // Method 5: Order Ahead credentials as Bearer
    await testAuth('Bearer (Order Ahead Token)', {
        'Authorization': `Bearer ${ORDER_AHEAD_TOKEN}`,
    });
    
    // Method 6: Order Ahead Basic Auth
    const basicAuth3 = Buffer.from(`${ORDER_AHEAD_CLIENT_ID}:${ORDER_AHEAD_TOKEN}`).toString('base64');
    await testAuth('Basic Auth (Order Ahead Client : Token)', {
        'Authorization': `Basic ${basicAuth3}`,
    });
    
    console.log('\n--- Done ---');
}

main();
