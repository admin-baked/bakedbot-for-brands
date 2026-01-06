
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';
import * as fs from 'fs';
import { fixEssexApothecary } from '../src/server/actions/admin/fix-essex';

const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'service-account.json');

async function main() {
    console.log('🚀 Starting Essex Apothecary Setup...');

    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        console.error('❌ service-account.json not found in root!');
        process.exit(1);
    }

    let app;
    if (getApps().length > 0) {
        app = getApps()[0];
    } else {
        console.log('🔑 Initializing Firebase Admin...');
        
        let serviceAccount;
        
        // Strategy 1: Try decoding sa.b64 (Highest Priority)
        const b64Path = path.resolve(process.cwd(), 'sa.b64');
        if (fs.existsSync(b64Path)) {
            try {
                console.log('   📄 Found sa.b64. Decoding...');
                const b64Content = fs.readFileSync(b64Path, 'utf-8');
                const jsonContent = Buffer.from(b64Content, 'base64').toString('utf-8');
                serviceAccount = JSON.parse(jsonContent);
                console.log('   ✅ Successfully decoded credentials from sa.b64');
            } catch (e: any) {
                console.warn('   ⚠️ Failed to decode sa.b64:', e.message);
            }
        }

        // Strategy 2: Try service-account.json
        if (!serviceAccount && fs.existsSync(SERVICE_ACCOUNT_PATH)) {
             try {
                console.log('   📄 Found service-account.json. Loading...');
                serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
             } catch (e: any) {
                 console.warn('   ⚠️ Failed to load service-account.json:', e.message);
             }
        }

        if (serviceAccount) {
            // Sanitize private_key (Robust Fix)
            if (typeof serviceAccount.private_key === 'string') {
                const rawKey = serviceAccount.private_key;
                const match = rawKey.match(/(-+BEGIN\s+.*PRIVATE\s+KEY-+)([\s\S]+?)(-+END\s+.*PRIVATE\s+KEY-+)/);
                if (match) {
                    let body = match[2].replace(/[^a-zA-Z0-9+/=]/g, '');
                    // Fix padding
                    if (body.length % 4 === 1) body = body.slice(0, -3) + '=='; // Truncate & fix? Or just standard padding logic.
                    // simpler padding fix:
                    while (body.length % 4 !== 0) body += '=';
                    
                    const formatted = body.match(/.{1,64}/g)?.join('\n') || body;
                    serviceAccount.private_key = `${match[1]}\n${formatted}\n${match[3]}\n`;
                } else {
                     // If it's just one line/newlines escaped
                     serviceAccount.private_key = rawKey.replace(/\\n/g, '\n');
                }
            }

            app = initializeApp({
                credential: cert(serviceAccount)
            });
        } else {
            console.log('   🔑 No local keys found/valid. Trying Application Default Credentials...');
            app = initializeApp();
        }
    }

    const db = getFirestore(app);
    const auth = getAuth(app);

    const EMAIL = 'essexapothecary@bakedbot.ai';
    const ORG_NAME = 'Essex Apothecary';
    const BRAND_ID = 'brand_essex'; // Creating a placeholder brand if needed

    // 1. Check/Create User
    console.log(`\n🔍 Checking for user: ${EMAIL}`);
    let userRecord;
    try {
        userRecord = await auth.getUserByEmail(EMAIL);
        console.log(`   ✅ User found: ${userRecord.uid}`);
    } catch (e) {
        console.log(`   ⚠️ User not found. Creating...`);
        userRecord = await auth.createUser({
            email: EMAIL,
            password: 'password123!', // Default dev password
            emailVerified: true,
            displayName: 'Essex Admin'
        });
        console.log(`   ✅ User created: ${userRecord.uid}`);
    }

    // 2. Check/Create Organization
    console.log(`\n🔍 Checking for organization: ${ORG_NAME}`);
    let orgId = '';
    const orgQuery = await db.collection('organizations').where('name', '==', ORG_NAME).get();
    
    if (!orgQuery.empty) {
        orgId = orgQuery.docs[0].id;
        console.log(`   ✅ Organization found: ${orgId}`);
    } else {
        console.log(`   ⚠️ Organization not found. Creating...`);
        const orgRef = db.collection('organizations').doc();
        orgId = orgRef.id;
        await orgRef.set({
            name: ORG_NAME,
            type: 'dispensary', // vs brand
            ownerId: userRecord.uid,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            status: 'active',
            settings: {
                policyPack: 'standard'
            }
        });
        console.log(`   ✅ Organization created: ${orgId}`);
    }

    // 3. Link User to Org
    console.log(`\n🔗 Linking user to organization...`);
    await db.collection('users').doc(userRecord.uid).set({
        email: EMAIL,
        role: 'dispensary_admin',
        organizationIds: [orgId],
        currentOrgId: orgId,
        updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, {
        role: 'dispensary_admin',
        orgId: orgId
    });
    console.log(`   ✅ User linked and claims set.`);

    // 4. Run Fix Script
    console.log(`\n🛠️ Running Dutchie Credentials Fix...`);
    // Pass a flag or context if needed, but the function seems self-contained
    const result = await fixEssexApothecary();
    
    console.log('\n--- Fix Script Logs ---');
    result.logs.forEach(l => console.log(l));
    console.log('-----------------------');

    if (result.success) {
        console.log('\n✅ Dutchie Integration Setup COMPLETE!');
        console.log(`User: ${EMAIL}`);
        console.log(`Org: ${ORG_NAME} (${orgId})`);
    } else {
        console.error('\n❌ Dutchie Integration Setup FAILED during fix script.');
    }
}

main().catch(console.error);
