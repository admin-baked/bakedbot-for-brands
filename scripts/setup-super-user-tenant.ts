/**
 * Create Super User Tenant for Martez
 * Sets up the super admin tenant for receiving heartbeat notifications
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'studio-567050101-bc6e8',
    });
}

const db = getFirestore();
const auth = getAuth();

async function setupSuperUserTenant() {
  console.log('=== Setting up Super User Tenant ===\n');
  
  // 1. Get or create Martez's user account
  const superUserEmail = 'martez@bakedbot.ai';
  console.log(`✓ Looking up user: ${superUserEmail}`);
  
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(superUserEmail);
    console.log(`  Found existing user: ${userRecord.uid}`);
  } catch (error) {
    console.log(`  User not found, would need to be created via signup`);
    console.log(`  Please sign up at https://bakedbot.ai first`);
    process.exit(1);
  }
  
  // 2. Create super user tenant
  const tenantId = 'bakedbot_super_admin';
  console.log(`\n✓ Creating super user tenant: ${tenantId}`);
  
  const tenantRef = db.collection('tenants').doc(tenantId);
  const tenantSnap = await tenantRef.get();
  
  if (tenantSnap.exists) {
    console.log(`  Tenant already exists, updating...`);
  }
  
  await tenantRef.set({
    id: tenantId,
    name: 'BakedBot Super Admin',
    type: 'super_user',
    isSuperAdmin: true,
    status: 'active',
    ownerId: userRecord.uid,
    primaryUserId: userRecord.uid,
    planId: 'enterprise',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    settings: {
      timezone: 'America/New_York',
    },
  }, { merge: true });
  
  console.log(`  ✅ Tenant created/updated`);
  
  // 3. Set up heartbeat configuration
  console.log(`\n✓ Configuring heartbeat for super user...`);
  
  await tenantRef.collection('settings').doc('heartbeat').set({
    enabled: true,
    interval: 30, // Check every 30 minutes
    activeHours: {
      start: 6,  // 6 AM
      end: 22,   // 10 PM
    },
    quietHours: {
      start: 22, // 10 PM
      end: 6,    // 6 AM
    },
    timezone: 'America/New_York',
    channels: ['dashboard', 'email'],
    suppressAllClear: false,
    enabledChecks: [
      'system_errors',
      'deployment_status',
      'new_signups',
      'churn_risk',
      'academy_leads',
      'vibe_leads',
      'gmail_unread',
      'calendar_upcoming',
      'competitive_intel', // ← Our new check!
      'platform_health',
    ],
    lastRun: null,
  }, { merge: true });
  
  console.log(`  ✅ Heartbeat configured`);
  console.log(`     Enabled checks: 10 (including competitive_intel)`);
  console.log(`     Active hours: 6 AM - 10 PM EST`);
  console.log(`     Channels: dashboard, email`);
  
  // 4. Update user document with tenant reference
  console.log(`\n✓ Updating user document...`);
  
  await db.collection('users').doc(userRecord.uid).set({
    email: superUserEmail,
    role: 'super_user',
    organizationIds: [tenantId],
    currentOrgId: tenantId,
    customClaims: {
      role: 'super_user',
      orgId: tenantId,
    },
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  
  console.log(`  ✅ User document updated`);
  
  // 5. Set custom claims
  console.log(`\n✓ Setting Firebase Auth custom claims...`);
  
  await auth.setCustomUserClaims(userRecord.uid, {
    role: 'super_user',
    orgId: tenantId,
  });
  
  console.log(`  ✅ Custom claims set`);
  
  // Summary
  console.log('\n=== Setup Complete ===');
  console.log(`Tenant ID: ${tenantId}`);
  console.log(`User ID: ${userRecord.uid}`);
  console.log(`Email: ${superUserEmail}`);
  console.log(`\n✅ Super user tenant configured successfully!`);
  console.log(`\nNext steps:`);
  console.log(`1. Add competitor data to at least one active tenant`);
  console.log(`2. Wait until Monday 9 AM EST for automatic report`);
  console.log(`3. OR manually trigger via API for testing`);
}

setupSuperUserTenant()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
