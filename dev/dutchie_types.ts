/**
 * Dutchie Plus GraphQL - Customer Type Discovery and Working Query Test
 */

const DUTCHIE_PLUS_GRAPHQL = 'https://plus.dutchie.com/plus/2021-07/graphql';
const STORE_ID = '3af693f9-ee33-43de-9d68-2a8c25881517';
const API_KEY = '487c94ca-684f-4237-b3ef-6adb996437f1';

async function query(name: string, q: string, v: any = {}) {
    console.log(`\n=== ${name} ===`);
    try {
        const r = await fetch(DUTCHIE_PLUS_GRAPHQL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
            body: JSON.stringify({ query: q, variables: v }),
        });
        console.log(`Status: ${r.status}`);
        const j = await r.json();
        if (j.errors) console.log('Error:', j.errors[0]?.message);
        if (j.data) console.log('Data:', JSON.stringify(j.data, null, 2).substring(0, 1500));
        return j;
    } catch (e: any) { console.error('Err:', e.message); }
}

async function main() {
    // Get Customer type fields
    await query('Customer Type', `
        query { __type(name: "Customer") { fields { name type { name } } } }
    `);

    // Get Order type fields
    await query('Order Type', `
        query { __type(name: "Order") { fields { name type { name } } } }
    `);

    // Get Product type fields  
    await query('Product Type', `
        query { __type(name: "Product") { fields { name type { name } } } }
    `);

    // Try customers with only id field
    await query('Customers (ID only)', `
        query GetCust($retailerId: ID!) {
            customers(retailerId: $retailerId, pagination: { limit: 1, offset: 0 }) {
                id
            }
        }
    `, { retailerId: STORE_ID });

    // Try the checkout start mutation to see if we can access anything
    await query('Product by ID', `
        query GetProduct($retailerId: ID!, $productId: ID!) {
            product(retailerId: $retailerId, id: $productId) {
                id
                name
            }
        }
    `, { retailerId: STORE_ID, productId: 'test' });

    // Collection with a simple slug
    await query('Collection', `
        query GetCollection($retailerId: ID!, $slug: String!) {
            collection(retailerId: $retailerId, slug: $slug) {
                id
                title
                products { id name }
            }
        }
    `, { retailerId: STORE_ID, slug: 'featured' });

    console.log('\n=== Done ===');
}

main();
