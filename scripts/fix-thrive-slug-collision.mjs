#!/usr/bin/env node

/**
 * Fix Thrive Syracuse Slug Collision
 *
 * Problem: brands/thrivesyracuse document exists but is orphaned (not owned by Thrive)
 * Solution: Update the document to be properly owned by org_thrive_syracuse
 *
 * Run with: npx tsx scripts/fix-thrive-slug-collision.mjs
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const THRIVE_ORG_ID = 'org_thrive_syracuse';
const THRIVE_ADMIN_EMAIL = 'thrivesyracuse@bakedbot.ai';
const THRIVE_ADMIN_UID = 'naUKkibYt2OGVZsPzEhpeHwsObJ3';

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'studio-567050101-bc6e8',
    });
    console.log('✅ Firebase Admin initialized (Application Default Credentials)');
}

const db = getFirestore();

async function fixThriveSlug() {
    console.log('\n🔍 Fixing Thrive Syracuse slug collision...');
    console.log('═'.repeat(60));

    try {
        // Check if brands/thrivesyracuse exists
        const brandDoc = await db.collection('brands').doc('thrivesyracuse').get();

        if (!brandDoc.exists) {
            console.log('❌ No document found at brands/thrivesyracuse');
            console.log('   The collision may have already been resolved.');
            return;
        }

        const currentData = brandDoc.data();
        console.log('\n📄 Current document data:');
        console.log('   ID:', brandDoc.id);
        console.log('   Slug:', currentData?.slug);
        console.log('   Name:', currentData?.name);
        console.log('   Original Brand ID:', currentData?.originalBrandId);
        console.log('   Owner UID:', currentData?.ownerId);

        // Check if it's already owned by Thrive
        if (currentData?.originalBrandId === THRIVE_ORG_ID) {
            console.log('\n✅ Document is already properly owned by Thrive');
            console.log('   No changes needed!');
            return;
        }

        // Fetch Thrive org to get metadata
        const thriveOrg = await db.collection('organizations').doc(THRIVE_ORG_ID).get();
        const thriveOrgData = thriveOrg.exists ? thriveOrg.data() : {};

        console.log('\n🔧 Updating document to be owned by Thrive...');

        // Update the brand document to be owned by Thrive
        await db.collection('brands').doc('thrivesyracuse').set({
            id: 'thrivesyracuse',
            slug: 'thrivesyracuse',
            name: thriveOrgData?.name || 'Thrive Syracuse',
            originalBrandId: THRIVE_ORG_ID,
            ownerId: THRIVE_ADMIN_UID,
            description: thriveOrgData?.description || 'Thrive Syracuse - Premium Cannabis Dispensary',
            logoUrl: thriveOrgData?.logoUrl || '',
            verificationStatus: 'verified',
            claimStatus: 'claimed',
            type: 'brand',
            createdAt: currentData?.createdAt || new Date(),
            updatedAt: new Date(),
        }, { merge: true });

        console.log('   ✅ Updated brands/thrivesyracuse');

        // Also ensure organizations/{orgId} has the slug
        await db.collection('organizations').doc(THRIVE_ORG_ID).set({
            slug: 'thrivesyracuse',
            updatedAt: new Date(),
        }, { merge: true });

        console.log('   ✅ Updated organizations/org_thrive_syracuse with slug');

        console.log('\n' + '─'.repeat(60));
        console.log('✅ Fix complete! Thrive Syracuse can now reserve bakedbot.ai/thrivesyracuse');
        console.log('\n   Next steps:');
        console.log('   1. Have Thrive refresh their browser');
        console.log('   2. Go to Dashboard → Settings → Brand');
        console.log('   3. The slug field should now show "thrivesyracuse" as available');
        console.log('   4. Click "Save & Discover Competitors" to finalize');
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixThriveSlug();
