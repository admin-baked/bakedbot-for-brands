/**
 * Check price data in raw inventory items
 */

import { ALLeavesClient } from '../src/lib/pos/adapters/alleaves';

async function checkPrices() {
    const client = new ALLeavesClient({
        provider: 'alleaves',
        storeId: '1000',
        locationId: '1000',
        username: 'bakedbotai@thrivesyracuse.com',
        password: 'Dreamchasing2030!!@@!!',
        pin: '1234',
        environment: 'production',
    });

    console.log('🔍 Checking price data in raw inventory...\n');

    const products = await client.fetchMenu();

    console.log(`Total products: ${products.length}\n`);

    // Check first 10 items with their raw data
    console.log('Sample products with raw price data:\n');
    products.slice(0, 10).forEach((product, idx) => {
        const raw = product.rawData as any;
        console.log(`${idx + 1}. ${product.name}`);
        console.log(`   Mapped price: $${product.price}`);
        console.log(`   Raw price_retail: ${raw.price_retail}`);
        console.log(`   Raw price_otd: ${raw.price_otd}`);
        console.log(`   Raw on_hand: ${raw.on_hand}`);
        console.log(`   Raw available: ${raw.available}`);
        console.log('');
    });

    // Find items with non-zero prices
    const itemsWithPrices = products.filter(p => p.price > 0);
    console.log(`\nProducts with non-zero prices: ${itemsWithPrices.length}`);

    if (itemsWithPrices.length > 0) {
        console.log('\nSample products with prices:\n');
        itemsWithPrices.slice(0, 5).forEach((product, idx) => {
            const raw = product.rawData as any;
            console.log(`${idx + 1}. ${product.name}`);
            console.log(`   Price: $${product.price.toFixed(2)}`);
            console.log(`   Stock: ${product.stock}`);
            console.log(`   Raw price_retail: ${raw.price_retail}`);
            console.log(`   Raw price_otd: ${raw.price_otd}`);
            console.log('');
        });
    }
}

checkPrices().catch(console.error);
