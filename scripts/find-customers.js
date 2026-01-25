/**
 * Diagnostic Script: Find where customers were imported
 *
 * Run: node scripts/find-customers.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, '..', 'service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath)),
        projectId: 'studio-567050101-bc6e8'
    });
}

const db = admin.firestore();

async function findCustomers() {
    console.log('=== Searching for customers ===\n');

    // 1. Check top-level customers collection
    console.log('1. Checking top-level "customers" collection...');
    const topLevelSnap = await db.collection('customers').limit(20).get();
    console.log(`   Found ${topLevelSnap.size} customers`);

    if (!topLevelSnap.empty) {
        const orgIds = new Set();
        topLevelSnap.forEach(doc => {
            const data = doc.data();
            orgIds.add(data.orgId || 'no-orgId');
        });
        console.log(`   OrgIds: ${Array.from(orgIds).join(', ')}`);

        // Sample data
        const sample = topLevelSnap.docs[0].data();
        console.log(`   Sample: ${sample.email} (orgId: ${sample.orgId})`);
    }

    // 2. Check organizations collection
    console.log('\n2. Checking "organizations" collection for subcollections...');
    const orgsSnap = await db.collection('organizations').get();
    console.log(`   Found ${orgsSnap.size} organizations`);

    for (const orgDoc of orgsSnap.docs) {
        const customersSnap = await db.collection('organizations')
            .doc(orgDoc.id)
            .collection('customers')
            .limit(5)
            .get();

        if (!customersSnap.empty) {
            console.log(`   -> ${orgDoc.id}: ${customersSnap.size}+ customers`);
        }
    }

    // 3. Check brands collection for ecstaticedibles
    console.log('\n3. Checking "brands/ecstaticedibles"...');
    const brandDoc = await db.collection('brands').doc('ecstaticedibles').get();
    if (brandDoc.exists) {
        console.log('   Brand exists!');
        const data = brandDoc.data();
        console.log(`   Owner: ${data.ownerId || 'not set'}`);
    } else {
        console.log('   Brand NOT found');
    }

    // 4. Look for customers with ecstaticedibles-related orgId
    console.log('\n4. Searching for customers with orgId containing "ecstatic"...');
    // Can't do partial match in Firestore, so check top-level again
    topLevelSnap.forEach(doc => {
        const data = doc.data();
        if (data.orgId?.toLowerCase().includes('ecstatic')) {
            console.log(`   Found: ${data.email} (orgId: ${data.orgId})`);
        }
    });

    // 5. Check activities collection for import logs
    console.log('\n5. Checking activities for import logs...');
    const activitiesSnap = await db.collection('activities')
        .where('type', '==', 'customer_import')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

    if (!activitiesSnap.empty) {
        console.log(`   Found ${activitiesSnap.size} import activities`);
        activitiesSnap.forEach(doc => {
            const data = doc.data();
            console.log(`   -> ${data.orgId || 'unknown org'}: ${data.metadata?.imported || 0} imported, ${data.metadata?.updated || 0} updated`);
        });
    } else {
        console.log('   No import activities found');
    }

    console.log('\n=== Done ===');
}

findCustomers()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
