/**
 * Create Test Products for Ecstatic Edibles Pilot
 *
 * Products:
 * 1. Snickerdoodle Bites - $24.99
 * 2. Cheesecake Bliss Gummies - $29.99
 */
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const path = require('path');

const app = getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert(path.resolve(__dirname, '../service-account.json'))
});
const firestore = getFirestore(app);

const BRAND_ID = 'brand_ecstatic_edibles';

const products = [
    {
        id: 'prod_snickerdoodle_bites',
        name: 'Snickerdoodle Bites',
        description: "Indulge in the warm, nostalgic flavors of cinnamon and sugar with our Snickerdoodle Bites. Each delicious morsel delivers a precise 25mg of premium hemp-derived Delta-8 THC for a smooth, euphoric experience. Perfect for unwinding after a long day.",
        category: 'Edibles',
        price: 24.99,
        imageUrl: '', // ENGINEER: Add image URL
        imageHint: 'snickerdoodle cookie hemp edible gummy',
        brandId: BRAND_ID,
        featured: true,
        sortOrder: 1,
        // Hemp/Edibles specific fields
        weight: 50,
        weightUnit: 'g',
        servings: 10,
        mgPerServing: 25,
        shippable: true,
        shippingRestrictions: [], // No restrictions
        // Metadata
        source: 'manual',
        likes: 0,
    },
    {
        id: 'prod_cheesecake_bliss',
        name: 'Cheesecake Bliss Gummies',
        description: "Experience dessert-inspired bliss with our Cheesecake Gummies. Crafted with premium hemp-derived CBD and Delta-8, each gummy delivers 15mg of cannabinoids in a creamy, tangy cheesecake flavor. A guilt-free treat for any time of day.",
        category: 'Edibles',
        price: 29.99,
        imageUrl: '', // ENGINEER: Add image URL
        imageHint: 'cheesecake gummy hemp edible candy',
        brandId: BRAND_ID,
        featured: true,
        sortOrder: 2,
        // Hemp/Edibles specific fields
        weight: 75,
        weightUnit: 'g',
        servings: 15,
        mgPerServing: 15,
        shippable: true,
        shippingRestrictions: [],
        // Metadata
        source: 'manual',
        likes: 0,
    }
];

async function createProducts() {
    console.log('🍪 Creating Ecstatic Edibles test products...\n');

    for (const product of products) {
        console.log(`📦 Creating: ${product.name}`);

        await firestore.collection('products').doc(product.id).set({
            ...product,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log(`   ✅ ${product.name} created`);
        console.log(`      Price: $${product.price}`);
        console.log(`      Servings: ${product.servings} @ ${product.mgPerServing}mg each`);
        console.log(`      Total: ${product.servings * product.mgPerServing}mg`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 PRODUCTS CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('');
    console.log('📋 Product Summary:');
    console.log('   1. Snickerdoodle Bites - $24.99 (10 servings, 25mg each)');
    console.log('   2. Cheesecake Bliss Gummies - $29.99 (15 servings, 15mg each)');
    console.log('');
    console.log('⚠️  IMPORTANT: Add product images to complete setup!');
    console.log('   Update imageUrl field in Firestore or via Dashboard');
    console.log('');
    console.log('🔗 View products at: https://bakedbot.ai/ecstaticedibles');
    console.log('='.repeat(60));
}

createProducts().catch(console.error);
