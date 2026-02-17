/**
 * Script to promote a user to Super User
 * Usage: node scripts/promote-super-user.mjs <email>
 * Example: node scripts/promote-super-user.mjs rishabh@bakedbot.ai
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function promoteToSuperUser(email) {
  try {
    // Initialize Firebase Admin SDK
    console.log(`\n🔧 Initializing Firebase Admin SDK...`);

    // Check if Firebase is already initialized
    if (!admin.apps.length) {
      // Load service account key from environment or default location
      const serviceAccountPath = join(__dirname, '..', 'firebase-service-account.json');

      try {
        const serviceAccount = (await import(serviceAccountPath, { assert: { type: 'json' } })).default;
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: 'studio-567050101-bc6e8'
        });
        console.log(`✅ Firebase initialized with service account`);
      } catch (err) {
        // Try using default credentials (App Engine, Cloud Functions, etc.)
        admin.initializeApp({
          projectId: 'studio-567050101-bc6e8'
        });
        console.log(`✅ Firebase initialized with default credentials`);
      }
    }

    const auth = admin.auth();
    const firestore = admin.firestore();

    // Find user by email
    console.log(`\n🔍 Looking up user: ${email}`);
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`✅ Found user: ${userRecord.uid}`);
    } catch (error) {
      console.error(`\n❌ User not found: ${email}`);
      console.error(`   Make sure the user has signed up first at: https://bakedbot.ai/signin`);
      process.exit(1);
    }

    // Set custom claims
    console.log(`\n🔐 Setting custom claims...`);
    await auth.setCustomUserClaims(userRecord.uid, { role: 'super_user' });
    console.log(`✅ Custom claims updated: { role: "super_user" }`);

    // Update Firestore
    console.log(`\n📝 Updating Firestore user document...`);
    await firestore.collection('users').doc(userRecord.uid).update({
      roles: ['super_user'],
      updatedAt: new Date(),
    });
    console.log(`✅ Firestore updated with role: super_user`);

    console.log(`\n🎉 Success! ${email} is now a Super User`);
    console.log(`   Dashboard: https://bakedbot.ai/dashboard/ceo`);
    console.log(`   They may need to re-login to see the changes.\n`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    console.error(error);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/promote-super-user.mjs <email>');
  console.error('Example: node scripts/promote-super-user.mjs rishabh@bakedbot.ai');
  process.exit(1);
}

promoteToSuperUser(email);
