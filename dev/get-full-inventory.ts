/**
 * Get full inventory data from Alleaves
 */

async function getFullInventory() {
    const username = 'bakedbotai@thrivesyracuse.com';
    const password = 'Dreamchasing2030!!@@!!';
    const pin = '1234';
    const baseUrl = 'https://app.alleaves.com/api';

    // Authenticate
    const authResponse = await fetch(`${baseUrl}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, pin }),
    });
    const authData = await authResponse.json();
    const token = authData.token;
    console.log('✅ Authenticated\n');

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    // Get full inventory
    console.log('📦 Fetching full inventory...\n');
    const response = await fetch(`${baseUrl}/inventory/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: '' }), // Empty query to get all
    });

    if (response.ok) {
        const items = await response.json();
        console.log(`✅ Found ${items.length} inventory items\n`);

        if (items.length > 0) {
            // Show first 3 items in detail
            console.log('📋 Sample Items:\n');
            items.slice(0, 3).forEach((item: any, idx: number) => {
                console.log(`${idx + 1}. Item ID: ${item.id_item}`);
                console.log(`   Batch ID: ${item.id_batch}`);
                console.log(`   Item Group: ${item.id_item_group}`);
                console.log(`   Location: ${item.id_location}`);
                console.log(`   Adult Use: ${item.is_adult_use}`);
                console.log(`   Cannabis: ${item.is_cannabis}`);
                console.log(`   Cost: $${item.batch_cost_of_good}`);

                // Show all keys for first item
                if (idx === 0) {
                    console.log(`\n   All keys for first item:`);
                    console.log(`   ${Object.keys(item).join(', ')}`);
                }
                console.log('');
            });

            // Save full data to file
            const fs = await import('fs');
            fs.writeFileSync('alleaves-inventory-full.json', JSON.stringify(items, null, 2));
            console.log('✅ Full inventory saved to: alleaves-inventory-full.json\n');

            // Analyze the data structure
            console.log('📊 Data Analysis:\n');

            const categories: Record<string, number> = {};
            const itemGroups: Record<string, number> = {};

            items.forEach((item: any) => {
                // Try to find category or product type
                if (item.category) categories[item.category] = (categories[item.category] || 0) + 1;
                if (item.item_group) itemGroups[item.item_group] = (itemGroups[item.item_group] || 0) + 1;
            });

            console.log('Categories:', Object.keys(categories).length > 0 ? categories : 'Not found in this structure');
            console.log('Item Groups:', Object.keys(itemGroups).length > 0 ? itemGroups : 'Not found in this structure');

            // Check for adult use vs medical
            const adultUse = items.filter((i: any) => i.is_adult_use).length;
            const medical = items.filter((i: any) => i.is_medical_use).length;
            console.log(`\nAdult Use items: ${adultUse}`);
            console.log(`Medical items: ${medical}`);

            console.log('\n🎯 Next: Check if there\'s an item details endpoint to get full product info');
        }
    } else {
        console.error('Error:', response.status, await response.text());
    }
}

getFullInventory().catch(console.error);
