/**
 * Diagnostic Script v3: Check EVERYWHERE for customers
 *
 * Run: node scripts/find-all-customers.js
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

async function findAllCustomers() {
    console.log('=== Searching EVERYWHERE for customers ===\n');

    // 1. Top-level customers
    console.log('1. Top-level "customers" collection:');
    const topLevel = await db.collection('customers').limit(10).get();
    console.log(`   ${topLevel.size} documents\n`);

    // 2. All organizations
    console.log('2. "organizations/{orgId}/customers" subcollections:');
    const orgs = await db.collection('organizations').get();
    for (const org of orgs.docs) {
        const cust = await db.collection('organizations').doc(org.id).collection('customers').get();
        if (cust.size > 0) console.log(`   ${org.id}: ${cust.size} customers`);
    }

    // 3. All brands
    console.log('\n3. "brands/{brandId}/customers" subcollections:');
    const brands = await db.collection('brands').get();
    for (const brand of brands.docs) {
        const cust = await db.collection('brands').doc(brand.id).collection('customers').get();
        if (cust.size > 0) console.log(`   ${brand.id}: ${cust.size} customers`);
    }

    // 4. All tenants
    console.log('\n4. "tenants/{tenantId}/customers" subcollections:');
    const tenants = await db.collection('tenants').get();
    for (const tenant of tenants.docs) {
        const cust = await db.collection('tenants').doc(tenant.id).collection('customers').get();
        if (cust.size > 0) console.log(`   ${tenant.id}: ${cust.size} customers`);
    }

    // 5. All locations
    console.log('\n5. "locations/{locationId}/customers" subcollections:');
    const locations = await db.collection('locations').get();
    for (const loc of locations.docs) {
        const cust = await db.collection('locations').doc(loc.id).collection('customers').get();
        if (cust.size > 0) console.log(`   ${loc.id}: ${cust.size} customers`);
    }

    // 6. Check users to find Ecstatic Edibles user
    console.log('\n6. Looking for Ecstatic Edibles user:');
    const users = await db.collection('users').where('email', '>=', '').limit(20).get();
    for (const user of users.docs) {
        const data = user.data();
        if (data.email?.toLowerCase().includes('ecstatic') ||
            data.brandId === 'ecstaticedibles' ||
            data.displayName?.toLowerCase().includes('ecstatic')) {
            console.log(`   Found: ${data.email} (brandId: ${data.brandId}, uid: ${user.id})`);
        }
    }

    // 7. Check if there's a collectionGroup query we can use
    console.log('\n7. Collection group query for any "customers" subcollection:');
    try {
        const allCustomers = await db.collectionGroup('customers').limit(10).get();
        console.log(`   Found ${allCustomers.size} documents total`);
        if (!allCustomers.empty) {
            allCustomers.forEach(doc => {
                const path = doc.ref.path;
                const data = doc.data();
                console.log(`   ${path}: ${data.email}`);
            });
        }
    } catch (err) {
        console.log(`   Error (may need index): ${err.message?.substring(0, 100)}`);
    }

    console.log('\n=== Done ===');
}

findAllCustomers()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
