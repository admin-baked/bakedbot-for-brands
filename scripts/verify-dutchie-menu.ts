
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import { DutchieClient } from '../src/lib/pos/adapters/dutchie';

const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'service-account.json');

async function main() {
    console.log('🚀 Verifying Dutchie Menu Sync for Essex Apothecary...');

    // --- Credential Loading (Copy-Pasted for Robustness) ---
    let app;
    if (getApps().length > 0) {
        app = getApps()[0];
    } else {
        let serviceAccount;
        const b64Path = path.resolve(process.cwd(), 'sa.b64');
        if (fs.existsSync(b64Path)) {
            try {
                const b64Content = fs.readFileSync(b64Path, 'utf-8');
                const jsonContent = Buffer.from(b64Content, 'base64').toString('utf-8');
                serviceAccount = JSON.parse(jsonContent);
            } catch (e) {}
        }
        if (!serviceAccount && fs.existsSync(SERVICE_ACCOUNT_PATH)) {
             try { serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8')); } catch (e) {}
        }

        if (serviceAccount) {
            if (typeof serviceAccount.private_key === 'string') {
                const rawKey = serviceAccount.private_key;
                const match = rawKey.match(/(-+BEGIN\s+.*PRIVATE\s+KEY-+)([\s\S]+?)(-+END\s+.*PRIVATE\s+KEY-+)/);
                if (match) {
                    let body = match[2].replace(/[^a-zA-Z0-9+/=]/g, '');
                    while (body.length % 4 !== 0) body += '=';
                    const formatted = body.match(/.{1,64}/g)?.join('\n') || body;
                    serviceAccount.private_key = `${match[1]}\n${formatted}\n${match[3]}\n`;
                } else {
                     serviceAccount.private_key = rawKey.replace(/\\n/g, '\n');
                }
            }
            app = initializeApp({ credential: cert(serviceAccount) });
        } else {
            app = initializeApp();
        }
    }
    const db = getFirestore(app);
    // --------------------------------------------------------

    // 1. Get Integration Config
    console.log('🔍 Fetching Integration Config...');
    const orgsSnap = await db.collection('organizations').where('name', '==', 'Essex Apothecary').get();
    if (orgsSnap.empty) throw new Error('Essex Apothecary org not found');
    
    const orgId = orgsSnap.docs[0].id;
    console.log(`   Organization: ${orgId}`);

    const integrationDoc = await db.collection('organizations').doc(orgId).collection('integrations').doc('dutchie').get();
    if (!integrationDoc.exists) throw new Error('Dutchie integration not found (run setup script first)');

    const config = integrationDoc.data()?.config;
    if (!config) throw new Error('Integration config invalid');

    console.log(`   Store ID: ${config.storeId}`);
    console.log(`   API Key: ${config.apiKey ? '***' : 'Missing'}`);

    // 2. Fetch Menu
    console.log('\n📡 Fetching Live Menu from Dutchie...');
    const client = new DutchieClient(config);
    
    try {
        const products = await client.fetchMenu();
        console.log(`\n✅ Success! Fetched ${products.length} products.`);
        
        if (products.length > 0) {
            console.log('\n--- Sample Products ---');
            products.slice(0, 5).forEach(p => {
                console.log(`[${p.externalId}] ${p.name} (${p.brand}) - $${p.price} | Stock: ${p.stock}`);
            });
        }

        // 3. Verify Mapping/Structure
        const invalidProducts = products.filter(p => !p.name || !p.externalId);
        if (invalidProducts.length > 0) {
            console.warn(`\n⚠️ Warning: ${invalidProducts.length} products have missing required fields.`);
        }

    } catch (e: any) {
        console.error('\n❌ Menu Fetch Failed:', e.message);
        if (e.message.includes('401') || e.message.includes('unauthorized')) {
            console.error('   -> Check API Key');
        }
        process.exit(1);
    }
}

main().catch(console.error);
