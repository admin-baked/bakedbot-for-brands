
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'service-account.json');

async function main() {
    console.log('🚀 Configuring Essex Apothecary Location...');

    // --- Credential Loading (Standard Robust) ---
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
                // Sanitize private_key if needed... (Assume standard loading for brevity or reuse)
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
            } catch (e) {}
        }
        
        if (!serviceAccount && fs.existsSync(SERVICE_ACCOUNT_PATH)) {
            try { serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8')); } catch (e) {}
        }

        if (serviceAccount) {
            app = initializeApp({ credential: cert(serviceAccount) });
        } else {
            app = initializeApp();
        }
    }
    const db = getFirestore(app);
    // --------------------------------------------------------

    // 1. Find Organization
    const orgsSnap = await db.collection('organizations').where('name', '==', 'Essex Apothecary').get();
    if (orgsSnap.empty) throw new Error('Organization not found');
    const orgId = orgsSnap.docs[0].id;

    // 2. Get Integration Config
    const integrationDoc = await db.collection('organizations').doc(orgId).collection('integrations').doc('dutchie').get();
    if (!integrationDoc.exists) throw new Error('Integration config not found');
    const integrationConfig = integrationDoc.data()?.config;

    // 3. Find or Create Location
    const locationsSnap = await db.collection('locations').where('orgId', '==', orgId).get();
    let locationRef;
    
    if (locationsSnap.empty) {
        console.log('   Creating new location...');
        locationRef = db.collection('locations').doc();
        await locationRef.set({
            name: 'Essex Apothecary - Main',
            orgId: orgId,
            address: {
                street: '123 Main St', // Placeholder
                city: 'Lynn',
                state: 'MA',
                zip: '01901'
            },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });
    } else {
        console.log(`   Found existing location: ${locationsSnap.docs[0].id}`);
        locationRef = locationsSnap.docs[0].ref;
    }

    // 4. Update POS Config
    console.log('   Updating POS Config on Location...');
    await locationRef.update({
        posConfig: {
            provider: 'dutchie',
            status: 'active',
            apiKey: integrationConfig.apiKey,
            dispensaryId: integrationConfig.storeId, // storeId mapping
            storeId: integrationConfig.storeId,
            syncedAt: FieldValue.serverTimestamp()
        }
    });

    console.log('✅ Location Configured Successfully!');
    console.log(`Location ID: ${locationRef.id}`);
}

main().catch(console.error);
