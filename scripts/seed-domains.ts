/**
 * Seed Domain Mappings for Custom Domains
 *
 * Run: npx ts-node scripts/seed-domains.ts
 */
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

// Initialize Firebase Admin using service account file
const app = getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert(path.resolve(__dirname, '../service-account.json'))
});

const db = getFirestore(app);

async function seedDomainData() {
    console.log('Seeding domain data...');
    const timestamp = new Date().toISOString();

    // Brand and tenant IDs must match what was created in configure-ecstatic-edibles.ts
    const BRAND_ID = 'brand_ecstatic_edibles';
    const BRAND_SLUG = 'ecstaticedibles';

    // 1. Create domain_mappings document
    // Maps ecstaticedibles.com -> brand slug for URL routing
    const domainMappingData = {
        domain: 'ecstaticedibles.com',
        tenantId: BRAND_SLUG, // Route to /ecstaticedibles which loads brand by slug
        connectionType: 'a_record',
        verifiedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
    };

    await db.collection('domain_mappings').doc('ecstaticedibles.com').set(domainMappingData);
    console.log('✅ Created domain_mappings/ecstaticedibles.com');

    // 2. Create tenants document for custom domain resolution
    // This is looked up by the domain resolver API
    const tenantData = {
        id: BRAND_SLUG,
        type: 'brand',
        name: 'Ecstatic Edibles',
        brandId: BRAND_ID, // Link to actual brand document
        customDomain: {
            domain: 'ecstaticedibles.com',
            verificationStatus: 'verified',
            connectionType: 'a_record'
        },
        updatedAt: timestamp
    };

    await db.collection('tenants').doc(BRAND_SLUG).set(tenantData, { merge: true });
    console.log('✅ Created/Updated tenants/ecstaticedibles');

    // Also verify if we need to sync this to 'brands' collection just in case, 
    // but I will stick to the exact request first. 
    // If 'tenants' is effectively 'brands' in this codebase, I should check.
    // Step 746 created 'brands/ecstaticedibles'. 
    // I'll do exactly what is asked: write to 'tenants'.
}

seedDomainData().catch(console.error);
