/**
 * Check import records in Firestore
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

async function checkImports() {
    console.log('🔍 Checking Import Records\n');

    const orgId = 'org_thrive_syracuse';

    try {
        // Check tenants collection
        console.log('1️⃣  Checking tenants collection...');
        const tenantsSnapshot = await db.collection('tenants').get();
        console.log(`   Found ${tenantsSnapshot.size} tenants\n`);

        tenantsSnapshot.forEach(doc => {
            console.log(`   - ${doc.id}`);
        });

        // Check imports for org
        console.log('\n2️⃣  Checking imports for org...');
        const importsSnapshot = await db.collection('tenants')
            .doc(orgId)
            .collection('imports')
            .get();

        console.log(`   Found ${importsSnapshot.size} imports\n`);

        importsSnapshot.forEach(doc => {
            const imp = doc.data();
            console.log(`   Import ID: ${doc.id}`);
            console.log(`   Source: ${imp.sourceId}`);
            console.log(`   Status: ${imp.status}`);
            console.log(`   Started: ${imp.startedAt?.toDate?.()}`);
            if (imp.error) {
                console.log(`   Error: ${JSON.stringify(imp.error)}`);
            }
            if (imp.stats) {
                console.log(`   Stats: ${JSON.stringify(imp.stats)}`);
            }
            console.log('');
        });

        // Check for products in tenant collection
        console.log('3️⃣  Checking products in tenant collection...');
        const tenantProductsSnapshot = await db.collection('tenants')
            .doc(orgId)
            .collection('products')
            .limit(5)
            .get();

        console.log(`   Found ${tenantProductsSnapshot.size} products\n`);

        tenantProductsSnapshot.forEach((doc, idx) => {
            const product = doc.data();
            console.log(`   ${idx + 1}. ${product.name || product.title || doc.id}`);
        });

    } catch (error) {
        console.error('\n❌ Check failed:', error);
        throw error;
    }
}

checkImports()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
