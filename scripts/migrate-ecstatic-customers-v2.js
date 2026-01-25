/**
 * Migration Script: Move brand_ecstatic_edibles customers to top-level
 *
 * Run: node scripts/migrate-ecstatic-customers-v2.js
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

async function migrateCustomers() {
    const orgId = 'brand_ecstatic_edibles';

    console.log(`Migrating customers from organizations/${orgId}/customers to top-level customers collection\n`);

    // 1. Read from old location
    const oldCollection = db.collection('organizations').doc(orgId).collection('customers');
    const snapshot = await oldCollection.get();

    console.log(`Found ${snapshot.size} customers to migrate\n`);

    if (snapshot.empty) {
        console.log('No customers to migrate');
        return;
    }

    // 2. Write to new location in batches
    const batchSize = 500;
    let batch = db.batch();
    let count = 0;
    let migrated = 0;
    let skipped = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();

        // Check if already exists in new location
        const existing = await db.collection('customers')
            .where('orgId', '==', orgId)
            .where('email', '==', data.email)
            .limit(1)
            .get();

        if (existing.empty) {
            // Create in new location with orgId field
            const newRef = db.collection('customers').doc();
            batch.set(newRef, {
                ...data,
                orgId: orgId,
                id: newRef.id
            });
            migrated++;
        } else {
            skipped++;
        }

        count++;

        // Commit batch every 500 docs
        if (count % batchSize === 0) {
            await batch.commit();
            console.log(`Processed ${count} customers (${migrated} migrated, ${skipped} skipped)...`);
            batch = db.batch();
        }
    }

    // Commit remaining
    if (count % batchSize !== 0) {
        await batch.commit();
    }

    console.log(`\n=== Migration Complete ===`);
    console.log(`Total: ${count}`);
    console.log(`Migrated: ${migrated}`);
    console.log(`Skipped (already exists): ${skipped}`);
}

migrateCustomers()
    .then(() => {
        console.log('\nDone! Refresh your dashboard to see the customers.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
