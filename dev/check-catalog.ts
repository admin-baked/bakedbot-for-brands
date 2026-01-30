/**
 * Check catalog collection in detail
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

async function checkCatalog() {
    console.log('🔍 Checking Catalog\n');

    const orgId = 'org_thrive_syracuse';

    try {
        console.log(`Checking tenants/${orgId}/catalog...\n`);
        const catalogSnapshot = await db.collection('tenants')
            .doc(orgId)
            .collection('catalog')
            .get();

        console.log(`Total documents: ${catalogSnapshot.size}\n`);

        if (catalogSnapshot.size > 0) {
            console.log('First 10 catalog items:\n');
            catalogSnapshot.docs.slice(0, 10).forEach((doc, idx) => {
                const data = doc.data();
                console.log(`${idx + 1}. ${doc.id}`);
                console.log(`   Name: ${data.name || data.title || 'N/A'}`);
                console.log(`   Brand: ${data.brand || data.brandName || 'N/A'}`);
                console.log(`   Category: ${data.category || 'N/A'}`);
                console.log(`   Price: $${data.price || 0}`);
                console.log(`   Source: ${data.sourceId || 'N/A'}`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('\n❌ Failed:', error);
        throw error;
    }
}

checkCatalog()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
