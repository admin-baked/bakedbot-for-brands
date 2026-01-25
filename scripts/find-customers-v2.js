/**
 * Diagnostic Script v2: Check all organization subcollections
 *
 * Run: node scripts/find-customers-v2.js
 */

const admin = require('firebase-admin');
const path = require('path');

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
    console.log('=== Checking all organization subcollections ===\n');

    const orgsSnap = await db.collection('organizations').get();
    console.log(`Found ${orgsSnap.size} organizations\n`);

    let totalCustomers = 0;
    const customersByOrg = {};

    for (const orgDoc of orgsSnap.docs) {
        const orgId = orgDoc.id;
        const customersSnap = await db.collection('organizations')
            .doc(orgId)
            .collection('customers')
            .get();

        if (customersSnap.size > 0) {
            console.log(`${orgId}: ${customersSnap.size} customers`);
            totalCustomers += customersSnap.size;
            customersByOrg[orgId] = customersSnap.size;

            // Show first 3 emails
            const emails = [];
            customersSnap.docs.slice(0, 3).forEach(doc => {
                emails.push(doc.data().email);
            });
            console.log(`  Sample: ${emails.join(', ')}`);
        }
    }

    console.log(`\n=== Total: ${totalCustomers} customers across ${Object.keys(customersByOrg).length} organizations ===`);

    // If we found customers, offer to migrate
    if (totalCustomers > 0) {
        console.log('\nTo migrate these to the top-level customers collection,');
        console.log('update the orgId in scripts/migrate-customers-generic.js and run it.');
    }
}

findCustomers()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
