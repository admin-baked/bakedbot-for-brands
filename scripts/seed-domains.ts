
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount),
    });
}

const db = getFirestore();

async function seedDomainData() {
    console.log('Seeding domain data...');
    const timestamp = new Date().toISOString();

    // 1. Create domain_mappings document
    const domainMappingData = {
        domain: 'ecstaticedibles.com',
        tenantId: 'ecstaticedibles',
        connectionType: 'a_record',
        verifiedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
    };

    await db.collection('domain_mappings').doc('ecstaticedibles.com').set(domainMappingData);
    console.log('✅ Created domain_mappings/ecstaticedibles.com');

    // 2. Create/Update tenants document
    // Note: The user request implies creating or updating the tenant with customDomain info.
    // We will use set with merge: true to be safe, or just update if we know it exists.
    // Given previous steps seeded 'brands/ecstaticedibles', and 'tenants' might be a separate collection or the same concept?
    // The user explicitly asked for "Collection: tenants", "Document ID: ecstaticedibles".
    // In our schema, brands are usually in 'brands' collection, but 'tenants' might be a new or separate architectural requirement
    // or simply an alias in the user's mind. I will follow the instruction literally and write to 'tenants'.

    const tenantData = {
        id: 'ecstaticedibles',
        type: 'brand',
        name: 'Ecstatic Edibles',
        customDomain: {
            domain: 'ecstaticedibles.com',
            verificationStatus: 'verified',
            connectionType: 'a_record'
        },
        updatedAt: timestamp
    };

    await db.collection('tenants').doc('ecstaticedibles').set(tenantData, { merge: true });
    console.log('✅ Created/Updated tenants/ecstaticedibles');

    // Also verify if we need to sync this to 'brands' collection just in case, 
    // but I will stick to the exact request first. 
    // If 'tenants' is effectively 'brands' in this codebase, I should check.
    // Step 746 created 'brands/ecstaticedibles'. 
    // I'll do exactly what is asked: write to 'tenants'.
}

seedDomainData().catch(console.error);
