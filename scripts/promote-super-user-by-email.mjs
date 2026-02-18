/**
 * Promote user to Super User by email (Firestore lookup variant)
 * Avoids Firebase Auth email lookup which may have permission issues
 *
 * Usage: node scripts/promote-super-user-by-email.mjs <email>
 * Example: node scripts/promote-super-user-by-email.mjs rishabh@bakedbot.ai
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function promoteToSuperUser(email) {
  try {
    // Initialize Firebase Admin SDK
    console.log(`\n🔧 Initializing Firebase Admin SDK...`);

    // Check if Firebase is already initialized
    if (!admin.apps.length) {
      // Try to load service account from file
      const serviceAccountPath = join(__dirname, '..', 'firebase-service-account.json');
      let serviceAccount;

      try {
        const fileContent = fs.readFileSync(serviceAccountPath, 'utf-8');
        serviceAccount = JSON.parse(fileContent);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: 'studio-567050101-bc6e8'
        });
        console.log(`✅ Firebase initialized with service account from file`);
      } catch (err) {
        // If file loading fails, throw error instead of falling back to problematic default credentials
        console.error(`❌ Could not load service account file: ${serviceAccountPath}`);
        console.error(`   Error: ${err.message}`);
        console.error(`\nPlease ensure firebase-service-account.json exists in the project root.`);
        console.error(`To create one:`);
        console.error(`   1. Go to Google Cloud Console: https://console.cloud.google.com/project/studio-567050101-bc6e8`);
        console.error(`   2. IAM & Admin > Service Accounts`);
        console.error(`   3. Create key (JSON) and save as firebase-service-account.json in project root`);
        process.exit(1);
      }
    }

    const auth = admin.auth();
    const firestore = admin.firestore();

    // Method 1: Query Firestore users collection by email (more reliable)
    console.log(`\n🔍 Looking up user in Firestore: ${email}`);
    const usersQuery = await firestore.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersQuery.empty) {
      console.error(`\n❌ User not found in Firestore: ${email}`);
      console.error(`   Make sure the user has signed up at: https://bakedbot.ai/signin`);
      process.exit(1);
    }

    const userDoc = usersQuery.docs[0];
    const uid = userDoc.id;
    const userData = userDoc.data();

    console.log(`✅ Found user: ${uid}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Current role: ${userData.role || userData.roles?.[0] || 'none'}`);

    // Method 2: Set custom claims in Firebase Auth
    console.log(`\n🔐 Setting custom claims in Firebase Auth...`);
    try {
      await auth.setCustomUserClaims(uid, { role: 'super_user' });
      console.log(`✅ Custom claims updated: { role: "super_user" }`);
    } catch (authError) {
      console.warn(`⚠️  Warning: Could not set custom claims in Auth: ${authError.message}`);
      console.warn(`   This may happen if user hasn't completed signup. Continuing with Firestore update...`);
    }

    // Method 3: Update Firestore user document
    console.log(`\n📝 Updating Firestore user document...`);
    await firestore.collection('users').doc(uid).update({
      roles: ['super_user'],
      role: 'super_user',  // Also set singular role field for compatibility
      updatedAt: new Date(),
      promotedAt: new Date(),
      promotedBy: 'admin-script'
    });
    console.log(`✅ Firestore updated with role: super_user`);

    console.log(`\n🎉 Success! ${email} (${uid}) is now a Super User`);
    console.log(`   Dashboard: https://bakedbot.ai/dashboard/ceo`);
    console.log(`   They may need to re-login to see changes.\n`);

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
  console.error('Usage: node scripts/promote-super-user-by-email.mjs <email>');
  console.error('Example: node scripts/promote-super-user-by-email.mjs rishabh@bakedbot.ai');
  process.exit(1);
}

promoteToSuperUser(email);
