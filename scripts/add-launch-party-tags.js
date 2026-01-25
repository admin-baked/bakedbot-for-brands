/**
 * Add launch_party tag to all Ecstatic Edibles customers
 *
 * Run: node scripts/add-launch-party-tags.js
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

async function addLaunchPartyTags() {
    const orgId = 'brand_ecstatic_edibles';
    const tag = 'launch_party';

    console.log(`Adding "${tag}" tag to all customers for ${orgId}\n`);

    // Get all customers for this org
    const customersSnap = await db.collection('customers')
        .where('orgId', '==', orgId)
        .get();

    console.log(`Found ${customersSnap.size} customers\n`);

    if (customersSnap.empty) {
        console.log('No customers found');
        return;
    }

    // Update in batches
    const batchSize = 500;
    let batch = db.batch();
    let count = 0;
    let updated = 0;
    let skipped = 0;

    for (const doc of customersSnap.docs) {
        const data = doc.data();
        const existingTags = data.customTags || [];

        if (existingTags.includes(tag)) {
            skipped++;
        } else {
            batch.update(doc.ref, {
                customTags: admin.firestore.FieldValue.arrayUnion(tag),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            updated++;
        }

        count++;

        // Commit batch every 500 docs
        if (count % batchSize === 0) {
            await batch.commit();
            console.log(`Processed ${count} customers (${updated} updated, ${skipped} skipped)...`);
            batch = db.batch();
        }
    }

    // Commit remaining
    if (count % batchSize !== 0) {
        await batch.commit();
    }

    console.log(`\n=== Complete ===`);
    console.log(`Total: ${count}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (already tagged): ${skipped}`);
}

addLaunchPartyTags()
    .then(() => {
        console.log('\nDone! Refresh your dashboard to see the tags.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Failed:', err);
        process.exit(1);
    });
