/**
 * Test Alleaves API Connection with Basic Auth
 *
 * This script tests the connection to Alleaves API using username/password (Basic Auth).
 *
 * Credentials for Thrive Syracuse:
 * - Username: Bakedbotai@thrivesyracuse.com
 * - Password: Bakedbotthrive1!
 * - Pin: 1234
 * - Location ID: 1000
 *
 * Run: npx tsx dev/test-alleaves-basic-auth.ts
 */

import { ALLeavesClient } from '../src/lib/pos/adapters/alleaves';

async function testBasicAuth() {
    console.log('🔍 Testing Alleaves API with Basic Authentication\n');
    console.log('═'.repeat(60));

    // Thrive Syracuse credentials (updated 2026-01-29)
    const username = 'bakedbotai@thrivesyracuse.com';
    const password = 'Dreamchasing2030!!@@!!';
    const pin = '1234';
    const locationId = '1000';

    console.log('Credentials:');
    console.log(`  Username:    ${username}`);
    console.log(`  Password:    ${'•'.repeat(password.length)}`);
    console.log(`  Pin:         ${pin}`);
    console.log(`  Location ID: ${locationId}`);

    // Initialize client with Basic Auth
    const client = new ALLeavesClient({
        username: username,
        password: password,
        pin: pin,
        storeId: locationId,
        locationId: locationId,
        environment: 'production',
    });

    console.log('\n✅ Client initialized');
    console.log('\nConfig:');
    console.log(JSON.stringify(client.getConfigInfo(), null, 2));
    console.log('═'.repeat(60));

    try {
        // Test 1: Validate Connection
        console.log('\n📡 Test 1: Validating API connection...');
        const isValid = await client.validateConnection();

        if (!isValid) {
            console.error('❌ Connection validation failed!');
            console.log('\nPossible issues:');
            console.log('  - Invalid username or password');
            console.log('  - Wrong location ID');
            console.log('  - API endpoint changed');
            console.log('  - Account permissions issue');
            process.exit(1);
        }

        console.log('✅ Connection valid! Basic Auth working.');

        // Test 2: Fetch Menu
        console.log('\n📦 Test 2: Fetching menu products...');
        const products = await client.fetchMenu();
        console.log(`✅ Fetched ${products.length} products`);

        if (products.length > 0) {
            console.log('\n📋 Sample Product (first in menu):');
            console.log('─'.repeat(60));
            const sample = products[0];
            console.log(`Name:        ${sample.name}`);
            console.log(`Brand:       ${sample.brand}`);
            console.log(`Category:    ${sample.category}`);
            console.log(`Price:       $${sample.price}`);
            console.log(`Stock:       ${sample.stock}`);
            console.log(`THC:         ${sample.thcPercent || 'N/A'}%`);
            console.log(`CBD:         ${sample.cbdPercent || 'N/A'}%`);
            console.log(`Image:       ${sample.imageUrl || 'No image'}`);
            console.log(`External ID: ${sample.externalId}`);
            console.log('─'.repeat(60));

            // Show category breakdown
            console.log('\n📊 Category Breakdown:');
            const categoryCount: Record<string, number> = {};
            for (const product of products) {
                categoryCount[product.category] = (categoryCount[product.category] || 0) + 1;
            }
            for (const [category, count] of Object.entries(categoryCount).sort((a, b) => b[1] - a[1])) {
                console.log(`  ${category.padEnd(20)} ${count} products`);
            }

            // Show brand breakdown
            console.log('\n🏷️  Brand Breakdown (top 10):');
            const brandCount: Record<string, number> = {};
            for (const product of products) {
                brandCount[product.brand] = (brandCount[product.brand] || 0) + 1;
            }
            const topBrands = Object.entries(brandCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            for (const [brand, count] of topBrands) {
                console.log(`  ${brand.padEnd(20)} ${count} products`);
            }

            // Test 3: Check Inventory
            console.log('\n📊 Test 3: Checking inventory levels...');
            const sampleIds = products.slice(0, 5).map(p => p.externalId);
            const inventory = await client.getInventory(sampleIds);
            console.log('✅ Inventory check complete');
            console.log('\nSample Inventory (first 5 products):');
            for (const [id, stock] of Object.entries(inventory)) {
                const product = products.find(p => p.externalId === id);
                console.log(`  ${(product?.name || id).padEnd(40)} ${stock} units`);
            }
        } else {
            console.log('⚠️  No products found in menu');
            console.log('   This could indicate:');
            console.log('   - Empty menu in Alleaves');
            console.log('   - Wrong location ID');
            console.log('   - API endpoint mismatch');
        }

        // All tests passed
        console.log('\n═'.repeat(60));
        console.log('✅ ALL TESTS PASSED! Basic Auth working perfectly.');
        console.log('═'.repeat(60));
        console.log('\n🎉 Integration is ready! Next steps:\n');
        console.log('1. Add credentials to Firebase secrets:');
        console.log('   firebase apphosting:secrets:set ALLEAVES_USERNAME');
        console.log('   firebase apphosting:secrets:set ALLEAVES_PASSWORD');
        console.log('');
        console.log('2. Run setup script:');
        console.log('   npx tsx dev/setup-thrive-alleaves.ts');
        console.log('');
        console.log('3. Run initial sync:');
        console.log('   npx tsx dev/manual-pos-sync-basic-auth.ts');
        console.log('');

    } catch (error) {
        console.error('\n❌ TEST FAILED\n');
        console.error('Error details:');
        console.error(error);

        if (error instanceof Error) {
            console.log('\n📋 Error message:', error.message);

            if (error.message.includes('401')) {
                console.log('\n💡 Troubleshooting 401 Unauthorized:');
                console.log('   - Verify username and password are correct');
                console.log('   - Check if account is active');
                console.log('   - Ensure API access is enabled for this account');
            } else if (error.message.includes('404')) {
                console.log('\n💡 Troubleshooting 404 Not Found:');
                console.log('   - Verify Location ID "1000" is correct');
                console.log('   - Check API base URL');
            } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
                console.log('\n💡 Troubleshooting Network Error:');
                console.log('   - Check internet connection');
                console.log('   - Verify API endpoint: https://app.alleaves.com/api');
                console.log('   - Check firewall settings');
            }
        }

        console.log('\n📞 If issues persist, contact Alleaves support');
        process.exit(1);
    }
}

// Run test
testBasicAuth().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
