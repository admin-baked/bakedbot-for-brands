/**
 * Essex Apothecary Pilot Setup Script
 * 
 * This script sets up the pilot customer configuration in Firestore.
 * Run with: npx ts-node --transpile-only dev/setup-essex-pilot.ts
 * 
 * IMPORTANT: These credentials are EXCLUSIVE to Essex Apothecary.
 * Do NOT use them for any other integration.
 */

import * as admin from 'firebase-admin';
import { resolve } from 'path';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  const serviceAccountPath = resolve(__dirname, '../.keys/service-account.json');
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch {
    // Fall back to application default credentials
    admin.initializeApp();
  }
}

const firestore = admin.firestore();

const ESSEX_CONFIG = {
  organizationId: 'org_essex_apothecary',
  locationId: 'loc_essex_main',
  name: 'Essex Apothecary',
  ownerEmail: 'essexapothecary@bakedbot.ai',
  
  // Dutchie POS Configuration
  posConfig: {
    provider: 'dutchie',
    status: 'active',
    clientId: '7ce3ca6c-ab87-479f-8a8e-cc713cbc67dd',
    locationId: '3af693f9-ee33-43de-9d68-2a8c25881517',
    apiKey: '487c94ca-684f-4237-b3ef-6adb996437f1',
    // Order Ahead credentials
    orderAhead: {
      clientId: 'DuhGhnVA5nKbokCDDDtcXO3kdt8VdyzG',
      clientToken: '6AnJC-ZcHoxbIE5IGg1kJFQtyyIDRx2Jz1cpY3eY0fwI8WldMjf6tU-2kyhNQP9s'
    },
    lastSyncedAt: null
  }
};

async function setupEssexPilot() {
  console.log('Setting up Essex Apothecary pilot configuration...');
  
  // 1. Create Organization
  const orgRef = firestore.collection('organizations').doc(ESSEX_CONFIG.organizationId);
  await orgRef.set({
    id: ESSEX_CONFIG.organizationId,
    name: ESSEX_CONFIG.name,
    slug: 'essex-apothecary',
    type: 'dispensary',
    status: 'active',
    claimStatus: 'claimed',
    ownerEmail: ESSEX_CONFIG.ownerEmail,
    settings: {
      policyPack: 'balanced',
      allowOverrides: true
    },
    billing: {
      subscriptionStatus: 'active',
      planId: 'claim_pro' // Pilot gets pro features
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }, { merge: true });
  
  console.log('✓ Created organization:', ESSEX_CONFIG.organizationId);
  
  // 2. Create Location with POS Config
  const locRef = firestore.collection('locations').doc(ESSEX_CONFIG.locationId);
  await locRef.set({
    id: ESSEX_CONFIG.locationId,
    orgId: ESSEX_CONFIG.organizationId,
    name: 'Main Location',
    posConfig: ESSEX_CONFIG.posConfig,
    createdAt: new Date(),
    updatedAt: new Date()
  }, { merge: true });
  
  console.log('✓ Created location with Dutchie POS config:', ESSEX_CONFIG.locationId);
  
  // 3. Update user profile if exists
  const usersSnap = await firestore.collection('users')
    .where('email', '==', ESSEX_CONFIG.ownerEmail)
    .limit(1)
    .get();
  
  if (!usersSnap.empty) {
    const userDoc = usersSnap.docs[0];
    await userDoc.ref.update({
      organizationIds: [ESSEX_CONFIG.organizationId],
      currentOrgId: ESSEX_CONFIG.organizationId,
      locationId: ESSEX_CONFIG.locationId,
      role: 'dispensary',
      updatedAt: new Date()
    });
    console.log('✓ Updated user profile for:', ESSEX_CONFIG.ownerEmail);
  } else {
    console.log('⚠ User not found. They will need to sign up first.');
  }
  
  // 4. Queue initial product sync job
  await firestore.collection('data_jobs').add({
    type: 'product_sync',
    entityId: ESSEX_CONFIG.locationId,
    entityName: ESSEX_CONFIG.name,
    entityType: 'dispensary',
    orgId: ESSEX_CONFIG.organizationId,
    status: 'pending',
    message: `Initial Dutchie sync for ${ESSEX_CONFIG.name}`,
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    attempts: 0,
    metadata: {
      locationId: ESSEX_CONFIG.locationId,
      provider: 'dutchie'
    }
  });
  
  console.log('✓ Queued initial product sync job');
  console.log('\n🎉 Essex Apothecary pilot setup complete!');
}

setupEssexPilot().catch(console.error);
