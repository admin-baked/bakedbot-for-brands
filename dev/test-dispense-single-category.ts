/**
 * Test fetching a single category to inspect response structure
 */

const VENUE_ID = '13455748f2d363fd';
const API_KEY = '49dac8e0-7743-11e9-8e3f-a5601eb2e936';
const BASE_URL = 'https://api.dispenseapp.com';

async function testSingleCategory() {
    // Try flower category
    const categoryId = '778d114c5cfe6f27';

    const url = `${BASE_URL}/v1/venues/${VENUE_ID}/product-categories/${categoryId}/products?skip=0&limit=10&orderPickUpType=IN_STORE`;

    console.log(`Fetching: ${url}\n`);

    const response = await fetch(url, {
        headers: {
            'api-key': API_KEY,
            'Accept': 'application/json',
        }
    });

    console.log(`Status: ${response.status}\n`);

    const data = await response.json();

    console.log('Response structure:');
    console.log(JSON.stringify(data, null, 2));

    // Save to file
    const fs = require('fs');
    const path = require('path');
    fs.writeFileSync(
        path.join(process.cwd(), 'dev', 'single-category-response.json'),
        JSON.stringify(data, null, 2)
    );

    console.log('\n💾 Saved to dev/single-category-response.json');
}

testSingleCategory().catch(console.error);
