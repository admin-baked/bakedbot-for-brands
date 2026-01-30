/**
 * Deep investigation into pricing data from Alleaves API
 */

async function investigatePricing() {
    const username = 'bakedbotai@thrivesyracuse.com';
    const password = 'Dreamchasing2030!!@@!!';
    const pin = '1234';
    const baseUrl = 'https://app.alleaves.com/api';

    // Authenticate
    console.log('🔐 Authenticating...\n');
    const authResponse = await fetch(`${baseUrl}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, pin }),
    });
    const authData = await authResponse.json();
    const token = authData.token;

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    console.log('📊 Investigating Price Data Sources\n');
    console.log('═'.repeat(60));

    // 1. Check inventory/search for all price-related fields
    console.log('\n1️⃣  Analyzing inventory/search response...\n');
    const inventoryResponse = await fetch(`${baseUrl}/inventory/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: '' }),
    });

    const items = await inventoryResponse.json();
    console.log(`   Total items: ${items.length}\n`);

    // Find items with prices
    const itemsWithPrices = items.filter((i: any) => i.price_retail > 0 || i.price_otd > 0);
    console.log(`   Items with prices: ${itemsWithPrices.length}`);
    console.log(`   Items without prices: ${items.length - itemsWithPrices.length}\n`);

    // Show all price-related fields in the data
    console.log('   Price-related fields found in inventory items:');
    const sampleItem = items[0];
    const priceFields = Object.keys(sampleItem).filter(k =>
        k.toLowerCase().includes('price') ||
        k.toLowerCase().includes('cost') ||
        k.toLowerCase().includes('msrp')
    );
    console.log(`   ${priceFields.join(', ')}\n`);

    // Check a few items in detail
    console.log('   Sample items with ALL fields:\n');
    items.slice(0, 3).forEach((item: any, idx: number) => {
        console.log(`   ${idx + 1}. ${item.item}`);
        console.log(`      All keys: ${Object.keys(item).join(', ')}`);
        console.log('');
    });

    // 2. Try to get item details endpoint
    console.log('\n2️⃣  Checking for item detail endpoint...\n');

    const testItemId = items[0].id_item;
    const itemDetailEndpoints = [
        `/item/${testItemId}`,
        `/item/details/${testItemId}`,
        `/inventory/item/${testItemId}`,
        `/inventory/${testItemId}`,
        `/product/${testItemId}`,
    ];

    for (const endpoint of itemDetailEndpoints) {
        try {
            const response = await fetch(`${baseUrl}${endpoint}`, { headers });
            if (response.ok) {
                const data = await response.json();
                console.log(`   ✅ Found: ${endpoint}`);
                console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 500));
                console.log('\n');
                break;
            }
        } catch (e) {
            // Silent
        }
    }

    // 3. Check for pricing/menu endpoints
    console.log('\n3️⃣  Checking for pricing/menu endpoints...\n');

    const pricingEndpoints = [
        '/pricing',
        '/menu',
        '/menu/items',
        '/retail/menu',
        '/retail/pricing',
        '/pos/menu',
        '/pos/pricing',
    ];

    for (const endpoint of pricingEndpoints) {
        try {
            const response = await fetch(`${baseUrl}${endpoint}`, { headers });
            if (response.ok) {
                const data = await response.json();
                console.log(`   ✅ Found: ${endpoint}`);
                console.log(`   Response preview:`, JSON.stringify(data, null, 2).substring(0, 500));
                console.log('\n');
            }
        } catch (e) {
            // Silent
        }
    }

    // 4. Check batch endpoint
    console.log('\n4️⃣  Checking batch data for pricing...\n');

    const sampleBatchId = items[0].id_batch;
    try {
        const response = await fetch(`${baseUrl}/batch/${sampleBatchId}`, { headers });
        if (response.ok) {
            const batch = await response.json();
            console.log(`   ✅ Batch endpoint works!`);
            console.log(`   Batch data:`, JSON.stringify(batch, null, 2).substring(0, 800));

            // Check for price fields in batch
            const batchPriceFields = Object.keys(batch).filter(k =>
                k.toLowerCase().includes('price') ||
                k.toLowerCase().includes('cost') ||
                k.toLowerCase().includes('msrp')
            );
            console.log(`\n   Price fields in batch: ${batchPriceFields.join(', ')}`);
        }
    } catch (e: any) {
        console.log(`   ❌ Batch endpoint error: ${e.message}`);
    }

    // 5. Check item_group endpoint
    console.log('\n5️⃣  Checking item_group data...\n');

    const sampleGroupId = items[0].id_item_group;
    try {
        const response = await fetch(`${baseUrl}/item_group/${sampleGroupId}`, { headers });
        if (response.ok) {
            const group = await response.json();
            console.log(`   ✅ Item group endpoint works!`);
            console.log(`   Group data:`, JSON.stringify(group, null, 2).substring(0, 800));
        }
    } catch (e: any) {
        console.log(`   ❌ Item group error: ${e.message}`);
    }

    // 6. Analyze items that DO have prices
    console.log('\n6️⃣  Analyzing items with prices...\n');

    if (itemsWithPrices.length > 0) {
        console.log(`   Found ${itemsWithPrices.length} items with prices:\n`);
        itemsWithPrices.slice(0, 10).forEach((item: any, idx: number) => {
            console.log(`   ${idx + 1}. ${item.item}`);
            console.log(`      Category: ${item.category}`);
            console.log(`      price_retail: $${item.price_retail}`);
            console.log(`      price_otd: $${item.price_otd}`);
            console.log(`      Is Cannabis: ${item.is_cannabis}`);
            console.log(`      Brand: ${item.brand}`);
            console.log('');
        });

        // Check if there's a pattern
        const categories = itemsWithPrices.map((i: any) => i.category);
        const uniqueCategories = [...new Set(categories)];
        console.log(`   Categories with prices: ${uniqueCategories.join(', ')}`);
    }

    console.log('\n═'.repeat(60));
    console.log('\n📋 Summary & Recommendations\n');
    console.log(`1. Items with prices: ${itemsWithPrices.length}/${items.length} (${(itemsWithPrices.length/items.length*100).toFixed(1)}%)`);
    console.log(`2. Items without prices: ${items.length - itemsWithPrices.length}`);
    console.log(`3. Price fields available: ${priceFields.join(', ')}`);
    console.log('\nNext Steps:');
    console.log('- Check Alleaves admin panel for price configuration');
    console.log('- Contact Alleaves support about missing pricing data');
    console.log('- Check if prices need to be configured per location/channel');
    console.log('- Verify if retail prices are set in the POS system');
}

investigatePricing().catch(console.error);
