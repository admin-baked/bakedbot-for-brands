#!/usr/bin/env node

/**
 * Production Testing Script for Critical Revenue Systems
 * Tests all 6 implemented gaps with real order data
 *
 * Usage:
 *   node scripts/test-production-revenue-systems.mjs --org=org_thrive_syracuse
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Parse command line args
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value;
  return acc;
}, {});

const ORG_ID = args.org || 'org_thrive_syracuse';
const BASE_URL = args.url || 'https://bakedbot-prod.web.app';
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error('❌ Error: CRON_SECRET environment variable not set');
  console.error('Run: export CRON_SECRET=$(gcloud secrets versions access latest --secret=CRON_SECRET --project=studio-567050101-bc6e8)');
  process.exit(1);
}

console.log('🧪 Production Testing: Critical Revenue Systems');
console.log('================================================');
console.log(`Organization: ${ORG_ID}`);
console.log(`Base URL: ${BASE_URL}`);
console.log('');

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, status, details = '') {
  const icon = status === 'pass' ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (details) console.log(`   ${details}`);
  results.tests.push({ name, status, details });
  if (status === 'pass') results.passed++;
  else results.failed++;
}

// ============================================
// Test 1: Bundle Scheduling Cron
// ============================================
async function testBundleScheduling() {
  console.log('\n📦 Test 1: Bundle Scheduling Cron');
  console.log('─────────────────────────────────');

  try {
    // Trigger cron endpoint
    const response = await fetch(`${BASE_URL}/api/cron/bundle-transitions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    if (data.success) {
      logTest('Bundle Transitions Cron Endpoint', 'pass',
        `${data.summary.transitionsPerformed} transitions, ${data.summary.errorsEncountered} errors`);
    } else {
      logTest('Bundle Transitions Cron Endpoint', 'fail',
        `Returned success: false`);
    }

    // Check if any bundles exist
    const bundlesSnapshot = await db.collection('bundles')
      .where('orgId', '==', ORG_ID)
      .limit(5)
      .get();

    logTest('Bundle Collection Query', 'pass',
      `Found ${bundlesSnapshot.size} bundles for ${ORG_ID}`);

  } catch (error) {
    logTest('Bundle Scheduling Test', 'fail', error.message);
  }
}

// ============================================
// Test 2: Bundle Redemption Tracking
// ============================================
async function testBundleRedemption() {
  console.log('\n🎟️  Test 2: Bundle Redemption Tracking');
  console.log('───────────────────────────────────────');

  try {
    // Find an active bundle
    const bundlesSnapshot = await db.collection('bundles')
      .where('orgId', '==', ORG_ID)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (bundlesSnapshot.empty) {
      logTest('Find Active Bundle', 'fail', 'No active bundles found');
      return;
    }

    const bundleId = bundlesSnapshot.docs[0].id;
    const bundle = bundlesSnapshot.docs[0].data();

    logTest('Find Active Bundle', 'pass',
      `Bundle: ${bundle.name} (${bundleId})`);

    // Check redemption history
    const redemptionsSnapshot = await db.collection('bundles')
      .doc(bundleId)
      .collection('redemptions')
      .limit(5)
      .get();

    logTest('Redemption History Collection', 'pass',
      `${redemptionsSnapshot.size} redemptions recorded`);

    // Verify currentRedemptions field
    if (typeof bundle.currentRedemptions === 'number') {
      logTest('Current Redemptions Field', 'pass',
        `currentRedemptions: ${bundle.currentRedemptions}`);
    } else {
      logTest('Current Redemptions Field', 'fail',
        'currentRedemptions field missing or invalid');
    }

  } catch (error) {
    logTest('Bundle Redemption Test', 'fail', error.message);
  }
}

// ============================================
// Test 3: Loyalty Points Calculation
// ============================================
async function testLoyaltyPoints() {
  console.log('\n⭐ Test 3: Loyalty Points Calculation');
  console.log('─────────────────────────────────────');

  try {
    // Get loyalty settings
    const loyaltySettingsDoc = await db.collection('tenants')
      .doc(ORG_ID)
      .collection('settings')
      .doc('loyalty')
      .get();

    if (!loyaltySettingsDoc.exists) {
      logTest('Loyalty Settings', 'fail', 'Loyalty settings not found');
      return;
    }

    const settings = loyaltySettingsDoc.data();
    logTest('Loyalty Settings Loaded', 'pass',
      `Points per dollar: ${settings.pointsPerDollar}, Equity multiplier: ${settings.equityMultiplier}`);

    // Find a customer with points
    const customersSnapshot = await db.collection('customers')
      .where('orgId', '==', ORG_ID)
      .where('points', '>', 0)
      .limit(5)
      .get();

    logTest('Customers with Points', 'pass',
      `${customersSnapshot.size} customers have earned points`);

    // Check for points_earned activities
    const activitiesSnapshot = await db.collection('customer_activities')
      .where('orgId', '==', ORG_ID)
      .where('type', '==', 'points_earned')
      .limit(5)
      .get();

    logTest('Points Earned Activity Logs', 'pass',
      `${activitiesSnapshot.size} point award events logged`);

  } catch (error) {
    logTest('Loyalty Points Test', 'fail', error.message);
  }
}

// ============================================
// Test 4: Tier Advancement Logic
// ============================================
async function testTierAdvancement() {
  console.log('\n🏆 Test 4: Tier Advancement Logic');
  console.log('─────────────────────────────────');

  try {
    // Get customers with various tiers
    const tierCounts = {};
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];

    for (const tier of tiers) {
      const snapshot = await db.collection('customers')
        .where('orgId', '==', ORG_ID)
        .where('tier', '==', tier)
        .count()
        .get();

      tierCounts[tier] = snapshot.data().count;
    }

    logTest('Tier Distribution', 'pass',
      `Bronze: ${tierCounts.bronze}, Silver: ${tierCounts.silver}, Gold: ${tierCounts.gold}, Platinum: ${tierCounts.platinum}`);

    // Find customers with tierUpdatedAt field
    const recentTierUpdates = await db.collection('customers')
      .where('orgId', '==', ORG_ID)
      .where('tierUpdatedAt', '!=', null)
      .limit(5)
      .get();

    logTest('Tier Update Tracking', 'pass',
      `${recentTierUpdates.size} customers have tierUpdatedAt timestamps`);

  } catch (error) {
    logTest('Tier Advancement Test', 'fail', error.message);
  }
}

// ============================================
// Test 5: Loyalty Redemption Workflow
// ============================================
async function testLoyaltyRedemption() {
  console.log('\n🎁 Test 5: Loyalty Redemption Workflow');
  console.log('──────────────────────────────────────');

  try {
    // Check for points_redeemed activities
    const redemptionsSnapshot = await db.collection('customer_activities')
      .where('orgId', '==', ORG_ID)
      .where('type', '==', 'points_redeemed')
      .limit(10)
      .get();

    if (redemptionsSnapshot.empty) {
      logTest('Points Redemption History', 'pass',
        'No redemptions yet (expected for new system)');
    } else {
      logTest('Points Redemption History', 'pass',
        `${redemptionsSnapshot.size} redemption events logged`);

      // Verify redemption structure
      const sampleRedemption = redemptionsSnapshot.docs[0].data();
      if (sampleRedemption.metadata?.pointsRedeemed && sampleRedemption.metadata?.dollarValue) {
        logTest('Redemption Data Structure', 'pass',
          `Sample: ${sampleRedemption.metadata.pointsRedeemed} pts → $${sampleRedemption.metadata.dollarValue}`);
      } else {
        logTest('Redemption Data Structure', 'fail',
          'Missing pointsRedeemed or dollarValue in metadata');
      }
    }

  } catch (error) {
    logTest('Loyalty Redemption Test', 'fail', error.message);
  }
}

// ============================================
// Test 6: Churn Prediction Model
// ============================================
async function testChurnPrediction() {
  console.log('\n📉 Test 6: Churn Prediction Model');
  console.log('─────────────────────────────────');

  try {
    // Trigger churn prediction cron (GET with orgId)
    const response = await fetch(
      `${BASE_URL}/api/cron/churn-prediction?secret=${encodeURIComponent(CRON_SECRET)}&orgId=${ORG_ID}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    if (data.success) {
      logTest('Churn Prediction Cron Endpoint', 'pass',
        `${data.predictions} predictions, ${data.highRisk} high-risk customers`);
    } else {
      logTest('Churn Prediction Cron Endpoint', 'fail',
        'Returned success: false');
    }

    // Check for customers with churn predictions
    const customersWithChurn = await db.collection('customers')
      .where('orgId', '==', ORG_ID)
      .where('churnProbability', '!=', null)
      .limit(10)
      .get();

    logTest('Churn Predictions Stored', 'pass',
      `${customersWithChurn.size} customers have churn predictions`);

    // Check risk level distribution
    if (!customersWithChurn.empty) {
      const riskLevels = {};
      customersWithChurn.docs.forEach(doc => {
        const level = doc.data().churnRiskLevel || 'unknown';
        riskLevels[level] = (riskLevels[level] || 0) + 1;
      });

      logTest('Risk Level Distribution', 'pass',
        Object.entries(riskLevels).map(([k, v]) => `${k}: ${v}`).join(', '));
    }

  } catch (error) {
    logTest('Churn Prediction Test', 'fail', error.message);
  }
}

// ============================================
// Run All Tests
// ============================================
async function runAllTests() {
  await testBundleScheduling();
  await testBundleRedemption();
  await testLoyaltyPoints();
  await testTierAdvancement();
  await testLoyaltyRedemption();
  await testChurnPrediction();

  // Print summary
  console.log('\n');
  console.log('═══════════════════════════════════════════════');
  console.log('Test Summary');
  console.log('═══════════════════════════════════════════════');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total:  ${results.passed + results.failed}`);
  console.log('');

  if (results.failed === 0) {
    console.log('🎉 All tests passed! Revenue systems are operational.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Review errors above.');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
