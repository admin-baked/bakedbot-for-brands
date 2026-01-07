/**
 * Dutchie Plus GraphQL - Debug Query
 */

const DUTCHIE_PLUS_GRAPHQL = 'https://plus.dutchie.com/plus/2021-07/graphql';
const STORE_ID = '3af693f9-ee33-43de-9d68-2a8c25881517';
const API_KEY = '487c94ca-684f-4237-b3ef-6adb996437f1';

async function testQuery(name: string, query: string, variables: any = {}) {
    console.log(`\n=== ${name} ===`);
    
    try {
        const response = await fetch(DUTCHIE_PLUS_GRAPHQL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({ query, variables }),
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        const json = await response.json();
        
        if (json.errors) {
            console.log('GraphQL Errors:', JSON.stringify(json.errors, null, 2));
        }
        
        if (json.data) {
            console.log('Data:', JSON.stringify(json.data, null, 2).substring(0, 1000));
        }
        
        return json;
    } catch (e: any) {
        console.error('Error:', e.message);
        return null;
    }
}

async function main() {
    console.log('Dutchie Plus GraphQL Debug');
    console.log('Endpoint:', DUTCHIE_PLUS_GRAPHQL);
    console.log('Store ID:', STORE_ID);
    console.log('API Key:', API_KEY.substring(0, 12) + '...');

    // Test 1: Basic menu query
    await testQuery('Menu Query', `
        query GetMenu($retailerId: ID!) {
            menu(retailerId: $retailerId) {
                products {
                    id
                    name
                }
            }
        }
    `, { retailerId: STORE_ID });

    // Test 2: Get retailer info
    await testQuery('Retailer Info', `
        query GetRetailer($retailerId: ID!) {
            retailer(id: $retailerId) {
                id
                name
                address {
                    city
                    state
                }
            }
        }
    `, { retailerId: STORE_ID });

    // Test 3: Products filter by retailer (alternative approach) 
    await testQuery('Filtered Products', `
        query FilteredProducts($retailerId: ID!) {
            filteredProducts(filter: { retailerId: $retailerId }, pagination: { limit: 10 }) {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }
    `, { retailerId: STORE_ID });

    // Test 4: Introspection to find available queries
    await testQuery('Available Queries (Introspection)', `
        query {
            __schema {
                queryType {
                    fields {
                        name
                        description
                    }
                }
            }
        }
    `);

    console.log('\n=== Done ===');
}

main();
