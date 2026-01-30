/**
 * Fetch product data directly from Dispense API
 */

const VENUE_ID = '13455748f2d363fd'; // Thrive Syracuse venue ID from their menu page
const DISPENSE_API_BASE = 'https://api.dispenseapp.com';

interface DispenseProduct {
    id: string;
    name: string;
    brand?: string;
    category?: string;
    image?: string;
    imageUrl?: string;
    price?: number;
    thc?: number;
    cbd?: number;
}

async function fetchDispenseMenu() {
    console.log('🌐 Fetching Thrive Syracuse menu from Dispense API...\n');
    console.log('═'.repeat(70));
    console.log(`\nVenue ID: ${VENUE_ID}\n`);

    try {
        // Try common Dispense API endpoints
        const endpoints = [
            `/v2/venues/${VENUE_ID}/menu`,
            `/v2/venues/${VENUE_ID}/products`,
            `/venues/${VENUE_ID}/menu`,
            `/venues/${VENUE_ID}/products`,
            `/menu/${VENUE_ID}`,
            `/products/${VENUE_ID}`,
        ];

        for (const endpoint of endpoints) {
            const url = `${DISPENSE_API_BASE}${endpoint}`;
            console.log(`📡 Trying: ${url}`);

            try {
                const response = await fetch(url, {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                console.log(`   Status: ${response.status} ${response.statusText}`);

                if (response.ok) {
                    const data = await response.json();
                    console.log(`\n   ✅ Success! Found data at: ${endpoint}`);
                    console.log(`   Response keys: ${Object.keys(data).join(', ')}`);

                    // Save the response
                    const fs = require('fs');
                    const path = require('path');
                    const savePath = path.join(process.cwd(), 'dev', 'dispense-api-response.json');
                    fs.writeFileSync(savePath, JSON.stringify(data, null, 2));
                    console.log(`   💾 Saved to: ${savePath}\n`);

                    // Try to extract products
                    const products: DispenseProduct[] = extractProducts(data);

                    if (products.length > 0) {
                        console.log(`\n📦 Found ${products.length} products!\n`);

                        // Show samples
                        console.log('Sample products:');
                        products.slice(0, 5).forEach((p, idx) => {
                            console.log(`\n   ${idx + 1}. ${p.name}`);
                            console.log(`      Brand: ${p.brand || 'N/A'}`);
                            console.log(`      Category: ${p.category || 'N/A'}`);
                            console.log(`      Image: ${p.image || p.imageUrl || 'N/A'}`);
                        });

                        // Save products
                        const productsPath = path.join(process.cwd(), 'dev', 'dispense-products.json');
                        fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
                        console.log(`\n   💾 Saved products to: ${productsPath}`);

                        return products;
                    }
                }
            } catch (error: any) {
                console.log(`   ❌ Error: ${error.message}`);
            }

            console.log('');
        }

        console.log('\n⚠️  No publicly accessible API endpoint found');
        console.log('\n💡 Alternatives:');
        console.log('   1. Continue using category-based placeholders (current solution)');
        console.log('   2. Use browser automation to scrape the rendered menu');
        console.log('   3. Request API access from Dispense');
        console.log('   4. Upload custom product images via dashboard');

    } catch (error) {
        console.error('\n❌ Failed:', error);
        throw error;
    }
}

function extractProducts(data: any): DispenseProduct[] {
    const products: DispenseProduct[] = [];

    // Try to find products in common data structures
    const tryPaths = [
        data.products,
        data.items,
        data.data?.products,
        data.data?.items,
        data.menu?.products,
        data.menu?.items,
    ];

    for (const path of tryPaths) {
        if (Array.isArray(path) && path.length > 0) {
            return path.map((p: any) => ({
                id: p.id || p._id || p.productId,
                name: p.name || p.productName || p.title,
                brand: p.brand || p.brandName,
                category: p.category || p.type || p.productType,
                image: p.image || p.imageUrl || p.photo || p.thumbnail,
                price: p.price || p.retailPrice,
                thc: p.thc || p.thcPercent,
                cbd: p.cbd || p.cbdPercent,
            }));
        }
    }

    return products;
}

fetchDispenseMenu()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
