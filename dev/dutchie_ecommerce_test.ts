/**
 * Dutchie Ecommerce API Diagnostic
 * Testing various Dutchie endpoints to find working menu access
 */

async function testEndpoint(name: string, url: string, options: RequestInit = {}) {
    console.log(`\n--- Testing: ${name} ---`);
    console.log(`URL: ${url}`);
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers,
            },
        });
        
        console.log('HTTP Status:', response.status, response.statusText);
        
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
            const data = await response.json();
            
            if (data.errors) {
                console.log('Error:', data.errors[0]?.message || JSON.stringify(data.errors));
            } else {
                console.log('✅ SUCCESS!');
                // Show a sample of the data
                const preview = JSON.stringify(data, null, 2).substring(0, 500);
                console.log('Preview:', preview + (preview.length >= 500 ? '...' : ''));
            }
            return data;
        } else {
            const text = await response.text();
            console.log('Non-JSON response:', text.substring(0, 200));
        }
    } catch (error: any) {
        console.error('Error:', error.message);
    }
    return null;
}

async function main() {
    const RETAILER_ID = '3af693f9-ee33-43de-9d68-2a8c25881517';
    const CLIENT_ID = '7ce3ca6c-ab87-479f-8a8e-cc713cbc67dd';
    const API_KEY = '487c94ca-684f-4237-b3ef-6adb996437f1';
    const ORDER_AHEAD_CLIENT_ID = 'DuhGhnVA5nKbokCDDDtcXO3kdt8VdyzG';
    const ORDER_AHEAD_TOKEN = '6AnJC-ZcHoxbIE5IGg1kJFQtyyIDRx2Jz1cpY3eY0fwI8WldMjf6tU-2kyhNQP9s';
    
    console.log('Testing Dutchie APIs for menu access...');
    console.log('Retailer ID:', RETAILER_ID);
    
    // 1. Public Embedded Menu GraphQL (no auth - used by dutchie storefronts)
    const publicMenuQuery = `
        query GetMenu($retailerId: ID!) {
            menu(retailerId: $retailerId) {
                products {
                    id
                    name
                    brand { name }
                    category
                }
            }
        }
    `;
    
    // Test 1: Public API endpoint (no auth)
    await testEndpoint(
        'Public GraphQL (dutchie.com/graphql)',
        'https://dutchie.com/graphql',
        {
            method: 'POST',
            body: JSON.stringify({
                query: publicMenuQuery,
                variables: { retailerId: RETAILER_ID }
            })
        }
    );
    
    // Test 2: Plus Public API
    await testEndpoint(
        'Plus Public GraphQL',
        'https://plus.dutchie.com/plus/2021-07/graphql',
        {
            method: 'POST',
            body: JSON.stringify({
                query: publicMenuQuery,
                variables: { retailerId: RETAILER_ID }
            })
        }
    );
    
    // Test 3: Order Ahead endpoint with client credentials
    const authHeader = `Basic ${Buffer.from(`${ORDER_AHEAD_CLIENT_ID}:${ORDER_AHEAD_TOKEN}`).toString('base64')}`;
    await testEndpoint(
        'Order Ahead GraphQL (with credentials)',
        'https://plus.dutchie.com/plus/2021-07/graphql',
        {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
            },
            body: JSON.stringify({
                query: publicMenuQuery,
                variables: { retailerId: RETAILER_ID }
            })
        }
    );
    
    // Test 4: Dutchie embed REST API
    await testEndpoint(
        'Embed Menu REST API',
        `https://dutchie.com/api/v2/menu/${RETAILER_ID}`
    );
    
    // Test 5: Alternative Plus API endpoint format
    await testEndpoint(
        'Alternative Plus endpoint',
        `https://api.dutchie.com/v1/retailers/${RETAILER_ID}/menu`
    );
    
    // Test 6: Public storefront API
    await testEndpoint(
        'Storefront Menu API',
        `https://dutchie.com/api/consumer/v1/dispensary/${RETAILER_ID}/menu`
    );
    
    console.log('\n--- Testing Complete ---');
}

main();
