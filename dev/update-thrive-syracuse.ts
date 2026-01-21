/**
 * Update Thrive Syracuse - Fix Brand Colors and Add Product Images
 *
 * Updates:
 * 1. Brand colors to match actual website (Teal #27c0dd, Gold #f1b200)
 * 2. Product images from Weedmaps
 *
 * Run with: npx ts-node --transpile-only dev/update-thrive-syracuse.ts
 */
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const path = require('path');

const app = getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert(path.resolve(__dirname, '../service-account.json'))
});
const firestore = getFirestore(app);

const BRAND_ID = 'brand_thrive_syracuse';

// Correct Thrive Syracuse brand colors from their website
const UPDATED_THEME = {
    primaryColor: '#27c0dd',    // Teal/Cyan (primary brand color)
    secondaryColor: '#f1b200',  // Gold/Yellow (CTA buttons)
    accentColor: '#FFFFFF',     // White
};

// Product images from Weedmaps - mapped by product name
const PRODUCT_IMAGES: Record<string, string> = {
    // Flower
    'Coconut Cream': 'https://images.weedmaps.com/products/000/845/918/avatar/1748351844-coconut_cream__1_.jpg',
    'Delphi Diesel Whole Flower': 'https://images.weedmaps.com/products/000/865/486/avatar/1751318693-2.jpg',
    'Gelato Sorbet Value Line': 'https://images.weedmaps.com/products/000/828/009/avatar/1744659184-cb_rolling_green_gelato_sorbet_jar_wb_4999.jpg',
    'Lilac Diesel': 'https://images.weedmaps.com/products/000/631/205/avatar/1726092455-1705348154-lilacdiesel.jpg',
    'Oreoz Premium Flower': 'https://images.weedmaps.com/products/000/827/960/avatar/1744659182-cb_rolling_green_oreoz_jar_wb_1679.jpg',
    'Orange Cookies': 'https://images.weedmaps.com/products/000/611/741/avatar/1721934811-ny-matter-flower-jar-eighths__1_.png',
    'Blue Dream': 'https://images.weedmaps.com/products/000/631/195/avatar/1726092366-1705346995-blue_dream.jpg',
    'Dynamite Cookies': 'https://images.weedmaps.com/products/000/432/356/avatar/1709748355-dynamitecookies__2_.png',
    'Scotties Cake': 'https://images.weedmaps.com/products/000/611/749/avatar/1721934836-ny-matter-flower-jar-eighths__1_.png',
    'Space Cake CBD': 'https://images.weedmaps.com/products/000/692/613/avatar/1739900222-revert-mockup-8th-space_cake.png',

    // Pre-Rolls
    'Spritzer Pre-Roll': 'https://images.weedmaps.com/products/000/692/610/avatar/1739901057-revert-mockup-preroll-spritzer.png',

    // Generic category images for products without specific images
    'DEFAULT_FLOWER': 'https://images.weedmaps.com/products/000/631/195/avatar/1726092366-1705346995-blue_dream.jpg',
    'DEFAULT_EDIBLES': 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400',
    'DEFAULT_VAPES': 'https://images.unsplash.com/photo-1560913210-91e6c6774f6c?w=400',
    'DEFAULT_CONCENTRATES': 'https://images.unsplash.com/photo-1616486701797-0f33f61038ec?w=400',
    'DEFAULT_PREROLL': 'https://images.weedmaps.com/products/000/692/610/avatar/1739901057-revert-mockup-preroll-spritzer.png',
};

// Function to find the best matching image for a product
function findProductImage(productName: string, category: string): string {
    // First try exact match
    for (const [key, url] of Object.entries(PRODUCT_IMAGES)) {
        if (key.startsWith('DEFAULT_')) continue;
        if (productName.toLowerCase().includes(key.toLowerCase()) ||
            key.toLowerCase().includes(productName.toLowerCase().split(' ')[0])) {
            return url;
        }
    }

    // Fall back to category default
    const categoryKey = `DEFAULT_${category.toUpperCase().replace('-', '')}`;
    if (PRODUCT_IMAGES[categoryKey]) {
        return PRODUCT_IMAGES[categoryKey];
    }

    // Ultimate fallback
    return PRODUCT_IMAGES['DEFAULT_FLOWER'];
}

async function updateThriveSyracuse() {
    console.log('🔄 Updating Thrive Syracuse...\n');

    // 1. Update brand colors
    console.log('🎨 Updating brand colors...');
    console.log(`   Primary: ${UPDATED_THEME.primaryColor} (Teal)`);
    console.log(`   Secondary: ${UPDATED_THEME.secondaryColor} (Gold)`);

    await firestore.collection('brands').doc(BRAND_ID).update({
        theme: UPDATED_THEME,
        updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('   ✅ Brand colors updated\n');

    // 2. Update product images
    console.log('📸 Updating product images...');

    const productsSnapshot = await firestore
        .collection('products')
        .where('brandId', '==', BRAND_ID)
        .get();

    if (productsSnapshot.empty) {
        console.log('   ⚠️ No products found for brand. Trying alternative query...');

        // Try querying by brand_id (snake_case)
        const altSnapshot = await firestore
            .collection('products')
            .where('brand_id', '==', BRAND_ID)
            .get();

        if (altSnapshot.empty) {
            console.log('   ❌ No products found with either field name');
            return;
        }
    }

    const products = productsSnapshot.docs;
    console.log(`   Found ${products.length} products\n`);

    let updated = 0;
    for (const doc of products) {
        const product = doc.data();
        const imageUrl = findProductImage(product.name, product.category);

        if (imageUrl && imageUrl !== product.imageUrl) {
            await firestore.collection('products').doc(doc.id).update({
                imageUrl: imageUrl,
                updatedAt: FieldValue.serverTimestamp(),
            });
            console.log(`   ✅ ${product.name} -> image updated`);
            updated++;
        } else {
            console.log(`   ⏭️ ${product.name} -> skipped (already has image or no match)`);
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total products: ${products.length}`);
    console.log(`   Images updated: ${updated}`);
    console.log('\n✅ Thrive Syracuse update complete!');
}

// Run the update
updateThriveSyracuse().catch(console.error);
