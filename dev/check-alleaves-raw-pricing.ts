/**
 * Check raw Alleaves API data for products missing prices
 */

async function checkAlleavesPricing() {
    const username = 'bakedbotai@thrivesyracuse.com';
    const password = 'Dreamchasing2030!!@@!!';
    const pin = '1234';
    const baseUrl = 'https://app.alleaves.com/api';

    console.log('🔐 Authenticating with Alleaves...\n');

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

    console.log('✅ Authenticated\n');
    console.log('📊 Fetching inventory data...\n');

    const inventoryResponse = await fetch(`${baseUrl}/inventory/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: '' }),
    });

    const items = await inventoryResponse.json();
    console.log(`   Total items from API: ${items.length}\n`);

    // Analyze pricing fields
    console.log('═'.repeat(70));
    console.log('\n1️⃣  PRICING FIELD ANALYSIS\n');

    let withRetailPrice = 0;
    let withOTDPrice = 0;
    let withCostOfGood = 0;
    let withBatchCost = 0;
    let withNoPricing = 0;

    const noPricingItems: any[] = [];

    items.forEach((item: any) => {
        const hasRetail = item.price_retail > 0;
        const hasOTD = item.price_otd > 0;
        const hasCost = item.cost_of_good > 0;
        const hasBatchCost = item.batch_cost_of_good > 0;

        if (hasRetail) withRetailPrice++;
        if (hasOTD) withOTDPrice++;
        if (hasCost) withCostOfGood++;
        if (hasBatchCost) withBatchCost++;

        if (!hasRetail && !hasOTD && !hasCost && !hasBatchCost) {
            withNoPricing++;
            noPricingItems.push(item);
        }
    });

    console.log(`   Items with price_retail:        ${withRetailPrice} (${((withRetailPrice / items.length) * 100).toFixed(1)}%)`);
    console.log(`   Items with price_otd:           ${withOTDPrice} (${((withOTDPrice / items.length) * 100).toFixed(1)}%)`);
    console.log(`   Items with cost_of_good:        ${withCostOfGood} (${((withCostOfGood / items.length) * 100).toFixed(1)}%)`);
    console.log(`   Items with batch_cost_of_good:  ${withBatchCost} (${((withBatchCost / items.length) * 100).toFixed(1)}%)`);
    console.log(`   Items with NO pricing data:     ${withNoPricing} (${((withNoPricing / items.length) * 100).toFixed(1)}%)`);

    // Sample items with no pricing
    console.log('\n\n2️⃣  SAMPLE ITEMS WITH NO PRICING DATA (First 15)\n');
    noPricingItems.slice(0, 15).forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.item}`);
        console.log(`      Brand: ${item.brand || 'N/A'}`);
        console.log(`      Category: ${item.category}`);
        console.log(`      SKU: ${item.sku}`);
        console.log(`      Is Cannabis: ${item.is_cannabis}`);
        console.log(`      Is Adult Use: ${item.is_adult_use}`);
        console.log(`      Available: ${item.available}`);
        console.log(`      price_retail: ${item.price_retail}`);
        console.log(`      price_otd: ${item.price_otd}`);
        console.log(`      cost_of_good: ${item.cost_of_good || 0}`);
        console.log(`      batch_cost_of_good: ${item.batch_cost_of_good || 0}`);
        console.log('');
    });

    // Check all possible price fields
    console.log('\n3️⃣  ALL PRICE-RELATED FIELDS IN API RESPONSE\n');
    const sampleItem = items[0];
    const allFields = Object.keys(sampleItem);
    const priceFields = allFields.filter(k =>
        k.toLowerCase().includes('price') ||
        k.toLowerCase().includes('cost') ||
        k.toLowerCase().includes('msrp') ||
        k.toLowerCase().includes('retail')
    );
    console.log(`   Fields: ${priceFields.join(', ')}\n`);

    // Category breakdown
    console.log('\n4️⃣  PRODUCTS WITH NO PRICING BY CATEGORY\n');
    const categoryBreakdown = new Map<string, number>();
    noPricingItems.forEach(item => {
        let category = item.category || 'Unknown';
        if (category.startsWith('Category > ')) {
            category = category.replace('Category > ', '');
        }
        categoryBreakdown.set(category, (categoryBreakdown.get(category) || 0) + 1);
    });

    const sortedCategories = Array.from(categoryBreakdown.entries()).sort((a, b) => b[1] - a[1]);
    sortedCategories.forEach(([category, count]) => {
        console.log(`   ${category.padEnd(20)} ${count} products`);
    });

    // Brand breakdown
    console.log('\n\n5️⃣  PRODUCTS WITH NO PRICING BY BRAND (Top 15)\n');
    const brandBreakdown = new Map<string, number>();
    noPricingItems.forEach(item => {
        const brand = item.brand || 'Unknown';
        brandBreakdown.set(brand, (brandBreakdown.get(brand) || 0) + 1);
    });

    const sortedBrands = Array.from(brandBreakdown.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);
    sortedBrands.forEach(([brand, count]) => {
        console.log(`   ${brand.padEnd(30)} ${count} products`);
    });

    console.log('\n═'.repeat(70));
    console.log('\n💡 KEY FINDINGS\n');
    console.log(`   1. ${withNoPricing}/${items.length} items (${((withNoPricing / items.length) * 100).toFixed(1)}%) have NO pricing data at all`);
    console.log(`   2. ${withCostOfGood} items have cost_of_good (we can calculate markup)`);
    console.log(`   3. ${withRetailPrice} items have price_retail (direct pricing)`);
    console.log(`\n   🔍 This means:`);
    console.log(`      - Our markup strategy works for ${withCostOfGood} items`);
    console.log(`      - ${withNoPricing} items need pricing in Alleaves admin`);
    console.log(`      - Focus on adding cost_of_good or retail prices in POS`);
}

checkAlleavesPricing().catch(console.error);
