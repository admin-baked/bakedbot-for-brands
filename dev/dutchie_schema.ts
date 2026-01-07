/**
 * Dutchie Plus GraphQL - Deep Schema Introspection
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
        }
        
        if (json.data) {
            const dataStr = JSON.stringify(json.data, null, 2);
            console.log('Data:', dataStr.substring(0, 2000));
        }
        
        return json;
    } catch (e: any) {
        console.error('Fetch Error:', e.message);
    }
    return null;
}

async function main() {
    console.log('Dutchie Plus GraphQL - Schema Discovery');
    console.log('Store ID:', STORE_ID);

    // Get the return type of customers query
    await testQuery('Customers Query Schema', `
        query {
            __type(name: "Query") {
                fields {
                    name
                    type {
                        name
                        kind
                        ofType {
                            name
                            kind
                        }
                    }
                    args {
                        name
                        type {
                            name
                            kind
                        }
                    }
                }
            }
        }
    `);

    // Try customers without edges
    await testQuery('Customers (Simple)', `
        query GetCustomers($retailerId: ID!) {
            customers(retailerId: $retailerId, pagination: { limit: 1, offset: 0 }) {
                id
                firstName
                lastName  
            }
        }
    `, { retailerId: STORE_ID });

    // Try orders without edges
    await testQuery('Orders (Simple)', `
        query GetOrders($retailerId: ID!) {
            orders(retailerId: $retailerId, pagination: { limit: 1, offset: 0 }) {
                id
                total
            }
        }
    `, { retailerId: STORE_ID });

    // See what checkout returns
    await testQuery('Checkout Schema', `
        query {
            __type(name: "Checkout") {
                fields {
                    name
                }
            }
        }
    `);

    // Menu type schema  
    await testQuery('Menu Type Schema', `
        query {
            __type(name: "Menu") {
                fields {
                    name
                    type {
                        name
                    }
                }
            }
        }
    `);

    console.log('\n=== Done ===');
}

main();
