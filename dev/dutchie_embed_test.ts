/**
 * Test Dutchie Embed/Public Menu Access
 */

import * as fs from 'fs';

const RETAILER_ID = '3af693f9-ee33-43de-9d68-2a8c25881517';

async function main() {
    console.log('Testing Dutchie Public/Embed Menu Access');
    console.log('Retailer ID:', RETAILER_ID);
    console.log('');

    // Test 1: Embed menu script URL
    console.log('=== Test 1: Embed Script ===');
    try {
        const resp = await fetch(`https://dutchie.com/api/v2/embedded-menu/${RETAILER_ID}.js`);
        console.log('Status:', resp.status);
        if (resp.ok) {
            const text = await resp.text();
            console.log('Script length:', text.length);
            // Extract retailer slug from script if present
            const slugMatch = text.match(/dispensary\/([^\/]+)/);
            if (slugMatch) {
                console.log('Found dispensary slug:', slugMatch[1]);
            }
        }
    } catch (e: any) {
        console.log('Error:', e.message);
    }

    // Test 2: Direct dispensary page (to find the slug)
    console.log('\n=== Test 2: Finding Dispensary Slug ===');
    // Essex Apothecary should have a Dutchie storefront
    const possibleSlugs = [
        'essex-apothecary',
        'essex',
        'essexapothecary',
        RETAILER_ID
    ];
    
    for (const slug of possibleSlugs) {
        try {
            const url = `https://dutchie.com/dispensary/${slug}`;
            const resp = await fetch(url, { 
                method: 'HEAD',
                redirect: 'follow' 
            });
            console.log(`${slug}: ${resp.status}`);
            if (resp.ok || resp.status === 200) {
                console.log('✅ Found valid slug:', slug);
                console.log('URL:', url);
                break;
            }
        } catch (e: any) {
            console.log(`${slug}: Error - ${e.message}`);
        }
    }

    // Test 3: Dutchie's public widget API (used by embedded widgets)
    console.log('\n=== Test 3: Widget API ===');
    try {
        const resp = await fetch(`https://api.dutchie.com/widget/menu/${RETAILER_ID}`);
        console.log('Status:', resp.status);
        if (resp.ok) {
            console.log('✅ Widget API works!');
        }
    } catch (e: any) {
        console.log('Error:', e.message);
    }

    // Test 4: Try the public storefront data endpoint
    console.log('\n=== Test 4: Storefront Data ===');
    try {
        const resp = await fetch(`https://dutchie.com/api/v2/storefronts/${RETAILER_ID}/menu`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        console.log('Status:', resp.status);
        const text = await resp.text();
        if (text.startsWith('{') || text.startsWith('[')) {
            const data = JSON.parse(text);
            console.log('Keys:', Object.keys(data));
        } else {
            console.log('Not JSON');
        }
    } catch (e: any) {
        console.log('Error:', e.message);
    }

    // Test 5: Jane API (alternative POS)
    console.log('\n=== Test 5: Jane API (alternative) ===');
    try {
        const resp = await fetch(`https://api.iheartjane.com/v1/stores/${RETAILER_ID}/menu`);
        console.log('Status:', resp.status);
    } catch (e: any) {
        console.log('Error:', e.message);
    }

    console.log('\n=== Done ===');
}

main();
