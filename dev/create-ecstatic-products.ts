/**
 * Create Products for Ecstatic Edibles Pilot
 *
 * Products:
 * 1. Snicker Doodle Bites - $10
 * 2. Berry Cheesecake Gummies - $10
 * 3. "If You Hit This We Go Together" Hoodie - $40
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
        name: 'Snicker Doodle Bites',
        description: "Warm cinnamon and brown sugar meet premium hemp in these irresistible Snicker Doodle Bites. Each piece is infused with lab-tested Delta-8 THC for a smooth, mellow experience that's perfect for unwinding. Baked with love using real butter and organic cinnamon - just like grandma's recipe, but with a little extra ecstasy.",
        category: 'Edibles',
        price: 10.00,
        imageUrl: '', // Images to be added from dashboard
        imageHint: 'snickerdoodle cookie hemp edible treat cinnamon',
        brandId: BRAND_ID,
        featured: true,
        sortOrder: 1,
        // Hemp/Edibles specific fields
        weight: 30,
        weightUnit: 'g',
        servings: 6,
        mgPerServing: 10,
        shippable: true,
        shippingRestrictions: [],
        // Metadata
        source: 'manual',
        likes: 0,
        effects: ['Relaxed', 'Happy', 'Uplifted'],
        strainType: 'hybrid',
    },
    {
        id: 'prod_berry_cheesecake_gummies',
        name: 'Berry Cheesecake Gummies',
        description: "Indulge in dessert without the guilt. Our Berry Cheesecake Gummies blend tangy berry swirls with rich, creamy cheesecake flavor - all infused with premium hemp-derived cannabinoids. Each gummy delivers consistent dosing for a reliably blissful experience. Vegan-friendly and absolutely delicious.",
        category: 'Edibles',
        price: 10.00,
        imageUrl: '', // Images to be added from dashboard
        imageHint: 'berry cheesecake gummy hemp edible candy purple',
        brandId: BRAND_ID,
        featured: true,
        sortOrder: 2,
        // Hemp/Edibles specific fields
        weight: 30,
        weightUnit: 'g',
        servings: 6,
        mgPerServing: 10,
        shippable: true,
        shippingRestrictions: [],
        // Metadata
        source: 'manual',
        likes: 0,
        effects: ['Relaxed', 'Creative', 'Euphoric'],
        strainType: 'indica',
    },
    {
        id: 'prod_we_go_together_hoodie',
        name: '"If You Hit This We Go Together" Hoodie',
        description: "Rep the vibe with our signature hoodie. Bold statement, soft cotton blend, and that perfect oversized fit for maximum comfort. Whether you're passing left or just chilling, this hoodie lets everyone know you're down for the session. Premium heavyweight fleece keeps you cozy - because good things are meant to be shared.",
        category: 'Apparel',
        price: 40.00,
        imageUrl: '', // Images to be added from dashboard
        imageHint: 'black hoodie streetwear cannabis lifestyle apparel',
        brandId: BRAND_ID,
        featured: true,
        sortOrder: 3,
        // Apparel specific fields
        shippable: true,
        shippingRestrictions: [],
        // Size options would be managed separately or via variants
        // Metadata
        source: 'manual',
        likes: 0,
    }
];

async function createProducts() {
    console.log('🍪 Creating Ecstatic Edibles products...\n');

    for (const product of products) {
        console.log(`📦 Creating: ${product.name}`);

        await firestore.collection('products').doc(product.id).set({
            ...product,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log(`   ✅ ${product.name} created`);
        console.log(`      Price: $${product.price.toFixed(2)}`);
        if (product.servings) {
            console.log(`      Servings: ${product.servings} @ ${product.mgPerServing}mg each`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 PRODUCTS CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('');
    console.log('📋 Product Summary:');
    console.log('   1. Snicker Doodle Bites - $10.00');
    console.log('   2. Berry Cheesecake Gummies - $10.00');
    console.log('   3. "If You Hit This We Go Together" Hoodie - $40.00');
    console.log('');
    console.log('⚠️  IMPORTANT: Add product images from the dashboard!');
    console.log('');
    console.log('🔗 View products at: https://ecstaticedibles.bakedbot.ai');
    console.log('='.repeat(60));
}

createProducts().catch(console.error);
