/**
 * Check if Alleaves API provides product images
 */

async function checkAleavesImages() {
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

    // Check for image-related fields
    console.log('═'.repeat(70));
    console.log('\n🖼️  IMAGE FIELD ANALYSIS\n');

    const sampleItem = items[0];
    const allFields = Object.keys(sampleItem);

    console.log('All available fields in API response:');
    console.log(allFields.join(', '));
    console.log('\n');

    const imageFields = allFields.filter(k =>
        k.toLowerCase().includes('image') ||
        k.toLowerCase().includes('photo') ||
        k.toLowerCase().includes('picture') ||
        k.toLowerCase().includes('img') ||
        k.toLowerCase().includes('url') ||
        k.toLowerCase().includes('media')
    );

    console.log('Image-related fields found:');
    if (imageFields.length > 0) {
        console.log(`   ${imageFields.join(', ')}\n`);

        // Show sample values
        console.log('Sample values from first 5 items:');
        items.slice(0, 5).forEach((item: any, idx: number) => {
            console.log(`\n   Item ${idx + 1}: ${item.item}`);
            imageFields.forEach(field => {
                console.log(`      ${field}: ${item[field]}`);
            });
        });
    } else {
        console.log('   ❌ No image-related fields found in API response\n');
    }

    // Check if there's a product details endpoint
    console.log('\n\n🔍 Checking for detailed product endpoint...\n');

    const firstItemId = items[0].id_item;
    console.log(`   Trying to fetch details for product ID: ${firstItemId}\n`);

    try {
        const detailResponse = await fetch(`${baseUrl}/inventory/${firstItemId}`, {
            headers,
        });

        if (detailResponse.ok) {
            const detailData = await detailResponse.json();
            console.log('   ✅ Product detail endpoint exists!');
            console.log('\n   Fields in detail response:');
            console.log('   ' + Object.keys(detailData).join(', '));

            const detailImageFields = Object.keys(detailData).filter(k =>
                k.toLowerCase().includes('image') ||
                k.toLowerCase().includes('photo') ||
                k.toLowerCase().includes('url')
            );

            if (detailImageFields.length > 0) {
                console.log('\n   🖼️  Image fields in detail response:');
                detailImageFields.forEach(field => {
                    console.log(`      ${field}: ${detailData[field]}`);
                });
            }
        } else {
            console.log('   ❌ No product detail endpoint available');
        }
    } catch (error) {
        console.log('   ❌ Failed to fetch product details:', error);
    }

    console.log('\n' + '═'.repeat(70));
    console.log('\n💡 RECOMMENDATIONS\n');

    if (imageFields.length > 0) {
        console.log('   ✅ Alleaves provides image data!');
        console.log(`   → Update alleaves.ts to map these fields: ${imageFields.join(', ')}`);
    } else {
        console.log('   ❌ Alleaves does NOT provide image URLs in the API');
        console.log('   → Options:');
        console.log('      1. Use placeholder images');
        console.log('      2. Request Alleaves to add image support');
        console.log('      3. Upload custom images to Firestore');
        console.log('      4. Use a generic cannabis product image service');
    }
}

checkAleavesImages().catch(console.error);
