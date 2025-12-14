
import * as dotenv from 'dotenv';
import { searchNearbyRetailers } from '../src/lib/cannmenus-api';

// Load env vars
dotenv.config({ path: '.env.local' });

async function inspectProduct() {
    console.log('--- Inspecting V1 Product Structure ---');

    console.log('1. Finding a retailer in 90004...');
    // We know 90004 -> Los Angeles, California from previous debug
    const retailers = await searchNearbyRetailers(34.0, -118.3, 1, 'California', 'Los Angeles');

    if (retailers.length === 0) {
        console.error('No retailers found to test with.');
        return;
    }

    const retailer = retailers[0];
    console.log(`Using Retailer: ${retailer.name} (ID: ${retailer.id})`);

    console.log('2. Fetching raw products...');
    const url = `https://api.cannmenus.com/v1/products?states=California&retailer_ids=${retailer.id}&limit=1`;
    const response = await fetch(url, {
        headers: {
            'X-Token': process.env.CANNMENUS_API_KEY!,
            'User-Agent': 'BakedBot-Debug'
        }
    });

    const data = await response.json();

    if (data.data && data.data.length > 0) {
        console.log('--- RAW PRODUCT JSON ---');
        console.log(JSON.stringify(data.data[0], null, 2));
        console.log('------------------------');
    } else {
        console.log('No products returned.', data);
    }
}

inspectProduct();
