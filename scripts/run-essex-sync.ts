
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import { DutchieClient } from '../src/lib/pos/adapters/dutchie';

const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'service-account.json');

async function main() {
    console.log('🚀 Running Full POS Sync Simulation for Essex Apothecary...');

    // --- Credential Loading (Reuse) ---
    let app;
    if (getApps().length > 0) {
        app = getApps()[0];
    } else {
        let serviceAccount;
        const b64Path = path.resolve(process.cwd(), 'sa.b64');
        if (fs.existsSync(b64Path)) { try { serviceAccount = JSON.parse(Buffer.from(fs.readFileSync(b64Path, 'utf-8'), 'base64').toString('utf-8')); } catch (e) {} }
        if (!serviceAccount && fs.existsSync(SERVICE_ACCOUNT_PATH)) { try { serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8')); } catch (e) {} }
        if (serviceAccount) {
            if (typeof serviceAccount.private_key === 'string') {
                 const rawKey = serviceAccount.private_key;
                 const match = rawKey.match(/(-+BEGIN\s+.*PRIVATE\s+KEY-+)([\s\S]+?)(-+END\s+.*PRIVATE\s+KEY-+)/);
                 if (match) {
                     let body = match[2].replace(/[^a-zA-Z0-9+/=]/g, '');
                     while (body.length % 4 !== 0) body += '=';
                     const formatted = body.match(/.{1,64}/g)?.join('\n') || body;
                     serviceAccount.private_key = `${match[1]}\n${formatted}\n${match[3]}\n`;
                 } else serviceAccount.private_key = rawKey.replace(/\\n/g, '\n');
            }
            app = initializeApp({ credential: cert(serviceAccount) });
        } else { app = initializeApp(); }
    }
    const db = getFirestore(app);
    // ----------------------------------

    // 1. Find Organization
    const orgsSnap = await db.collection('organizations').where('name', '==', 'Essex Apothecary').get();
    if (orgsSnap.empty) throw new Error('Organization not found');
    const orgId = orgsSnap.docs[0].id;

    // 2. Find Location
    const locationsSnap = await db.collection('locations').where('orgId', '==', orgId).get();
    if (locationsSnap.empty) throw new Error('Location not found');
    const locationDoc = locationsSnap.docs[0];
    const locationId = locationDoc.id;
    const posConfig = locationDoc.data().posConfig;

    console.log(`   Org: ${orgId}`);
    console.log(`   Location: ${locationId}`);
    console.log(`   Provider: ${posConfig?.provider}`);

    if (!posConfig || posConfig.provider !== 'dutchie') {
        throw new Error('Invalid POS config on location');
    }

    // 3. Initialize Client & Fetch
    console.log('\n📡 Fetching from Dutchie...');
    const client = new DutchieClient({
        apiKey: posConfig.apiKey,
        storeId: posConfig.storeId
    });

    const products = await client.fetchMenu();
    console.log(`   Fetched ${products.length} products.`);

    // 4. Transform & Save (Simulating Import Pipeline)
    console.log('\n💾 Saving to Firestore (products collection)...');
    
    let savedCount = 0;
    const batchSize = 100; // Firestore batch limit

    for (let i = 0; i < products.length; i += batchSize) {
        const batch = db.batch();
        const chunk = products.slice(i, i + batchSize);
        
        chunk.forEach(p => {
            const productId = `prod_${orgId}_${p.externalId}`;
            const ref = db.collection('products').doc(productId);
            
            // Map to internal schema
            batch.set(ref, {
                id: productId,
                orgId: orgId,
                locationId: locationId,
                externalId: p.externalId,
                name: p.name,
                brand: p.brandName || p.brand || 'Unknown',
                category: p.category || 'Other',
                price: p.price, // variant price
                stock: p.stock,
                thcContent: p.thc || p.thcPercent,
                cbdContent: p.cbd || p.cbdPercent,
                images: p.imageUrl ? [p.imageUrl] : [],
                source: 'dutchie',
                status: 'active',
                updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });
        });

        await batch.commit();
        savedCount += chunk.length;
        console.log(`   Saved ${savedCount}/${products.length}...`);
    }

    console.log('\n✅ Sync Simulation Complete!');
}

main().catch(console.error);
