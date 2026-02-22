import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Load .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
envContent.split('\n').forEach((line) => {
    if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        if (key && !process.env[key]) {
            process.env[key] = valueParts.join('=').trim();
        }
    }
});

const encodedKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!encodedKey) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY not found');
    process.exit(1);
}

const serviceAccount = JSON.parse(Buffer.from(encodedKey, 'base64').toString('utf-8'));

if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount), projectId: 'studio-567050101-bc6e8' });
}

const db = getFirestore();

(async () => {
    console.log('\n🔍 Fixing Thrive Syracuse slug collision...\n');

    try {
        const brandDoc = await db.collection('brands').doc('thrivesyracuse').get();

        if (!brandDoc.exists) {
            console.log('ℹ️  No collision found - already fixed');
            process.exit(0);
        }

        const currentData = brandDoc.data();
        console.log('📄 Current owner:', currentData?.originalBrandId || 'unknown');

        if (currentData?.originalBrandId === 'org_thrive_syracuse') {
            console.log('✅ Already owned by Thrive - no action needed');
            process.exit(0);
        }

        const thriveOrg = await db.collection('organizations').doc('org_thrive_syracuse').get();
        const thriveData = thriveOrg.exists ? thriveOrg.data() : {};

        console.log('🔧 Transferring ownership to Thrive...');

        await db.collection('brands').doc('thrivesyracuse').set({
            id: 'thrivesyracuse',
            slug: 'thrivesyracuse',
            name: thriveData?.name || 'Thrive Syracuse',
            originalBrandId: 'org_thrive_syracuse',
            ownerId: 'naUKkibYt2OGVZsPzEhpeHwsObJ3',
            verificationStatus: 'verified',
            claimStatus: 'claimed',
            type: 'brand',
            createdAt: currentData?.createdAt || new Date(),
            updatedAt: new Date(),
        }, { merge: true });

        await db.collection('organizations').doc('org_thrive_syracuse').set({
            slug: 'thrivesyracuse',
            updatedAt: new Date(),
        }, { merge: true });

        console.log('\n✅ FIX COMPLETE!\n');
        console.log('📋 Next steps:');
        console.log('   1. Thrive refreshes their browser');
        console.log('   2. Dashboard → Settings → Brand');
        console.log('   3. bakedbot.ai/thrivesyracuse should show as "available"');
        console.log('   4. Click "Save & Discover Competitors" to finalize\n');

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
})();
