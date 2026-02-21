#!/usr/bin/env node

/**
 * Configure Loyalty Settings for Organizations
 * Creates loyalty settings documents in Firestore
 *
 * Usage:
 *   node scripts/configure-loyalty-settings.mjs --org=org_thrive_syracuse
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Parse command line args
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value;
  return acc;
}, {});

const ORG_ID = args.org || 'org_thrive_syracuse';

// Default loyalty settings
const defaultLoyaltySettings = {
  enabled: true,
  programName: 'Rewards Program',
  pointsPerDollar: 1,
  dollarPerPoint: 0.01,
  minPointsToRedeem: 100,
  maxPointsPerOrder: 5000,
  tiers: [
    {
      name: 'Bronze',
      requiredSpend: 0,
      multiplier: 1,
      benefits: ['Earn 1 point per dollar']
    },
    {
      name: 'Silver',
      requiredSpend: 500,
      multiplier: 1.2,
      benefits: ['Earn 1.2 points per dollar', 'Birthday bonus']
    },
    {
      name: 'Gold',
      requiredSpend: 1000,
      multiplier: 1.5,
      benefits: ['Earn 1.5 points per dollar', 'Birthday bonus', 'Exclusive deals']
    },
    {
      name: 'Platinum',
      requiredSpend: 2500,
      multiplier: 2,
      benefits: ['Earn 2 points per dollar', 'Birthday bonus', 'Exclusive deals', 'VIP events']
    }
  ],
  tierInactivityDays: 180,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

async function configureLoyaltySettings() {
  console.log('🎁 Configuring Loyalty Settings');
  console.log('════════════════════════════════');
  console.log(`Organization: ${ORG_ID}`);
  console.log('');

  try {
    // Check if settings already exist
    const settingsRef = db.doc(`tenants/${ORG_ID}/settings/loyalty`);
    const existingSettings = await settingsRef.get();

    if (existingSettings.exists) {
      console.log('⚠️  Loyalty settings already exist for this org');
      console.log('');
      console.log('Current settings:');
      console.log(JSON.stringify(existingSettings.data(), null, 2));
      console.log('');

      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        rl.question('Overwrite existing settings? (yes/no): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Cancelled - keeping existing settings');
        process.exit(0);
      }
    }

    // Write loyalty settings
    await settingsRef.set(defaultLoyaltySettings);

    console.log('✅ Loyalty settings configured successfully!');
    console.log('');
    console.log('Settings:');
    console.log(JSON.stringify(defaultLoyaltySettings, null, 2));
    console.log('');
    console.log('💡 Customers will now earn points on purchases:');
    console.log('   - Bronze (default): 1 point per $1');
    console.log('   - Silver ($500+): 1.2 points per $1');
    console.log('   - Gold ($1000+): 1.5 points per $1');
    console.log('   - Platinum ($2500+): 2 points per $1');
    console.log('');
    console.log('💰 Redemption rate: 100 points = $1.00');
    console.log('');

  } catch (error) {
    console.error('❌ Error configuring loyalty settings:', error.message);
    process.exit(1);
  }
}

configureLoyaltySettings();
