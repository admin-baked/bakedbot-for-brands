/**
 * List all collections under the org to find where products are
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
const apps = getApps();
if (apps.length === 0) {
    const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
        credential: cert(serviceAccount),
    });
}

const db = getFirestore();

async function listCollections() {
    console.log('🔍 Listing Collections\n');

    const orgId = 'org_thrive_syracuse';
    const brandId = 'thrivesyracuse';

    try {
        console.log(`1️⃣  Collections under tenants/${orgId}:`);
        const orgRef = db.collection('tenants').doc(orgId);
        const orgCollections = await orgRef.listCollections();

        for (const collection of orgCollections) {
            const snapshot = await collection.limit(1).get();
            console.log(`   - ${collection.id} (${snapshot.size > 0 ? 'has data' : 'empty'})`);
        }

        console.log(`\n2️⃣  Collections under brands/${brandId}:`);
        const brandRef = db.collection('brands').doc(brandId);
        const brandCollections = await brandRef.listCollections();

        for (const collection of brandCollections) {
            const snapshot = await collection.limit(1).get();
            console.log(`   - ${collection.id} (${snapshot.size > 0 ? 'has data' : 'empty'})`);
        }

        console.log(`\n3️⃣  Collections under orgs/${orgId}:`);
        const orgRef2 = db.collection('orgs').doc(orgId);
        const orgCollections2 = await orgRef2.listCollections();

        for (const collection of orgCollections2) {
            const snapshot = await collection.limit(1).get();
            console.log(`   - ${collection.id} (${snapshot.size > 0 ? 'has data' : 'empty'})`);
        }

        // Check for staged_products
        console.log(`\n4️⃣  Checking staged_products:`);
        const stagedSnapshot = await db.collection('tenants')
            .doc(orgId)
            .collection('staged_products')
            .limit(5)
            .get();

        console.log(`   Found ${stagedSnapshot.size} staged products`);

        if (stagedSnapshot.size > 0) {
            console.log('\n   Sample staged products:');
            stagedSnapshot.forEach((doc, idx) => {
                const p = doc.data();
                console.log(`   ${idx + 1}. ${p.name || p.title || doc.id}`);
            });
        }

        // Check for product_views
        console.log(`\n5️⃣  Checking product_views:`);
        const viewsSnapshot = await db.collection('tenants')
            .doc(orgId)
            .collection('product_views')
            .limit(5)
            .get();

        console.log(`   Found ${viewsSnapshot.size} product views`);

        if (viewsSnapshot.size > 0) {
            console.log('\n   Sample product views:');
            viewsSnapshot.forEach((doc, idx) => {
                const p = doc.data();
                console.log(`   ${idx + 1}. ${p.name || p.title || doc.id}`);
            });
        }

    } catch (error) {
        console.error('\n❌ Failed:', error);
        throw error;
    }
}

listCollections()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
