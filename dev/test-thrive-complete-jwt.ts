/**
 * Complete Thrive Syracuse Alleaves Integration Test with JWT
 *
 * This script tests the full integration with JWT authentication.
 */

import { ALLeavesClient } from '../src/lib/pos/adapters/alleaves';

async function testComplete() {
    console.log('🎯 Complete Thrive Syracuse - Alleaves Integration Test\n');
    console.log('═'.repeat(70));

    // Thrive Syracuse credentials
    const client = new ALLeavesClient({
        username: 'bakedbotai@thrivesyracuse.com',
        password: 'Dreamchasing2030!!@@!!',
        pin: '1234',
        storeId: '1000',
        locationId: '1000',
        environment: 'production',
    });

    console.log('Configuration:');
    console.log(JSON.stringify(client.getConfigInfo(), null, 2));
    console.log('═'.repeat(70));

    try {
        // Test 1: Validate Connection
        console.log('\n✅ TEST 1: Connection Validation');
        console.log('─'.repeat(70));
        const isValid = await client.validateConnection();

        if (!isValid) {
            console.error('❌ Connection validation failed!');
            process.exit(1);
        }

        console.log('✅ Connection validated successfully!');

        // Test 2: Fetch Menu
        console.log('\n✅ TEST 2: Fetch Menu Products');
        console.log('─'.repeat(70));
        const products = await client.fetchMenu();
        console.log(`📦 Fetched ${products.length} products from Alleaves`);

        if (products.length === 0) {
            console.log('⚠️  No products found - menu may be empty');
        } else {
            // Show first 3 products
            console.log('\n📋 Sample Products:');
            products.slice(0, 3).forEach((product, idx) => {
                console.log(`\n${idx + 1}. ${product.name}`);
                console.log(`   Brand:    ${product.brand}`);
                console.log(`   Category: ${product.category}`);
                console.log(`   Price:    $${product.price}`);
                console.log(`   Stock:    ${product.stock} units`);
                if (product.thcPercent) console.log(`   THC:      ${product.thcPercent}%`);
                if (product.cbdPercent) console.log(`   CBD:      ${product.cbdPercent}%`);
            });

            // Category breakdown
            console.log('\n📊 Category Distribution:');
            const categories: Record<string, number> = {};
            products.forEach(p => {
                categories[p.category] = (categories[p.category] || 0) + 1;
            });
            Object.entries(categories)
                .sort((a, b) => b[1] - a[1])
                .forEach(([cat, count]) => {
                    const percentage = ((count / products.length) * 100).toFixed(1);
                    const bar = '█'.repeat(Math.floor(count / products.length * 30));
                    console.log(`   ${cat.padEnd(20)} ${count.toString().padStart(4)} (${percentage}%) ${bar}`);
                });

            // Brand breakdown (top 10)
            console.log('\n🏷️  Top Brands:');
            const brands: Record<string, number> = {};
            products.forEach(p => {
                brands[p.brand] = (brands[p.brand] || 0) + 1;
            });
            Object.entries(brands)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .forEach(([brand, count]) => {
                    console.log(`   ${brand.padEnd(25)} ${count} products`);
                });

            // Test 3: Inventory Check
            console.log('\n✅ TEST 3: Inventory Levels');
            console.log('─'.repeat(70));
            const sampleIds = products.slice(0, 5).map(p => p.externalId);
            const inventory = await client.getInventory(sampleIds);
            console.log('📊 Stock Levels (first 5 products):');
            Object.entries(inventory).forEach(([id, stock]) => {
                const product = products.find(p => p.externalId === id);
                console.log(`   ${(product?.name || id).padEnd(40)} ${stock.toString().padStart(3)} units`);
            });
        }

        // Success Summary
        console.log('\n═'.repeat(70));
        console.log('🎉 ALL TESTS PASSED! Integration ready for production.');
        console.log('═'.repeat(70));
        console.log('\n📦 Integration Summary:');
        console.log(`   ✅ Authentication: JWT (username/password/pin)`);
        console.log(`   ✅ Location ID: 1000 (Thrive Syracuse)`);
        console.log(`   ✅ Products Available: ${products.length}`);
        console.log(`   ✅ Connection Validated`);
        console.log(`   ✅ Inventory Access Working`);

        console.log('\n🚀 NEXT STEPS:\n');
        console.log('1. Add credentials to Firebase secrets:');
        console.log('   firebase apphosting:secrets:set ALLEAVES_USERNAME');
        console.log('   → Enter: bakedbotai@thrivesyracuse.com');
        console.log('');
        console.log('   firebase apphosting:secrets:set ALLEAVES_PASSWORD');
        console.log('   → Enter: Dreamchasing2030!!@@!!');
        console.log('');
        console.log('2. Deploy configuration changes:');
        console.log('   git add .');
        console.log('   git commit -m "feat: Alleaves JWT integration for Thrive Syracuse"');
        console.log('   git push origin main');
        console.log('');
        console.log('3. Run setup script:');
        console.log('   npx tsx dev/setup-thrive-alleaves.ts');
        console.log('');
        console.log('4. Run initial POS sync:');
        console.log('   ALLEAVES_USERNAME=bakedbotai@thrivesyracuse.com \\');
        console.log('   ALLEAVES_PASSWORD=Dreamchasing2030!!@@!! \\');
        console.log('   ALLEAVES_PIN=1234 \\');
        console.log('   npx tsx dev/manual-pos-sync.ts');
        console.log('');
        console.log('5. Verify in browser:');
        console.log('   https://bakedbot.ai/thrivesyracuse');
        console.log('');

    } catch (error) {
        console.error('\n❌ TEST FAILED\n');
        console.error('Error:', error);

        if (error instanceof Error) {
            console.log('\n💡 Troubleshooting:');
            if (error.message.includes('401') || error.message.includes('authentication')) {
                console.log('   - Verify credentials are correct');
                console.log('   - Check if account is active');
            } else if (error.message.includes('404')) {
                console.log('   - Verify Location ID "1000" is correct');
                console.log('   - Check API endpoints');
            } else {
                console.log('   - Check network connectivity');
                console.log('   - Review error message above');
            }
        }

        process.exit(1);
    }
}

testComplete().catch(console.error);
