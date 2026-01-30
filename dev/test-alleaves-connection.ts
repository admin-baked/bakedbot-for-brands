/**
 * Test Alleaves API Connection
 *
 * This script tests the connection to Alleaves API and validates credentials.
 *
 * Prerequisites:
 * - ALLEAVES_API_KEY environment variable must be set
 *
 * Run: ALLEAVES_API_KEY=your_key npx tsx dev/test-alleaves-connection.ts
 */

import { ALLeavesClient } from '../src/lib/pos/adapters/alleaves';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testConnection() {
    console.log('🔍 Testing Alleaves API Connection\n');
    console.log('═'.repeat(60));

    // Check for API key
    const apiKey = process.env.ALLEAVES_API_KEY;
    if (!apiKey) {
        console.error('❌ ALLEAVES_API_KEY environment variable not set!');
        console.log('\nSet it with:');
        console.log('  export ALLEAVES_API_KEY=your_api_key_here');
        console.log('  npx tsx dev/test-alleaves-connection.ts');
        console.log('\nOr add to .env.local:');
        console.log('  ALLEAVES_API_KEY=your_api_key_here');
        process.exit(1);
    }

    console.log('✅ API Key found (length:', apiKey.length, ')');

    // Initialize client
    const client = new ALLeavesClient({
        apiKey: apiKey,
        storeId: '1000',
        locationId: '1000',
        environment: 'production',
    });

    console.log('✅ Client initialized');
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
            console.log('  - Invalid API key');
            console.log('  - Wrong location ID');
            console.log('  - API endpoint changed');
            console.log('  - Network/firewall issues');
            process.exit(1);
        }

        console.log('✅ Connection valid!');

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
            for (const [category, count] of Object.entries(categoryCount)) {
                console.log(`  ${category}: ${count} products`);
            }

            // Test 3: Check Inventory
            console.log('\n📊 Test 3: Checking inventory levels...');
            const sampleIds = products.slice(0, 5).map(p => p.externalId);
            const inventory = await client.getInventory(sampleIds);
            console.log('✅ Inventory check complete');
            console.log('\nSample Inventory (first 5 products):');
            for (const [id, stock] of Object.entries(inventory)) {
                const product = products.find(p => p.externalId === id);
                console.log(`  ${product?.name || id}: ${stock} units`);
            }
        } else {
            console.log('⚠️  No products found in menu');
            console.log('   This could be normal if the menu is empty');
        }

        // All tests passed
        console.log('\n═'.repeat(60));
        console.log('✅ ALL TESTS PASSED!');
        console.log('═'.repeat(60));
        console.log('\nYou can now:');
        console.log('1. Run the setup script: npx tsx dev/setup-thrive-alleaves.ts');
        console.log('2. Run a manual sync: npx tsx dev/manual-pos-sync.ts');
        console.log('3. Configure automated syncs via Cloud Scheduler');
        console.log('');

    } catch (error) {
        console.error('\n❌ TEST FAILED\n');
        console.error('Error details:');
        console.error(error);
        console.log('\nTroubleshooting:');
        console.log('1. Verify your API key is correct');
        console.log('2. Check that Location ID "1000" is correct');
        console.log('3. Ensure you have network access to api.alleaves.com');
        console.log('4. Contact Alleaves support if issues persist');
        process.exit(1);
    }
}

// Run test
testConnection().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
