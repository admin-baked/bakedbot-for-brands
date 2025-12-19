/**
 * Configure specific user with Scale plan
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';

const app = getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert(path.resolve(__dirname, '../service-account.json'))
});
const firestore = getFirestore(app);
const auth = getAuth(app);

// USER PROVIDED UID
const UID = '4MfsakrkMFMoJpSeNXVjxxL0v5h1';
const EMAIL = 'martezandco@gmail.com';

async function main() {
    const BRAND_NAME = '40 Tons';
    const BRAND_ID = 'brand_40tons';
    const ORG_ID = 'org_40tons';

    console.log('⚙️ Configuring user', UID, 'with Scale plan...\n');

    // Brand
    console.log('📦 Creating brand:', BRAND_NAME);
    await firestore.collection('brands').doc(BRAND_ID).set({
        id: BRAND_ID,
        name: BRAND_NAME,
        slug: '40-tons',
        description: 'Premium cannabis brand',
        verified: true,
        ownerId: UID,
        productCount: 12,
        retailerCount: 8,
        markets: ['California', 'Arizona', 'Nevada'],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('✅ Brand created');

    // Organization
    console.log('🏢 Creating organization');
    await firestore.collection('organizations').doc(ORG_ID).set({
        id: ORG_ID,
        name: BRAND_NAME,
        type: 'brand',
        ownerId: UID,
        brandId: BRAND_ID,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        settings: {
            policyPack: 'balanced',
            allowOverrides: true,
            hipaaMode: false
        },
        billing: {
            subscriptionStatus: 'active',
            planId: 'scale',
            planName: 'Scale',
            monthlyPrice: 700,
            billingCycleStart: new Date().toISOString(),
            features: {
                maxZips: 500,
                maxPlaybooks: 50,
                advancedReporting: true,
                prioritySupport: true,
                coveragePacksEnabled: true
            }
        }
    }, { merge: true });
    console.log('✅ Organization created');

    // User profile
    console.log('👤 Updating user profile');
    await firestore.collection('users').doc(UID).set({
        email: EMAIL,
        role: 'brand',
        isNewUser: false,
        onboardingCompletedAt: new Date().toISOString(),
        organizationIds: [ORG_ID],
        currentOrgId: ORG_ID,
        brandId: BRAND_ID,
        billing: {
            planId: 'scale',
            planName: 'Scale',
            status: 'active',
            monthlyPrice: 700
        },
        updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('✅ User profile updated');

    // Custom claims
    console.log('🔐 Setting custom claims');
    await auth.setCustomUserClaims(UID, {
        role: 'brand',
        orgId: ORG_ID,
        brandId: BRAND_ID,
        planId: 'scale'
    });
    console.log('✅ Custom claims set');

    // Sample products
    console.log('📦 Creating sample products');
    const products = [
        { name: 'Blue Dream', category: 'Flower', thc: '22%', price: 45 },
        { name: 'OG Kush', category: 'Flower', thc: '24%', price: 50 },
        { name: 'Gelato Vape', category: 'Vape', thc: '85%', price: 55 }
    ];

    for (const product of products) {
        const productId = `product_${BRAND_ID}_${product.name.toLowerCase().replace(/\s+/g, '_')}`;
        await firestore.collection('products').doc(productId).set({
            id: productId,
            brandId: BRAND_ID,
            orgId: ORG_ID,
            name: product.name,
            category: product.category,
            thcContent: product.thc,
            price: product.price,
            status: 'active',
            retailerIds: ['retailer_1', 'retailer_2', 'retailer_3'],
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
    }
    console.log('✅ Sample products created');

    console.log('\n🎉 Configuration complete!');
    console.log('=====================================');
    console.log('Brand:', BRAND_NAME);
    console.log('Brand ID:', BRAND_ID);
    console.log('Org ID:', ORG_ID);
    console.log('User UID:', UID);
    console.log('Plan: Scale ($700/mo)');
    console.log('=====================================');
    console.log('\n⚠️  User MUST log out and log back in for claims to take effect!');
}

main().catch(console.error);
