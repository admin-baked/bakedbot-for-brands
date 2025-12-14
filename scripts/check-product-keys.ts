
import * as dotenv from 'dotenv';
import { searchNearbyRetailers } from '../src/lib/cannmenus-api';

dotenv.config({ path: '.env.local' });

async function checkKeys() {
    console.log('--- Checking Nested Product Keys ---');
    const retailers = await searchNearbyRetailers(34.0, -118.3, 1, 'California', 'Los Angeles');
    if (retailers.length === 0) return console.log('No retailers');

    const retailer = retailers[0];
    const url = `https://api.cannmenus.com/v1/products?states=California&retailer_ids=${retailer.id}&limit=1`;
    const response = await fetch(url, {
        headers: { 'X-Token': process.env.CANNMENUS_API_KEY! }
    });
    const data = await response.json();

    // Mimic the fix: Flatten the loop
    const retailersWithProducts = data.data || [];
    const items = retailersWithProducts.flatMap((r: any) => r.products || []);

    if (items.length > 0) {
        const item = items[0];
        const fs = require('fs');
        let output = '--- FIRST PRODUCT KEYS & VALUES ---\n';
        Object.keys(item).forEach(key => {
            let val = item[key];
            if (typeof val === 'object' && val !== null) val = 'OBJECT';
            output += `Key: "${key}" | ValueType: ${typeof item[key]} | Sample: ${val}\n`;
        });
        fs.writeFileSync('keys_output.txt', output);
        console.log('Written to keys_output.txt');
    } else {

        console.log('No products found in retailer object.');
        console.log('Retailer object keys:', Object.keys(retailersWithProducts[0] || {}));
    }
}

checkKeys();
