/**
 * Migration Script: Move Ecstatic Edibles customers from subcollection to top-level
 *
 * The customer import wrote to: organizations/ecstaticedibles/customers
 * But dashboard reads from: customers (top-level collection with orgId filter)
 *
 * Run: node scripts/migrate-ecstatic-customers.js
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

async function migrateCustomers() {
    const orgId = 'ecstaticedibles';

    console.log(`Starting migration for org: ${orgId}`);

    // 1. Read from old location
    const oldCollection = db.collection('organizations').doc(orgId).collection('customers');
    const snapshot = await oldCollection.get();

    console.log(`Found ${snapshot.size} customers in old location`);

    if (snapshot.empty) {
        console.log('No customers to migrate');
        return;
    }

    // 2. Write to new location in batches
    const batchSize = 500;
    let batch = db.batch();
    let count = 0;
    let migrated = 0;

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
            console.log(`Skipping duplicate: ${data.email}`);
        }

        count++;

        // Commit batch every 500 docs
        if (count % batchSize === 0) {
            await batch.commit();
            console.log(`Migrated ${count} customers...`);
            batch = db.batch();
        }
    }

    // Commit remaining
    if (count % batchSize !== 0) {
        await batch.commit();
    }

    console.log(`\nMigration complete!`);
    console.log(`Total processed: ${count}`);
    console.log(`Migrated: ${migrated}`);
    console.log(`Skipped (duplicates): ${count - migrated}`);

    // 3. Optional: Delete old data (commented out for safety)
    // console.log('\nTo delete old data, uncomment the deletion code in the script');
    // for (const doc of snapshot.docs) {
    //     await doc.ref.delete();
    // }
}

migrateCustomers()
    .then(() => {
        console.log('\nDone!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
