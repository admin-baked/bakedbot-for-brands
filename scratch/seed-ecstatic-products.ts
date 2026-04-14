// scratch/seed-ecstatic-products.ts
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../service-account.json');

if (!process.env.FIREBASE_PROJECT_ID) {
    initializeApp({ credential: cert(serviceAccount) });
} else {
    // Already initialized in some environments
}

const db = getFirestore();

async function run() {
    const products = [
        {
            id: 'prod_snickerdoodle',
            name: 'Snickerdoodle Bites',
            description: 'Cinnamon sugar cookie dough bites infused with 10mg THC.',
            price: 25.00,
            category: 'Edibles',
            imageUrl: 'https://images.unsplash.com/photo-1621252179027-94459d27d3ee?auto=format&fit=crop&w=800&q=80',
            thc: '10mg',
            thcPercent: 0,
            brandId: 'brand_ecstatic_edibles',
            brandName: 'Ecstatic Edibles',
            stock: 100,
            status: 'coming_soon',
            active: true,
            featured: true,
            updatedAt: new Date().toISOString()
        },
        {
            id: 'prod_cheesecake',
            name: 'Cheesecake Bliss Gummies',
            description: 'Creamy cheesecake flavor in a gummy format. 10mg THC per piece.',
            price: 28.00,
            category: 'Edibles',
            imageUrl: 'https://images.unsplash.com/photo-1582053433976-25c00369fc93?auto=format&fit=crop&w=800&q=80',
            thc: '10mg',
            thcPercent: 0,
            brandId: 'brand_ecstatic_edibles',
            brandName: 'Ecstatic Edibles',
            stock: 100,
            status: 'coming_soon',
            active: true,
            featured: true,
            updatedAt: new Date().toISOString()
        },
        {
            id: 'prod_surprise_420',
            name: 'Surprise 4/20 Drop Product',
            description: 'A special limited edition treat for 4/20. Unlock the mystery on drop day.',
            price: 42.00,
            category: 'Edibles',
            imageUrl: 'https://images.unsplash.com/photo-1628151015626-302fe57845ef?auto=format&fit=crop&w=800&q=80',
            thc: '420mg',
            thcPercent: 0,
            brandId: 'brand_ecstatic_edibles',
            brandName: 'Ecstatic Edibles',
            stock: 0,
            status: 'coming_soon',
            active: true,
            featured: true,
            trending: true,
            updatedAt: new Date().toISOString()
        }
    ];

    for (const p of products) {
        await db.collection('products').doc(p.id).set(p);
        console.log('Added product:', p.name);
    }
    console.log('Seeding complete.');
    process.exit(0);
}

run().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
