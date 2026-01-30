/**
 * Check detailed import record
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

async function checkImportDetail() {
    console.log('🔍 Checking Import Detail\n');

    const orgId = 'org_thrive_syracuse';

    try {
        const importsSnapshot = await db.collection('tenants')
            .doc(orgId)
            .collection('imports')
            .orderBy('startedAt', 'desc')
            .limit(1)
            .get();

        if (importsSnapshot.empty) {
            console.log('No imports found');
            return;
        }

        const importDoc = importsSnapshot.docs[0];
        const importData = importDoc.data();

        console.log('Import Record:');
        console.log(JSON.stringify(importData, null, 2));

        // Check for raw data
        console.log('\n\nChecking for raw data subcollections...');
        const subcollections = await importDoc.ref.listCollections();
        for (const collection of subcollections) {
            const snapshot = await collection.limit(1).get();
            console.log(`  - ${collection.id} (${snapshot.size > 0 ? 'has data' : 'empty'})`);
        }

    } catch (error) {
        console.error('\n❌ Failed:', error);
        throw error;
    }
}

checkImportDetail()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
