/**
 * Delete old import records for Thrive Syracuse
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

async function deleteImports() {
    console.log('🗑️  Deleting old import records...\n');

    const orgId = 'org_thrive_syracuse';

    try {
        const importsSnapshot = await db.collection('tenants')
            .doc(orgId)
            .collection('imports')
            .get();

        console.log(`Found ${importsSnapshot.size} import records\n`);

        if (importsSnapshot.size === 0) {
            console.log('No imports to delete');
            return;
        }

        const batch = db.batch();
        importsSnapshot.docs.forEach(doc => {
            console.log(`  - Deleting import: ${doc.id}`);
            batch.delete(doc.ref);
        });

        await batch.commit();

        console.log('\n✅ All import records deleted successfully');

    } catch (error) {
        console.error('\n❌ Failed:', error);
        throw error;
    }
}

deleteImports()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
