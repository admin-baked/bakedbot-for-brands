#!/usr/bin/env node

/**
 * Enroll Thrive Syracuse Customers in Loyalty Program & Playbooks
 *
 * This script:
 * 1. Fetches all 111 customers for org_thrive_syracuse with email addresses
 * 2. Creates/updates loyalty enrollment records with initial points (starting bronze tier)
 * 3. Creates playbook assignments for Empire tier (22 playbooks) in 'paused' (draft) state
 * 4. Provides detailed enrollment report
 *
 * Status: All assignments will be PAUSED (draft) until Mailjet subuser setup is complete.
 */

import admin from 'firebase-admin';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// ==========================================
// Configuration
// ==========================================

const ORG_ID = 'org_thrive_syracuse';
const TIER_ID = 'empire';

// Empire tier playbooks (22 total — excluding scout-only 'weekly-competitive-snapshot')
const EMPIRE_PLAYBOOKS = [
  // Onboarding
  'welcome-sequence',
  'owner-quickstart-guide',
  'menu-health-scan',
  'white-glove-onboarding',

  // Engagement
  'post-purchase-thank-you',
  'birthday-loyalty-reminder',
  'win-back-sequence',
  'new-product-launch',
  'vip-customer-identification',

  // Competitive Intel
  'pro-competitive-brief',
  'daily-competitive-intel',
  'real-time-price-alerts',

  // Compliance
  'weekly-compliance-digest',
  'pre-send-campaign-check',
  'jurisdiction-change-alert',
  'audit-prep-automation',

  // Analytics
  'weekly-performance-snapshot',
  'campaign-roi-report',
  'executive-daily-digest',
  'multi-location-rollup',

  // Seasonal
  'seasonal-template-pack',

  // System
  'usage-alert',
];

// Loyalty starting values
const LOYALTY_INITIAL = {
  points: 0,
  tier: 'bronze',
  lifetimeValue: 0,
  orderCount: 0,
  totalSpent: 0,
};

// ==========================================
// Initialize Firebase
// ==========================================

async function initializeFirebase() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const encodedKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!encodedKey) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY environment variable not found. ' +
      'Make sure .env.local is loaded.'
    );
  }

  // Decode base64 service account key
  const serviceAccountJson = Buffer.from(encodedKey, 'base64').toString('utf-8');
  const serviceAccount = JSON.parse(serviceAccountJson);

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: 'studio-567050101-bc6e8',
  });
}

// ==========================================
// Main Enrollment Logic
// ==========================================

