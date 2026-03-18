/**
 * Activate Thrive Syracuse on the Optimize Plan
 *
 * This script:
 * 1. Sets org_thrive_syracuse billing to Optimize plan (active)
 * 2. Marks thrivesyracuse brand page as claimed
 * 3. Configures ZIP code coverage with socially-conscious flags
 * 4. Initializes AI credit allocation for Optimize tier
 *
 * Run with: npx tsx scripts/setup-thrive-optimize-plan.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set');
        process.exit(1);
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        initializeApp({
            credential: cert(serviceAccount),
        });
    } catch (error) {
        console.error('❌ Failed to parse service account key:', error);
        process.exit(1);
    }
}

const db = getFirestore();

const ORG_ID = 'org_thrive_syracuse';
const BRAND_SLUG = 'thrivesyracuse';

// ZIP code coverage configuration
// Primary: 13224 (Thrive's home zip — Erie Blvd E)
// Secondary: 13214, 13210, 13206
// Extended: 13066, 13203, 13057
// Socially conscious: 13210, 13203
const ZIP_COVERAGE = [
    {
        zip: '13224',
        label: 'Primary',
        priority: 1,
        socialllyConscious: false,
        note: 'Home ZIP — Erie Blvd E',
    },
    {
        zip: '13214',
        label: 'Secondary',
        priority: 2,
        socialllyConscious: false,
        note: 'DeWitt / East Syracuse',
    },
    {
        zip: '13210',
        label: 'Secondary',
        priority: 2,
        sociallyConscious: true,
        note: 'South Side — socially conscious community',
        sociallyConsciousMessage: "Thrive is proud to serve the South Side community. As a socially conscious dispensary, we're committed to reinvesting in neighborhoods that were most impacted by the War on Drugs.",
    },
    {
        zip: '13206',
        label: 'Secondary',
        priority: 2,
        sociallyConscious: false,
        note: 'North Side',
    },
    {
        zip: '13066',
        label: 'Extended',
        priority: 3,
        sociallyConscious: false,
        note: 'Fayetteville / Manlius',
    },
    {
        zip: '13203',
        label: 'Extended',
        priority: 3,
        sociallyConscious: true,
        note: 'Near West Side — socially conscious community',
        sociallyConsciousMessage: "Thrive believes equitable cannabis access starts in communities like ours. Near West Side residents get priority attention and community-focused care from our team.",
    },
    {
        zip: '13057',
        label: 'Extended',
        priority: 3,
        sociallyConscious: false,
        note: 'East Syracuse / Minoa',
    },
];

async function activateThriveOptimizePlan() {
    console.log('🚀 Activating Thrive Syracuse on Optimize Plan...\n');

    // ----------------------------------------------------------------
    // 1. Update organization billing
    // ----------------------------------------------------------------
    console.log(`📋 Step 1: Updating ${ORG_ID} billing to Optimize plan...`);

    const orgRef = db.collection('organizations').doc(ORG_ID);
    const orgSnap = await orgRef.get();

    if (!orgSnap.exists) {
        console.error(`❌ Organization ${ORG_ID} not found in Firestore`);
        process.exit(1);
    }

    await orgRef.update({
        'billing.planId': 'optimize',
        'billing.subscriptionStatus': 'active',
        'billing.currentPeriodStart': FieldValue.serverTimestamp(),
        'billing.monthlyAmount': 1500,
        'billing.includedCredits': 7500,
        'billing.creditRollover': true,
        'billing.creditTopUpRate': 2,
        'billing.activatedAt': FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });

    console.log('✅ Org billing updated → Optimize ($1,500/mo, 7,500 credits/mo)\n');

    // ----------------------------------------------------------------
    // 2. Initialize AI credit ledger
    // ----------------------------------------------------------------
    console.log('💳 Step 2: Initializing AI credit ledger...');

    const creditsRef = db
        .collection('organizations')
        .doc(ORG_ID)
        .collection('billing')
        .doc('credits');

    await creditsRef.set({
        planId: 'optimize',
        includedCreditsTotal: 7500,
        includedCreditsUsed: 0,
        rolloverCreditsTotal: 0,
        rolloverCreditsUsed: 0,
        topUpCreditsTotal: 0,
        topUpCreditsUsed: 0,
        periodStart: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log('✅ Credit ledger initialized (7,500 included credits)\n');

    // ----------------------------------------------------------------
    // 3. Mark brand page as claimed
    // ----------------------------------------------------------------
    console.log(`🏷️  Step 3: Marking brand page '${BRAND_SLUG}' as claimed...`);

    const brandsQuery = await db
        .collection('brands')
        .where('slug', '==', BRAND_SLUG)
        .limit(1)
        .get();

    if (brandsQuery.empty) {
        // Try by document ID
        const brandByIdSnap = await db.collection('brands').doc(BRAND_SLUG).get();
        if (!brandByIdSnap.exists) {
            console.warn(`⚠️  Brand '${BRAND_SLUG}' not found — skipping claim update`);
        } else {
            await brandByIdSnap.ref.update({
                claimStatus: 'claimed',
                orgId: ORG_ID,
                updatedAt: FieldValue.serverTimestamp(),
            });
            console.log(`✅ Brand doc '${BRAND_SLUG}' marked as claimed (orgId: ${ORG_ID})\n`);
        }
    } else {
        const brandDoc = brandsQuery.docs[0];
        await brandDoc.ref.update({
            claimStatus: 'claimed',
            orgId: ORG_ID,
            updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`✅ Brand '${BRAND_SLUG}' (${brandDoc.id}) marked as claimed (orgId: ${ORG_ID})\n`);
    }

    // ----------------------------------------------------------------
    // 4. Configure ZIP code coverage
    // ----------------------------------------------------------------
    console.log('📍 Step 4: Configuring ZIP code coverage...');

    const coverageRef = db
        .collection('organizations')
        .doc(ORG_ID)
        .collection('config')
        .doc('coverage');

    await coverageRef.set({
        primaryZip: '13224',
        zips: ZIP_COVERAGE,
        sociallyConsciousZips: ZIP_COVERAGE
            .filter(z => z.sociallyConscious)
            .map(z => z.zip),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: false });

    console.log('✅ ZIP coverage configured:');
    ZIP_COVERAGE.forEach(z => {
        const scFlag = z.sociallyConscious ? ' 🫶 [socially conscious]' : '';
        console.log(`   ${z.zip} (${z.label})${scFlag}`);
    });
    console.log();

    // ----------------------------------------------------------------
    // 5. Summary
    // ----------------------------------------------------------------
    console.log('─────────────────────────────────────────────');
    console.log('✅ Thrive Syracuse activation complete!\n');
    console.log('  Org:          org_thrive_syracuse');
    console.log('  Plan:         Optimize ($1,500/mo)');
    console.log('  Credits:      7,500/mo (rollover enabled)');
    console.log('  Brand:        thrivesyracuse → claimed');
    console.log('  SmokeyPay:    Enabled (claimed page checkout)');
    console.log('  ZIP codes:    13224 (primary), 13214, 13210*, 13206, 13066, 13203*, 13057');
    console.log('  * = socially conscious flag + custom messaging');
    console.log('─────────────────────────────────────────────');
}

activateThriveOptimizePlan().catch((err) => {
    console.error('❌ Script failed:', err);
    process.exit(1);
});
