/**
 * Simple Dutchie Ecommerce API Test
 */

import * as fs from 'fs';

const RETAILER_ID = '3af693f9-ee33-43de-9d68-2a8c25881517';
const ORDER_AHEAD_CLIENT_ID = 'DuhGhnVA5nKbokCDDDtcXO3kdt8VdyzG';
const ORDER_AHEAD_TOKEN = '6AnJC-ZcHoxbIE5IGg1kJFQtyyIDRx2Jz1cpY3eY0fwI8WldMjf6tU-2kyhNQP9s';

const results: string[] = [];

function log(msg: string) {
    console.log(msg);
    results.push(msg);
}

async function testEndpoint(name: string, url: string, options: RequestInit = {}): Promise<any> {
    log(`\n=== ${name} ===`);
    log(`URL: ${url.substring(0, 80)}`);
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'BakedBot/1.0',
                ...options.headers,
            },
        });
        
        log(`Status: ${response.status} ${response.statusText}`);
        
        const text = await response.text();
        
        try {
            const data = JSON.parse(text);
            
            if (data.errors) {
                log(`Error: ${data.errors[0]?.message || 'Unknown'}`);
                return null;
            }
            
            if (data.data?.menu?.products) {
                log(`SUCCESS: Found ${data.data.menu.products.length} products`);
                if (data.data.menu.products[0]) {
                    log(`First: ${data.data.menu.products[0].name}`);
                }
                return data;
            }
            
            // Check for other success patterns
            if (data.products || data.menu || data.items) {
                log(`SUCCESS: Found data structure`);
                return data;
            }
            
            log(`Response keys: ${Object.keys(data).join(', ')}`);
            return data;
            
        } catch (e) {
            if (text.includes('<!DOCTYPE')) {
                log('Response: HTML page (not JSON API)');
            } else {
                log(`Response: ${text.substring(0, 100)}`);
            }
            return null;
        }
    } catch (error: any) {
        log(`Fetch Error: ${error.message}`);
        return null;
    }
}

async function main() {
    log('Dutchie Ecommerce API Test');
    log(`Retailer ID: ${RETAILER_ID}`);
    log('');

    const query = `
        query GetMenu($retailerId: ID!) {
            menu(retailerId: $retailerId) {
                products { id name brand { name } category }
            }
        }
    `;

    // Test 1: Public dutchie.com GraphQL
    await testEndpoint('Public dutchie.com/graphql', 'https://dutchie.com/graphql', {
        method: 'POST',
        body: JSON.stringify({ query, variables: { retailerId: RETAILER_ID } })
    });

    // Test 2: Plus API without auth
    await testEndpoint('Plus API (no auth)', 'https://plus.dutchie.com/plus/2021-07/graphql', {
        method: 'POST',
        body: JSON.stringify({ query, variables: { retailerId: RETAILER_ID } })
    });

    // Test 3: Plus API with Order Ahead credentials
    const authHeader = `Basic ${Buffer.from(`${ORDER_AHEAD_CLIENT_ID}:${ORDER_AHEAD_TOKEN}`).toString('base64')}`;
    await testEndpoint('Plus API (Order Ahead auth)', 'https://plus.dutchie.com/plus/2021-07/graphql', {
        method: 'POST',
        headers: { 'Authorization': authHeader },
        body: JSON.stringify({ query, variables: { retailerId: RETAILER_ID } })
    });

    // Test 4: Dutchie's public consumer API (used by their storefront)
    await testEndpoint('Consumer API', `https://dutchie.com/api/consumer/dispensary/${RETAILER_ID}`);

    // Test 5: subdomain pattern
    await testEndpoint('Subdomain API', `https://api.dutchie.com/plus/2021-07/graphql`, {
        method: 'POST',
        body: JSON.stringify({ query, variables: { retailerId: RETAILER_ID } })
    });

    log('\n=== DONE ===');

    // Save results
    fs.writeFileSync('dutchie_test_results.txt', results.join('\n'), 'utf-8');
    log('\nResults saved to dutchie_test_results.txt');
}

main();
