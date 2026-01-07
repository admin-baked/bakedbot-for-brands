
const DUTCHIE_PLUS_GRAPHQL = 'https://plus.dutchie.com/plus/2021-07/graphql';
const STORE_ID = '3af693f9-ee33-43de-9d68-2a8c25881517';
const API_KEY = '487c94ca-684f-4237-b3ef-6adb996437f1';

async function testMenuQuery() {
    console.log(`Testing Menu Query at ${DUTCHIE_PLUS_GRAPHQL}...`);
    
    const query = `
        query GetMenu($retailerId: ID!) {
            menu(retailerId: $retailerId) {
                products {
                    id
                    name
                }
            }
        }
    `;

    try {
        const response = await fetch(DUTCHIE_PLUS_GRAPHQL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({ 
                query, 
                variables: { retailerId: STORE_ID } 
            }),
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        if (response.ok) {
            const json = await response.json();
            const products = json.data?.menu?.products || [];
            console.log(`Success: Found ${products.length} products`);
            if (products.length > 0) {
                console.log('Sample:', JSON.stringify(products[0]));
            }
        } else {
             const text = await response.text();
             console.log('Failure Body:', text.substring(0, 500));
        }

    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

testMenuQuery();
