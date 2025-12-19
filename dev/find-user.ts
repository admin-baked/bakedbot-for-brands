/**
 * Quick script to find and configure user
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';

const app = getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert(path.resolve(__dirname, '../service-account.json'))
});
const auth = getAuth(app);
const firestore = getFirestore(app);

async function main() {
    console.log('Searching for users with "martez" in email...\n');

    const result = await auth.listUsers(100);
    let found = false;

    for (const u of result.users) {
        if (u.email && u.email.toLowerCase().includes('martez')) {
            console.log('✅ FOUND:', u.uid, u.email);
            console.log('   Last Sign In:', u.metadata.lastSignInTime);
            found = true;

            // Configure this user
            await configureUser(u.uid, u.email);
        }
    }

    if (!found) {
        console.log('No users found with "martez" in email.');
        console.log('\nAll users:');
        for (const u of result.users.slice(0, 10)) {
            console.log(`  - ${u.email || 'NO_EMAIL'} (${u.uid.slice(0, 10)}...)`);
        }
    }
}

async function configureUser(uid: string, email: string) {
    const BRAND_NAME = '40 Tons';
    const BRAND_ID = 'brand_40tons';
    const ORG_ID = 'org_40tons';

    console.log('\n⚙️ Configuring', email, 'with Scale plan...');

    // Brand
    await firestore.collection('brands').doc(BRAND_ID).set({
        id: BRAND_ID,
        name: BRAND_NAME,
        slug: '40-tons',
        verified: true,
        ownerId: uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('✅ Brand created');

    // Organization
    await firestore.collection('organizations').doc(ORG_ID).set({
        id: ORG_ID,
        name: BRAND_NAME,
        type: 'brand',
        ownerId: uid,
        brandId: BRAND_ID,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        billing: {
            subscriptionStatus: 'active',
            planId: 'scale',
            planName: 'Scale',
            monthlyPrice: 700,
        }
    }, { merge: true });
    console.log('✅ Organization created');

    // User profile
    await firestore.collection('users').doc(uid).set({
        email: email,
        role: 'brand',
        brandId: BRAND_ID,
        currentOrgId: ORG_ID,
        organizationIds: [ORG_ID],
        billing: { planId: 'scale', planName: 'Scale', status: 'active' },
        updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('✅ User profile updated');

    // Custom claims
    await auth.setCustomUserClaims(uid, {
        role: 'brand',
        orgId: ORG_ID,
        brandId: BRAND_ID,
        planId: 'scale'
    });
    console.log('✅ Custom claims set');

    console.log('\n🎉 Done! User must log out and back in for claims to take effect.');
}

main().catch(console.error);
