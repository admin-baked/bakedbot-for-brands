/**
 * Dutchie Plus GraphQL - Test Product and Public Access
 */

const DUTCHIE_PLUS_GRAPHQL = 'https://plus.dutchie.com/plus/2021-07/graphql';
const STORE_ID = '3af693f9-ee33-43de-9d68-2a8c25881517';
const API_KEY = '487c94ca-684f-4237-b3ef-6adb996437f1';

// Also try the public/consumer endpoint
const DUTCHIE_PUBLIC_GRAPHQL = 'https://dutchie.com/graphql';

async function testQuery(endpoint: string, name: string, query: string, variables: any = {}, auth: boolean = true) {
    console.log(`\n=== ${name} ===`);
    console.log(`Endpoint: ${endpoint.substring(0, 40)}...`);
    console.log(`Auth: ${auth ? 'Bearer token' : 'None'}`);
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (auth) {
        headers['Authorization'] = `Bearer ${API_KEY}`;
    }
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query, variables }),
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        const text = await response.text();
        
        try {
            const json = JSON.parse(text);
            if (json.errors) {
                console.log('Error:', json.errors[0]?.message);
                console.log('Code:', json.errors[0]?.extensions?.code);
            }
            if (json.data) {
                const dataStr = JSON.stringify(json.data, null, 2);
                console.log('Data:', dataStr.substring(0, 800));
                if (dataStr.length > 800) console.log('...(truncated)');
            }
            return json;
        } catch (e) {
            console.log('Non-JSON:', text.substring(0, 200));
        }
    } catch (e: any) {
        console.error('Fetch Error:', e.message);
    }
    return null;
}

async function main() {
    console.log('Dutchie GraphQL - Testing Alternative Approaches');
    console.log('Store ID:', STORE_ID);

    // Test 1: Product query with productId (need to know an ID though)
    await testQuery(DUTCHIE_PLUS_GRAPHQL, 'Product by Retailer (customers query)', `
        query GetCustomers($retailerId: ID!) {
            customers(retailerId: $retailerId, pagination: { limit: 1 }) {
                edges {
                    node {
                        id
                        firstName
                    }
                }
            }
        }
    `, { retailerId: STORE_ID }, true);

    // Test 2: Orders query
    await testQuery(DUTCHIE_PLUS_GRAPHQL, 'Orders', `
        query GetOrders($retailerId: ID!) {
            orders(retailerId: $retailerId, pagination: { limit: 1 }) {
                edges {
                    node {
                        id
                        total
                    }
                }
            }
        }
    `, { retailerId: STORE_ID }, true);

    // Test 3: Collection query (may contain products)
    await testQuery(DUTCHIE_PLUS_GRAPHQL, 'Collection', `
        query GetCollection($retailerId: ID!) {
            collection(retailerId: $retailerId, collectionId: "featured") {
                id
                title
            }
        }
    `, { retailerId: STORE_ID }, true);

    // Test 4: Product availability 
    await testQuery(DUTCHIE_PLUS_GRAPHQL, 'Product Availability', `
        query CheckAvailability($retailerId: ID!, $productId: ID!) {
            productAvailabilityByRetailer(retailerId: $retailerId, productId: $productId) {
                available
                quantity
            }
        }
    `, { retailerId: STORE_ID, productId: 'test-product' }, true);

    // Test 5: Public GraphQL (no auth) - consumer-facing menu
    await testQuery(DUTCHIE_PUBLIC_GRAPHQL, 'Public Menu (No Auth)', `
        query GetPublicMenu($retailerId: ID!) {
            menu(retailerId: $retailerId) {
                products {
                    id
                    name
                }
            }
        }
    `, { retailerId: STORE_ID }, false);

    // Test 6: Public GraphQL with dispensary query
    await testQuery(DUTCHIE_PUBLIC_GRAPHQL, 'Public Dispensary Info (No Auth)', `
        query GetDispensary($id: ID!) {
            dispensary(id: $id) {
                id
                name
                menuTypes
            }
        }
    `, { id: STORE_ID }, false);

    console.log('\n=== Done ===');
}

main();
