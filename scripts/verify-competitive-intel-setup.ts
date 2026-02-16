/**
 * Verify Competitive Intelligence Setup
 * Checks Firestore for super user tenants, competitors, and heartbeat config
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'studio-567050101-bc6e8',
    });
}

const db = getFirestore();

async function checkSetup() {
  console.log('=== Competitive Intelligence Setup Verification ===\n');
  
  // 1. Check for super user tenants
  console.log('✓ Checking for super user tenants...');
  const superUserQuery = await db.collection('tenants')
    .where('type', '==', 'super_user')
    .get();
  
  console.log(`  Found ${superUserQuery.size} tenant(s) with type='super_user'`);
  
  if (superUserQuery.size > 0) {
    for (const doc of superUserQuery.docs) {
      const data = doc.data();
      console.log(`  - ${data.name || doc.id} (Owner: ${data.ownerId || data.primaryUserId})`);
    }
  }
  
  // 2. Check for active tenants with competitors
  console.log('\n✓ Checking for tenants with competitor tracking...');
  const activeTenantsQuery = await db.collection('tenants')
    .where('status', '==', 'active')
    .get();
  
  console.log(`  Found ${activeTenantsQuery.size} active tenant(s)`);
  
  let tenantsWithCompetitors = 0;
  const competitorDetails = [];
  
  for (const doc of activeTenantsQuery.docs) {
    const data = doc.data();
    const planId = data.planId || 'free';
    
    const competitorsSnap = await db.collection('tenants')
      .doc(doc.id)
      .collection('competitors')
      .where('active', '==', true)
      .get();
    
    if (competitorsSnap.size > 0) {
      tenantsWithCompetitors++;
      competitorDetails.push({
        name: data.name || doc.id,
        id: doc.id,
        plan: planId,
        competitorCount: competitorsSnap.size,
      });
    }
  }
  
  console.log(`\n  Tenants with competitors tracked:`);
  if (competitorDetails.length > 0) {
    for (const detail of competitorDetails) {
      console.log(`  - ${detail.name} (${detail.id})`);
      console.log(`    Plan: ${detail.plan}, Competitors: ${detail.competitorCount}`);
    }
  } else {
    console.log(`  ⚠️  None found`);
  }
  
  // 3. Check heartbeat config for super users
  console.log('\n✓ Checking heartbeat configuration...');
  if (superUserQuery.size > 0) {
    for (const doc of superUserQuery.docs) {
      const heartbeatSnap = await db.collection('tenants')
        .doc(doc.id)
        .collection('settings')
        .doc('heartbeat')
        .get();
      
      if (heartbeatSnap.exists) {
        const config = heartbeatSnap.data();
        console.log(`  - ${doc.data().name || doc.id}:`);
        console.log(`    Enabled: ${config?.enabled !== false}`);
        console.log(`    Interval: ${config?.interval || 30} min`);
        console.log(`    Last run: ${config?.lastRun?.toDate?.() || 'Never'}`);
        console.log(`    Channels: ${(config?.channels || ['dashboard', 'email']).join(', ')}`);
      } else {
        console.log(`  - ${doc.data().name || doc.id}:`);
        console.log(`    ⚠️  No config (will use defaults)`);
        console.log(`    Default: enabled=true, interval=30min, channels=dashboard+email`);
      }
    }
  } else {
    console.log(`  ⚠️  No super user tenants to configure`);
  }
  
  // Summary
  console.log('\n=== Summary ===');
  console.log(`Super user tenants: ${superUserQuery.size}`);
  console.log(`Active tenants total: ${activeTenantsQuery.size}`);
  console.log(`Tenants with competitors: ${tenantsWithCompetitors}`);
  
  if (superUserQuery.size === 0) {
    console.log('\n❌ ISSUE: No super user tenant found');
    console.log('   Action: Create a tenant with type="super_user" or isSuperAdmin=true');
  } else if (tenantsWithCompetitors === 0) {
    console.log('\n⚠️  WARNING: No tenants have competitors tracked');
    console.log('   Reports will be empty until competitors are added');
  } else {
    console.log('\n✅ READY: System configured and will generate reports on Mondays at 9 AM');
  }
}

checkSetup()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
