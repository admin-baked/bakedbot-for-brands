email/**
 * Dev Script: List Recent Users and Configure Brand
 * 
 * This script will:
 * 1. List recent users to find the correct account
 * 2. Configure 40 Tons brand for the selected user
 * 
 * Run with: npx tsx dev/list-and-configure-user.ts
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';
 (getApps().length > 0) {
        return getApps()[0];
    }

    const serviceAccountPath = path.resolve(__dirname, '../service-account.json');

    return initializeApp({
        credential: cert(serviceAccountPath)
    });
}

async function main() {
    const app =                                                                                     ();
    const firestore = getFirestore(app);
    const auth = getAuth(app);

    console.log('🔍 Listing recent users...\n');

    // List users from Firestore (users collection)
    const usersSnapshot = await firestore.collection('users')
        .orderBy('onboardingCompletedAt', 'desc')
        .limit(20)
        .get();

    console.log('📋 Users found in Firestore:\n');

    const users: { uid: string; email: string; role: string; brandId?: string }[] = [];

    for (const doc of usersSnapshot.docs) {
        const data = doc.data();
        console.log(`UID: ${doc.id}`);
        console.log(`  Email: ${data.email || 'N/A'}`);
        console.log(`  Role: ${data.role || 'N/A'}`);
        console.log(`  Brand ID: ${data.brandId || 'N/A'}`);
        console.log(`  Onboarded: ${data.onboardingCompletedAt || 'N/A'}`);
        console.log('');

        users.push({
            uid: doc.id,
            email: data.email,
            role: data.role,
            brandId: data.brandId
        });
    }

    // Also list from Firebase Auth
    console.log('\n📋 Recent users in Firebase Auth:\n');

    const listResult = await auth.listUsers(20);
    for (const userRecord of listResult.users) {
        console.log(`UID: ${userRecord.uid}`);
        console.log(`  Email: ${userRecord.email}`);
        console.log(`  Created: ${userRecord.metadata.creationTime}`);
        console.log(`  Last Sign In: ${userRecord.metadata.lastSignInTime}`);
        console.log('');
    }

    // Find user with "martez" in email (case insensitive)
    console.log('\n🔍 Searching for "martez" in emails...\n');

    const martezUsers = listResult.users.filter(u =>
        u.email?.toLowerCase().includes('martez')
    );

    if (martezUsers.length > 0) {
        console.log('Found matching users:');
        for (const u of martezUsers) {
            console.log(`  - ${u.email} (${u.uid})`);
        }

        // Configure the first match
        const targetUser = martezUsers[0];
        console.log(`\n⚙️ Configuring ${targetUser.email} with 40 Tons brand...`);

        await configureUser(firestore, auth, targetUser.uid, targetUser.email!);
    } else {
        console.log('No users found with "martez" in email.');
        console.log('\nTo manually configure a user, run:');
        console.log('  npx tsx dev/list-and-configure-user.ts <UID>');
    }
}

async function configureUser(firestore: any, auth: any, uid: string, email: string) {
    const BRAND_NAME = '40 Tons';
    const BRAND_ID = 'brand_40tons';
    const ORG_ID = 'org_40tons';

    // 1. Create/Update Brand Document
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
        productCount: 12,
        retailerCount: 8,
        markets: ['California', 'Arizona', 'Nevada']
    }, { merge: true });
    console.log('✅ Brand created/updated');

    // 2. Create Organization
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

    // 3. Update User Profile
    console.log('👤 Updating user profile');
    const userRef = firestore.collection('users').doc(uid);
    await userRef.set({
        email: email,
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

    // 4. Set Custom Claims
    console.log('🔐 Setting custom claims');
    await auth.setCustomUserClaims(uid, {
        role: 'brand',
        orgId: ORG_ID,
        brandId: BRAND_ID,
        planId: 'scale'
    });
    console.log('✅ Custom claims set');

    // 5. Create sample products
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
    console.log('User:', email);
    console.log('Plan: Scale ($700/mo)');
    console.log('=====================================');
    console.log('\n⚠️  User must log out and log back in for claims to take effect.');
}

main().catch(console.error);