async function enrollThriveSyracuseCustomers() {
  console.log('\n🚀 Starting Thrive Syracuse customer enrollment...\n');

  const app = await initializeFirebase();
  const db = getFirestore(app);

  const stats = {
    totalCustomers: 0,
    customersWithEmail: 0,
    loyaltyEnrolled: 0,
    playbookAssignmentsCreated: 0,
    errors: [],
  };

  try {
    // ========== Step 1: Fetch all customers ==========
    console.log('📋 Step 1: Fetching customers...');

    const customersSnapshot = await db
      .collection('customers')
      .where('orgId', '==', ORG_ID)
      .get();

    console.log(`   Found ${customersSnapshot.size} total customer profiles`);
    stats.totalCustomers = customersSnapshot.size;

    // ========== Step 2: Filter customers with emails ==========
    console.log('✉️  Step 2: Filtering customers with email addresses...');

    const customersWithEmail = customersSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((customer) => customer.email && customer.email.trim().length > 0);

    console.log(`   Found ${customersWithEmail.length} customers with email addresses`);
    stats.customersWithEmail = customersWithEmail.length;

    // ========== Step 3: Enroll in Loyalty Program ==========
    console.log('\n💳 Step 3: Enrolling in Loyalty Program...');

    const batch1 = db.batch();
    let batchCount = 0;

    for (const customer of customersWithEmail) {
      const customerRef = db.collection('customers').doc(customer.id);

      batch1.update(customerRef, {
        points: LOYALTY_INITIAL.points,
        tier: LOYALTY_INITIAL.tier,
        lifetimeValue: LOYALTY_INITIAL.lifetimeValue,
        orderCount: LOYALTY_INITIAL.orderCount || 0,
        totalSpent: LOYALTY_INITIAL.totalSpent || 0,
        loyaltyEnrolledAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      batchCount++;
      stats.loyaltyEnrolled++;

      // Commit in batches of 500
      if (batchCount % 500 === 0) {
        await batch1.commit();
        console.log(`   Committed ${batchCount} loyalty enrollments...`);
      }
    }

    // Final commit
    if (batchCount % 500 !== 0) {
      await batch1.commit();
      console.log(`   ✅ Committed ${batchCount} loyalty enrollments total`);
    }

    // ========== Step 4: Create Playbook Assignments (PAUSED) ==========
    console.log('\n📚 Step 4: Creating playbook assignments (PAUSED state)...');

    const batch2 = db.batch();
    let assignmentCount = 0;

    // NOTE: In the current system, playbooks are assigned per subscription,
    // not per individual customer. However, for enrollment tracking, we'll create
    // a dummy subscription ID per org to manage playbook state.
    const subscriptionId = `${ORG_ID}-empire-subscription`;

    for (const playbookId of EMPIRE_PLAYBOOKS) {
      const assignmentRef = db.collection('playbook_assignments').doc();

      batch2.set(assignmentRef, {
        subscriptionId,
        orgId: ORG_ID,
        playbookId,
        status: 'paused', // DRAFT STATE — Will be activated after Mailjet setup
        lastTriggered: null,
        triggerCount: 0,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        enrollmentNotes: 'Paused until Mailjet subuser configuration complete',
      });

      assignmentCount++;
      stats.playbookAssignmentsCreated++;

      // Commit in batches of 500
      if (assignmentCount % 500 === 0) {
        await batch2.commit();
        console.log(`   Committed ${assignmentCount} playbook assignments...`);
      }
    }

    // Final commit
    if (assignmentCount % 500 !== 0) {
      await batch2.commit();
      console.log(`   ✅ Committed ${assignmentCount} playbook assignments total`);
    }

    // ========== Step 5: Generate Report ==========
    console.log('\n📊 Enrollment Summary\n');
    console.log('═'.repeat(60));
    console.log(`Organization: ${ORG_ID}`);
    console.log(`Tier: ${TIER_ID.toUpperCase()}`);
    console.log('═'.repeat(60));
    console.log(`Total Customers in Org:        ${stats.totalCustomers}`);
    console.log(`Customers with Email:         ${stats.customersWithEmail}`);
    console.log(`Loyalty Enrollments:          ${stats.loyaltyEnrolled}`);
    console.log(`Playbook Assignments:         ${stats.playbookAssignmentsCreated}`);
    console.log(`Playbook Status:              PAUSED (Draft)`);
    console.log('═'.repeat(60));

    // ========== Step 6: Verify Assignments ==========
    console.log('\n✅ Step 6: Verifying assignments...');

    const assignmentSnapshot = await db
      .collection('playbook_assignments')
      .where('subscriptionId', '==', subscriptionId)
      .get();

    console.log(
      `   Playbook assignments in Firestore: ${assignmentSnapshot.size}`
    );
    console.log(`   Expected: ${EMPIRE_PLAYBOOKS.length}`);

    if (assignmentSnapshot.size === EMPIRE_PLAYBOOKS.length) {
      console.log('   ✅ All assignments created successfully');
    } else {
      console.warn(
        `   ⚠️  Mismatch: ${assignmentSnapshot.size} vs ${EMPIRE_PLAYBOOKS.length}`
      );
    }

    // ========== Step 7: Generate Playbook List ==========
    console.log('\n📋 Empire Tier Playbooks (All PAUSED):');
    console.log('─'.repeat(60));
    EMPIRE_PLAYBOOKS.forEach((pb, idx) => {
      console.log(`  ${idx + 1}. ${pb}`);
    });

    // ========== Step 8: Next Steps ==========
    console.log('\n\n🔄 Next Steps:');
    console.log('─'.repeat(60));
    console.log('1. ✅ Customers enrolled in Loyalty Program (Bronze tier, 0 points)');
    console.log('2. ✅ Playbook assignments created (PAUSED state)');
    console.log('3. ⏳ Configure Mailjet subuser for Thrive Syracuse');
    console.log('4. 🔧 After Mailjet setup, activate playbooks by updating');
    console.log(
      '   playbook_assignments status from "paused" to "active"'
    );
    console.log('5. 📧 Email campaigns will begin triggering based on playbook');
    console.log('   event triggers and schedules');

    console.log('\n✨ Enrollment complete!\n');

    return stats;
  } catch (error) {
    console.error('\n❌ Enrollment failed:', error);
    stats.errors.push(error.message);
    throw error;
  } finally {
    await app.delete();
  }
}

// ==========================================
// Execution
// ==========================================

enrollThriveSyracuseCustomers()
  .then((stats) => {
    console.log('\n📈 Final Statistics:');
    console.log(JSON.stringify(stats, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
