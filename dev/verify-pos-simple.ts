
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import { ALLeavesClient } from '../src/lib/pos/adapters/alleaves';

const ORG_ID = 'org_thrive_syracuse';

const apps = getApps();
let app;
if (apps.length === 0) {
    const serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf8'));
    app = initializeApp({ credential: cert(serviceAccount) });
} else { app = apps[0]; }
const db = getFirestore(app);

async function run() {
    console.log('🔍 SIMPLE VERIFICATION');

    // Config
    const snap = await db.collection('locations').where('orgId', '==', ORG_ID).limit(1).get();
    if (snap.empty) { console.log('❌ No location'); return; }
    const config = snap.docs[0].data().posConfig;
    console.log(`✅ Config: Provider=${config.provider}, Loc=${config.locationId}, Store=${config.storeId}, User=${config.username}`);

    // Client
    const client = new ALLeavesClient({
        apiKey: config.apiKey,
        username: config.username,
        password: config.password,
        pin: config.pin,
        storeId: config.storeId,
        locationId: config.locationId,
        partnerId: config.partnerId,
        environment: config.environment
    });

    // Auth & Customers
    try {
        const customers = await client.getAllCustomers(1, 5);
        console.log(`✅ Auth & Customers: Fetched ${customers.length}`);
    } catch (e: any) {
        console.log(`❌ Auth/Customers Failed: ${e.message}`);
    }

    // Orders
    try {
        const orders = await client.getAllOrders(5);
        console.log(`✅ Orders: Fetched ${orders.length}`);
    } catch (e: any) {
        console.log(`❌ Orders Failed: ${e.message}`);
    }

    // Cache
    try {
        const start = Date.now();
        await client.getAllCustomers(1, 1);
        const t1 = Date.now() - start;
        const start2 = Date.now();
        await client.getAllCustomers(1, 1);
        const t2 = Date.now() - start2;
        console.log(`ℹ️ Cache Timing: ${t1}ms vs ${t2}ms`);
        if (t2 < t1) console.log('✅ Cache: Faster');
        else console.log('⚠️ Cache: Not faster (might be network variance)');
    } catch (e: any) {
        console.log(`❌ Cache Measurement Failed: ${e.message}`);
    }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
