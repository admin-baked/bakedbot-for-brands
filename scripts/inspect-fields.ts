
import * as dotenv from 'dotenv';
import { searchNearbyRetailers } from '../src/lib/cannmenus-api';

dotenv.config({ path: '.env.local' });

async function inspectFields() {
    console.log('--- Inspecting Fields ---');
    const retailers = await searchNearbyRetailers(34.0, -118.3, 1, 'California', 'Los Angeles');
    if (retailers.length === 0) return console.log('No retailers');

    const retailer = retailers[0];
    const url = `https://api.cannmenus.com/v1/products?states=California&retailer_ids=${retailer.id}&limit=1`;
    const response = await fetch(url, {
        headers: { 'X-Token': process.env.CANNMENUS_API_KEY! }
    });
    const data = await response.json();

    const item = data.data[0];
    const fs = require('fs');
    let output = '--- ITEM FIELDS ---\n';
    Object.keys(item).forEach(key => {
        let val = item[key];
        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
        output += `Key: ${key} | Value: ${val}\n`;
    });
    fs.writeFileSync('fields_output.txt', output);
    console.log('Written to fields_output.txt');
}



inspectFields();
