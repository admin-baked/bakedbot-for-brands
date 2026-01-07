/**
 * Dutchie Plus GraphQL - Test with Correct Pagination
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
            console.log('Error:', json.errors[0]?.message);
            console.log('Code:', json.errors[0]?.extensions?.code);
        }
        
        if (json.data) {
            const dataStr = JSON.stringify(json.data, null, 2);
            console.log('Data:', dataStr.substring(0, 1000));
            if (dataStr.length > 1000) console.log('...(truncated)');
        }
        
        return json;
    } catch (e: any) {
        console.error('Fetch Error:', e.message);
    }
    return null;
}

async function main() {
    console.log('Dutchie Plus GraphQL - Correct Pagination');
    console.log('Store ID:', STORE_ID);
    console.log('API Key:', API_KEY.substring(0, 12) + '...');

    // Test 1: Customers with proper pagination (limit + offset)
    const customersResult = await testQuery('Customers', `
        query GetCustomers($retailerId: ID!) {
            customers(retailerId: $retailerId, pagination: { limit: 5, offset: 0 }) {
                edges {
                    node {
                        id
                        firstName
                        lastName
                        email
                    }
                }
                pageInfo {
                    hasNextPage
                    total
                }
            }
        }
    `, { retailerId: STORE_ID });

    // Test 2: Orders with proper pagination
    await testQuery('Orders', `
        query GetOrders($retailerId: ID!) {
            orders(retailerId: $retailerId, pagination: { limit: 5, offset: 0 }) {
                edges {
                    node {
                        id
                        total
                        status
                        createdAt
                    }
                }
                pageInfo {
                    hasNextPage
                    total
                }
            }
        }
    `, { retailerId: STORE_ID });

    // Test 3: Menu with different approach - maybe it needs special params
    await testQuery('Menu (Rec)', `
        query GetMenu($retailerId: ID!) {
            menu(retailerId: $retailerId, menuType: RECREATIONAL) {
                products {
                    id
                    name
                    brand {
                        name
                    }
                    category
                }
            }
        }
    `, { retailerId: STORE_ID });

    // Test 4: Menu with medical type
    await testQuery('Menu (Med)', `
        query GetMenu($retailerId: ID!) {
            menu(retailerId: $retailerId, menuType: MEDICAL) {
                products {
                    id
                    name
                }
            }
        }
    `, { retailerId: STORE_ID });

    // Test 5: Just get product info from an order
    if (customersResult?.data?.customers?.edges?.length) {
        console.log('\n✅ CUSTOMERS QUERY WORKS! Can access customer data.');
    }

    console.log('\n=== Done ===');
}

main();
