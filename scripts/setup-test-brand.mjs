#!/usr/bin/env node

/**
 * Setup Test Brand Account
 *
 * Creates a brand account for production readiness testing
 * Usage: node scripts/setup-test-brand.mjs [email] [brand-name]
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app.js';
import { getAuth } from 'firebase-admin/auth.js';
import { getFirestore } from 'firebase-admin/firestore.js';
import * as fs from 'fs';
import * as path from 'path';

// Load service account
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH ||
  path.join(process.cwd(), 'firebase-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`❌ Service account not found at: ${serviceAccountPath}`);
  console.error('Set FIREBASE_SERVICE_ACCOUNT_KEY_PATH or place key in root directory');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase
if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const auth = getAuth();
const db = getFirestore();

// Default test credentials
const email = process.argv[2] || 'test-brand@bakedbot.ai';
const brandName = process.argv[3] || 'Test Brand QA';

async function setupTestBrand() {
  try {
    console.log('🚀 Setting up test brand account...\n');

    // 1. Create user in Firebase Auth
    console.log(`1️⃣  Creating user: ${email}`);
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log(`   ✓ User already exists: ${user.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        user = await auth.createUser({
          email,
          password: 'TestBrand123!@#',
          emailVerified: true,
        });
        console.log(`   ✓ Created user: ${user.uid}`);
      } else {
        throw error;
      }
    }

    const uid = user.uid;

    // 2. Set custom claims (brand role)
    console.log(`\n2️⃣  Setting custom claims`);
    await auth.setCustomUserClaims(uid, {
      role: 'brand',
      orgId: `org_test_brand_${Date.now()}`,
    });
    console.log(`   ✓ Claims set: role=brand`);

    // 3. Create brand org in Firestore
    console.log(`\n3️⃣  Creating brand org in Firestore`);
    const orgId = `org_test_brand_${Date.now()}`;
    await db.collection('orgs').doc(orgId).set({
      id: orgId,
      name: brandName,
      type: 'brand',
      owner: uid,
      createdAt: new Date(),
      status: 'active',
      plan: 'pro',
      settings: {
        timezone: 'America/Los_Angeles',
        currency: 'USD',
      },
    });
    console.log(`   ✓ Org created: ${orgId}`);

    // 4. Create user profile in Firestore
    console.log(`\n4️⃣  Creating user profile`);
    await db.collection('users').doc(uid).set({
      uid,
      email,
      name: brandName.replace(/test|qa/i, '').trim(),
      organizationIds: [orgId],
      organizations: [
        {
          orgId,
          orgName: brandName,
          orgType: 'brand',
          role: 'brand',
          joinedAt: new Date(),
        },
      ],
      role: 'brand',
      currentOrgId: orgId,
      createdAt: new Date(),
      lastLogin: new Date(),
    });
    console.log(`   ✓ User profile created`);

    // 5. Create sample data for testing
    console.log(`\n5️⃣  Creating sample data`);

    // Sample playbooks
    await db.collection('orgs').doc(orgId).collection('playbooks').doc('pb_test_1').set({
      id: 'pb_test_1',
      name: 'Welcome Email Campaign',
      description: 'Send welcome email to new customers',
      status: 'active',
      steps: [
        {
          id: 'step_1',
          type: 'send_email',
          config: { template: 'welcome' },
        },
      ],
      executionCount: 0,
      lastExecuted: null,
      createdAt: new Date(),
    });

    await db.collection('orgs').doc(orgId).collection('playbooks').doc('pb_test_2').set({
      id: 'pb_test_2',
      name: 'SMS Alert to VIP Customers',
      description: 'Send SMS to high-value customers',
      status: 'active',
      steps: [
        {
          id: 'step_1',
          type: 'send_sms',
          config: { message: 'VIP Alert' },
        },
      ],
      executionCount: 0,
      lastExecuted: null,
      createdAt: new Date(),
    });

    console.log(`   ✓ Sample playbooks created`);

    // Sample loyalty settings
    await db.collection('orgs').doc(orgId).collection('settings').doc('loyalty').set({
      pointsPerDollar: 1,
      pointsPerDollarMultiplier: 2,
      vipThreshold: 500,
      loyaltyProgramName: 'Rewards Program',
      segments: [
        {
          id: 'segment_new',
          name: 'New Customers',
          criteria: { minOrders: 0, maxOrders: 1 },
        },
        {
          id: 'segment_loyal',
          name: 'Loyal Customers',
          criteria: { minOrders: 5 },
        },
      ],
    });

    console.log(`   ✓ Loyalty settings created`);

    // 6. Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Test Brand Account Setup Complete!\n');
    console.log('📝 Credentials:');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: TestBrand123!@#`);
    console.log(`   Org ID:   ${orgId}`);
    console.log(`   User ID:  ${uid}`);
    console.log('\n🚀 Next Steps:');
    console.log('   1. Start dev server: npm run dev');
    console.log(`   2. Go to: http://localhost:3000/signin`);
    console.log(`   3. Login with: ${email}`);
    console.log(`   4. Redirect: /dashboard (Brand Dashboard)`);
    console.log(`   5. Run tests: npm test -- --watch`);
    console.log(`\n📊 Test Data Created:`);
    console.log('   ✓ 2 sample playbooks (Email, SMS)');
    console.log('   ✓ Loyalty settings with segments');
    console.log('   ✓ User profile + org');
    console.log(`\n${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ Error setting up test brand:', error.message);
    process.exit(1);
  }
}

setupTestBrand();
