// Refresh Thrive Syracuse SLOW MOVERS insight card
// Deletes stale velocity insights so the next cron run regenerates with clean data
// Usage: node scratch/refresh-thrive-insights.cjs

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
    console.error('Set FIREBASE_SERVICE_ACCOUNT_KEY env var');
    process.exit(1);
}

const serviceAccount = JSON.parse(
    Buffer.from(serviceAccountKey, 'base64').toString('utf8')
);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const ORG_ID = 'org_thrive_syracuse';
const BATCH_SIZE = 400; // Firestore max is 500

async function deleteInChunks(docs) {
    let deleted = 0;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const chunk = docs.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        for (const doc of chunk) {
            batch.delete(doc.ref);
        }
        await batch.commit();
        deleted += chunk.length;
        console.log(`  Deleted batch: ${chunk.length} (total: ${deleted}/${docs.length})`);
    }
    return deleted;
}

async function main() {
    console.log('=== Thrive Insight Refresh ===\n');

    // Step 1: Delete stale velocity insights
    const insightsSnap = await db.collection('tenants').doc(ORG_ID).collection('insights').get();
    const velocityDocs = [];

    for (const doc of insightsSnap.docs) {
        const data = doc.data();
        const isVelocity = data.category === 'velocity' ||
            (data.title && data.title.includes && data.title.includes('SLOW MOVERS')) ||
            (data.title && data.title.includes && data.title.includes('TOP SELLER')) ||
            (data.headline && data.headline.includes && data.headline.includes('slow-moving'));
        if (isVelocity) {
            velocityDocs.push(doc);
        }
    }

    console.log(`Found ${velocityDocs.length} velocity insight docs to delete (out of ${insightsSnap.size} total)`);

    if (velocityDocs.length > 0) {
        const deleted = await deleteInChunks(velocityDocs);
        console.log(`\nDeleted ${deleted} stale velocity insights`);
    } else {
        console.log('No velocity insights found to delete');
    }

    // Step 2: Verify current product count
    const productsSnap = await db.collection('tenants').doc(ORG_ID).collection('products')
        .where('status', '==', 'active')
        .get();

    let totalRetailValue = 0;
    let totalStock = 0;
    const categoryMap = {};

    for (const doc of productsSnap.docs) {
        const p = doc.data();
        const price = p.price || p.retailPrice || 0;
        const stock = p.stock || p.quantity || 0;
        totalRetailValue += price * stock;
        totalStock += stock;

        const cat = p.category || 'Unknown';
        if (!categoryMap[cat]) categoryMap[cat] = { count: 0, stock: 0, value: 0 };
        categoryMap[cat].count++;
        categoryMap[cat].stock += stock;
        categoryMap[cat].value += price * stock;
    }

    console.log(`\n=== Current Product State ===`);
    console.log(`Active products: ${productsSnap.size}`);
    console.log(`Total stock units: ${totalStock}`);
    console.log(`Total retail value: $${Math.round(totalRetailValue).toLocaleString()}`);
    console.log(`\nBy category:`);
    for (const [cat, data] of Object.entries(categoryMap).sort((a, b) => b[1].value - a[1].value)) {
        console.log(`  ${cat}: ${data.count} SKUs, ${data.stock} units, $${Math.round(data.value).toLocaleString()}`);
    }

    // Step 3: Check for any remaining duplicates
    const allProductsSnap = await db.collection('tenants').doc(ORG_ID).collection('products').get();
    const nameCount = {};
    for (const doc of allProductsSnap.docs) {
        const name = doc.data().name || doc.data().productName || '';
        if (!nameCount[name]) nameCount[name] = [];
        nameCount[name].push(doc.id);
    }
    const dupes = Object.entries(nameCount).filter(([_, ids]) => ids.length > 1);
    if (dupes.length > 0) {
        console.log(`\n⚠️  Still ${dupes.length} duplicate product names remaining!`);
        for (const [name, ids] of dupes.slice(0, 5)) {
            console.log(`  ${name}: ${ids.length} copies`);
        }
    } else {
        console.log(`\n✓ No duplicate products remaining`);
    }

    // Step 4: Report remaining insight count
    const remainingSnap = await db.collection('tenants').doc(ORG_ID).collection('insights').get();
    console.log(`\nRemaining insights in collection: ${remainingSnap.size}`);

    console.log(`\nDone! The velocity insights cron (runs hourly) will regenerate with clean data.`);
    console.log(`To trigger immediately: POST /api/cron/generate-insights-velocity`);
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });