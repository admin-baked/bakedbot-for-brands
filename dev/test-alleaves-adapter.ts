/**
 * Test the updated Alleaves adapter with real credentials
 */

import { ALLeavesClient } from '../src/lib/pos/adapters/alleaves';

async function testAdapter() {
    console.log('🧪 Testing Alleaves Adapter\n');

    // Initialize client with Thrive credentials
    const client = new ALLeavesClient({
        provider: 'alleaves',
        storeId: '1000',
        locationId: '1000',
        username: 'bakedbotai@thrivesyracuse.com',
        password: 'Dreamchasing2030!!@@!!',
        pin: '1234',
        environment: 'production',
    });

    // Test 1: Validate Connection
    console.log('1️⃣ Testing connection validation...');
    const isValid = await client.validateConnection();
    console.log(`   ${isValid ? '✅' : '❌'} Connection: ${isValid ? 'Valid' : 'Invalid'}\n`);

    if (!isValid) {
        console.error('❌ Connection validation failed. Stopping tests.');
        process.exit(1);
    }

    // Test 2: Fetch Menu
    console.log('2️⃣ Testing menu fetch...');
    const products = await client.fetchMenu();
    console.log(`   ✅ Fetched ${products.length} products\n`);

    // Test 3: Show sample products
    console.log('3️⃣ Sample products:\n');
    products.slice(0, 5).forEach((product, idx) => {
        console.log(`   ${idx + 1}. ${product.name}`);
        console.log(`      Brand: ${product.brand}`);
        console.log(`      Category: ${product.category}`);
        console.log(`      Price: $${product.price.toFixed(2)}`);
        console.log(`      Stock: ${product.stock}`);
        if (product.thcPercent) {
            console.log(`      THC: ${product.thcPercent}%`);
        }
        if (product.cbdPercent) {
            console.log(`      CBD: ${product.cbdPercent}%`);
        }
        console.log('');
    });

    // Test 4: Analyze categories
    console.log('4️⃣ Product categories:\n');
    const categoryCounts: Record<string, number> = {};
    products.forEach(p => {
        categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    });

    Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([category, count]) => {
            console.log(`   ${category.padEnd(20)} ${count} items`);
        });

    // Test 5: Show config info
    console.log('\n5️⃣ Client configuration:\n');
    const config = client.getConfigInfo();
    console.log('   ', JSON.stringify(config, null, 2).split('\n').join('\n    '));

    console.log('\n✅ All tests passed!');
}

testAdapter().catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
});
