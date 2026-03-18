/**
 * Seed Thrive Syracuse tenant doc + domain memory
 * Run: node --env-file=.env.local scripts/seed-thrive-tenant.mjs
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '';
const serviceAccount = JSON.parse(
    serviceAccountKey.startsWith('{')
        ? serviceAccountKey
        : Buffer.from(serviceAccountKey, 'base64').toString('utf8')
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const ORG_ID = 'org_thrive_syracuse';

async function run() {
    // 1. Create tenants/org_thrive_syracuse doc
    await db.collection('tenants').doc(ORG_ID).set({
        name: 'Thrive Syracuse',
        orgId: ORG_ID,
        type: 'dispensary',
        city: 'Syracuse',
        state: 'NY',
        marketState: 'NY',
        active: true,
        updatedAt: new Date(),
    }, { merge: true });
    console.log('✅ tenants/org_thrive_syracuse created');

    // 2. Create domain_memory/profile for Ezal + all agents
    await db.doc(`tenants/${ORG_ID}/domain_memory/profile`).set({
        brand_profile: {
            name: 'Thrive Syracuse',
            orgId: ORG_ID,
            tone_of_voice: 'Welcoming, knowledgeable, community-focused',
            target_markets: ['Syracuse, NY', 'Central New York'],
            product_focus: ['recreational cannabis', 'medical cannabis'],
            positioning: 'Premium local dispensary serving the Syracuse community with curated cannabis products and expert guidance.',
        },
        priority_objectives: [
            {
                id: 'obj_competitive_intel',
                description: 'Monitor local NYC/Syracuse market competitors and maintain competitive pricing',
                priority: 'high',
                status: 'running',
            }
        ],
        constraints: {
            jurisdictions: ['NY'],
            prohibited_claims: ['medical benefit', 'cure', 'treat'],
            age_gate: true,
        },
        segments: [
            {
                id: 'seg_recreational',
                name: 'Recreational Customers',
                description: 'Adults 21+ seeking recreational cannabis products',
                size_estimate: 'large',
            }
        ],
        experiments_index: [],
        playbooks: {
            competitive_intel: 'daily-competitive-intelligence',
        },
        updatedAt: new Date(),
    }, { merge: false });
    console.log('✅ tenants/org_thrive_syracuse/domain_memory/profile created');

    console.log('\nDone! Thrive Syracuse agents will now load full org context.');
}

run().catch(console.error);
