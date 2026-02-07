/**
 * Fix Thrive Syracuse Brand - Add orgId Field
 *
 * This script adds the missing orgId field to the Thrive Syracuse brand document
 * so that carousels and heroes will load properly on the public menu page.
 *
 * Run with: npx ts-node --transpile-only dev/fix-thrive-brand-orgid.ts
 */
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

const app = getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert(path.resolve(__dirname, '../service-account.json'))
});
const firestore = getFirestore(app);

const BRAND_ID = 'brand_thrive_syracuse';
const ORG_ID = 'org_thrive_syracuse';

async function main() {
    console.log('🔧 Fixing Thrive Syracuse brand document...\n');

    // Get current brand document
    const brandDoc = await firestore.collection('brands').doc(BRAND_ID).get();

    if (!brandDoc.exists) {
        console.error('❌ Brand document not found:', BRAND_ID);
        console.log('   Run: npx ts-node --transpile-only dev/setup-thrive-syracuse.ts');
        process.exit(1);
    }

    const brandData = brandDoc.data();
    console.log('📦 Current brand data:');
    console.log('   ID:', brandData.id);
    console.log('   Name:', brandData.name);
    console.log('   Slug:', brandData.slug);
    console.log('   Type:', brandData.type);
    console.log('   OrgId:', brandData.orgId || '❌ MISSING');

    if (brandData.orgId) {
        console.log('\n✅ orgId already set! No changes needed.');
        return;
    }

    // Update the brand document
    console.log('\n📝 Adding orgId field...');
    await firestore.collection('brands').doc(BRAND_ID).update({
        orgId: ORG_ID
    });

    console.log('✅ Brand document updated!');
    console.log('   orgId:', ORG_ID);

    // Verify the update
    const updatedDoc = await firestore.collection('brands').doc(BRAND_ID).get();
    const updatedData = updatedDoc.data();

    console.log('\n📦 Updated brand data:');
    console.log('   orgId:', updatedData.orgId);

    console.log('\n' + '='.repeat(70));
    console.log('🎉 FIX COMPLETE!');
    console.log('='.repeat(70));
    console.log('');
    console.log('Now carousels and heroes will load on:');
    console.log('   https://bakedbot.ai/thrivesyracuse');
    console.log('');
    console.log('Next steps:');
    console.log('   1. Clear browser cache');
    console.log('   2. Reload https://bakedbot.ai/thrivesyracuse');
    console.log('   3. Carousels should now appear!');
    console.log('='.repeat(70));
}

main().catch(console.error);
