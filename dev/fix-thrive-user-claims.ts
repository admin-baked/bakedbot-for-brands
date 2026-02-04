/**
 * Fix Thrive Syracuse User Custom Claims
 *
 * Ensures the user has proper brandId and orgId custom claims
 * Run: npx tsx dev/fix-thrive-user-claims.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const EMAIL = 'thrivesyracuse@bakedbot.ai';
const BRAND_ID = 'brand_thrive_syracuse';
const ORG_ID = 'org_thrive_syracuse';
const LOCATION_ID = 'loc_thrive_syracuse';

// Initialize Firebase
const apps = getApps();
let app;

if (apps.length === 0) {
    const serviceAccount = JSON.parse(
        fs.readFileSync('./firebase-service-account.json', 'utf8')
    );
    app = initializeApp({
        credential: cert(serviceAccount),
    });
} else {
    app = apps[0];
}

const auth = getAuth(app);
const db = getFirestore(app);

async function fixUserClaims() {
    console.log('🔧 FIXING THRIVE SYRACUSE USER CLAIMS\n');

    try {
        // Find user
        const user = await auth.getUserByEmail(EMAIL);
        console.log(`✅ Found user: ${user.uid}`);

        // Check current claims
        console.log('\n📋 Current custom claims:', JSON.stringify(user.customClaims, null, 2));

        // Set correct claims
        // Note: We set both orgId AND currentOrgId for compatibility with different code paths
        console.log('\n🔐 Setting custom claims...');
        await auth.setCustomUserClaims(user.uid, {
            role: 'dispensary',
            orgId: ORG_ID,
            currentOrgId: ORG_ID, // Some code paths check currentOrgId
            brandId: BRAND_ID,
            locationId: LOCATION_ID,
            planId: 'empire',
            approvalStatus: 'approved',
        });
        console.log('✅ Custom claims set');

        // Revoke old tokens to force refresh
        console.log('\n🔄 Revoking old tokens...');
        await auth.revokeRefreshTokens(user.uid);
        console.log('✅ Old tokens revoked');

        // Also update user document in Firestore
        console.log('\n📄 Updating user document...');
        await db.collection('users').doc(user.uid).update({
            brandId: BRAND_ID,
            orgId: ORG_ID,
            currentOrgId: ORG_ID, // For compatibility
            locationId: LOCATION_ID,
            role: 'dispensary',
            approvalStatus: 'approved',
            updatedAt: new Date(),
        });
        console.log('✅ User document updated');

        console.log('\n✅ DONE!');
        console.log('\n⚠️  IMPORTANT: You must LOG OUT and LOG BACK IN to get the new token with updated claims.');
        console.log('   1. Go to your dashboard');
        console.log('   2. Click "Sign Out"');
        console.log('   3. Sign in again with:', EMAIL);
        console.log('   4. Refresh the Customers page');

    } catch (error: any) {
        console.error('❌ Failed:', error.message);
        process.exit(1);
    }
}

fixUserClaims()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
