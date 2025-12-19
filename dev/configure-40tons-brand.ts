/**
 * Dev Script: Configure 40 Tons Brand for Scale Account
 * 
 * This script will:
 * 1. Find or create the 40 Tons brand
 * 2. Link it to the test user (martezandco@gmail.com)
 * 3. Update user profile with Scale plan
 * 4. Create organization and proper claims
 * 
 * Run with: npx ts-node dev/configure-40tons-brand.ts
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';

// Initialize Firebase Admin
function initializeFirebaseAdmin(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const serviceAccountPath = path.resolve(__dirname, '../service-account.json');

    return initializeApp({
        credential: cert(serviceAccountPath)
    });
}

async function main() {
    const app = initializeFirebaseAdmin();
    const firestore = getFirestore(app);
    const auth = getAuth(app);

    const TEST_EMAIL = 'martezandco@gmail.com';
    const BRAND_NAME = '40 Tons';
    const BRAND_ID = 'brand_40tons';
    const ORG_ID = 'org_40tons';

    console.log('🔍 Finding user by email:', TEST_EMAIL);

    // 1. Find user by email
    let userRecord;
    try {
        userRecord = await auth.getUserByEmail(TEST_EMAIL);
        console.log('✅ Found user:', userRecord.uid);
    } catch (error) {
        console.error('❌ User not found. Create account first via onboarding.');
        process.exit(1);
    }

    const uid = userRecord.uid;

    // 2. Create/Update Brand Document
    console.log('📦 Creating brand:', BRAND_NAME);
    const brandRef = firestore.collection('brands').doc(BRAND_ID);
    await brandRef.set({
        id: BRAND_ID,
        name: BRAND_NAME,
        slug: '40-tons',
        description: 'Premium cannabis brand',
        verified: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        ownerId: uid,
        // Sample products for testing
        productCount: 12,
        retailerCount: 8,
        markets: ['California', 'Arizona', 'Nevada']
    }, { merge: true });
    console.log('✅ Brand created/updated');

    // 3. Create Organization
    console.log('🏢 Creating organization');
    const orgRef = firestore.collection('organizations').doc(ORG_ID);
    await orgRef.set({
        id: ORG_ID,
        name: BRAND_NAME,
        type: 'brand',
        ownerId: uid,
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

    // 4. Update User Profile
    console.log('👤 Updating user profile');
    const userRef = firestore.collection('users').doc(uid);
    await userRef.set({
        email: TEST_EMAIL,
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

    // 5. Set Custom Claims
    console.log('🔐 Setting custom claims');
    await auth.setCustomUserClaims(uid, {
        role: 'brand',
        orgId: ORG_ID,
        brandId: BRAND_ID,
        planId: 'scale'
    });
    console.log('✅ Custom claims set');

    // 6. Create sample products
    console.log('📦 Creating sample products');
    const products = [
        { name: 'Blue Dream', category: 'Flower', thc: '22%', price: 45 },
        { name: 'OG Kush', category: 'Flower', thc: '24%', price: 50 },
        { name: 'Sunset Sherbet', category: 'Flower', thc: '20%', price: 42 },
        { name: 'Gelato Vape', category: 'Vape', thc: '85%', price: 55 },
        { name: 'Indica Gummies', category: 'Edible', thc: '10mg', price: 25 }
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

    // 7. Create sample playbooks
    console.log('📚 Creating sample playbooks');
    const playbooks = [
        { name: 'Retail Coverage Builder', category: 'Growth', enabled: true },
        { name: 'Stock Alert Nudge', category: 'Operations', enabled: true },
        { name: 'Competitor Price Watch', category: 'Intelligence', enabled: false }
    ];

    for (const playbook of playbooks) {
        const playbookId = `playbook_${BRAND_ID}_${playbook.name.toLowerCase().replace(/\s+/g, '_')}`;
        await firestore.collection('playbooks').doc(playbookId).set({
            id: playbookId,
            brandId: BRAND_ID,
            orgId: ORG_ID,
            name: playbook.name,
            category: playbook.category,
            enabled: playbook.enabled,
            runsToday: Math.floor(Math.random() * 10),
            lastRun: new Date().toISOString(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
    }
    console.log('✅ Sample playbooks created');

    console.log('\n🎉 Configuration complete!');
    console.log('=====================================');
    console.log('Brand:', BRAND_NAME);
    console.log('Brand ID:', BRAND_ID);
    console.log('Org ID:', ORG_ID);
    console.log('User:', TEST_EMAIL);
    console.log('Plan: Scale ($700/mo)');
    console.log('=====================================');
    console.log('\n⚠️  User must log out and log back in for claims to take effect.');
}

main().catch(console.error);
