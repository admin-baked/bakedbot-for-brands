/**
 * Promote user to Super User by UID (direct method)
 * Usage: node scripts/promote-super-user-by-uid.mjs <uid>
 * Example: node scripts/promote-super-user-by-uid.mjs hEnDEzVXDxZdvRo63UZWVbbmItE3
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function promoteToSuperUser(uid) {
  try {
    // Initialize Firebase Admin SDK
    console.log(`\n🔧 Initializing Firebase Admin SDK...`);

    if (!admin.apps.length) {
      const serviceAccountPath = join(__dirname, '..', 'firebase-service-account.json');
      try {
        const fileContent = fs.readFileSync(serviceAccountPath, 'utf-8');
        const serviceAccount = JSON.parse(fileContent);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: 'studio-567050101-bc6e8'
        });
        console.log(`✅ Firebase initialized with service account`);
      } catch (err) {
        console.error(`❌ Could not load service account file: ${serviceAccountPath}`);
        console.error(`   Error: ${err.message}`);
        process.exit(1);
      }
    }

    const auth = admin.auth();
    const firestore = admin.firestore();

    // Get user by UID
    console.log(`\n🔍 Looking up user by UID: ${uid}`);
    let userRecord;
    try {
      userRecord = await auth.getUser(uid);
      console.log(`✅ Found user: ${userRecord.email}`);
    } catch (error) {
      console.error(`\n❌ User not found by UID: ${uid}`);
      console.error(`   Error: ${error.message}`);
      process.exit(1);
    }

    // Set custom claims in Firebase Auth
    console.log(`\n🔐 Setting custom claims in Firebase Auth...`);
    try {
      await auth.setCustomUserClaims(uid, { role: 'super_user' });
      console.log(`✅ Custom claims updated: { role: "super_user" }`);
    } catch (error) {
      console.error(`⚠️  Warning: ${error.message}`);
    }

    // Update Firestore user document
    console.log(`\n📝 Updating Firestore user document...`);
    try {
      await firestore.collection('users').doc(uid).update({
        roles: ['super_user'],
        role: 'super_user',
        updatedAt: new Date(),
        promotedAt: new Date(),
        promotedBy: 'admin-script'
      });
      console.log(`✅ Firestore updated with role: super_user`);
    } catch (error) {
      // Check for NOT_FOUND error (code 5 in gRPC)
      if (error.code === 'NOT_FOUND' || error.code === 5) {
        console.log(`⚠️  User document not found in Firestore, creating one...`);
        await firestore.collection('users').doc(uid).set({
          uid,
          email: userRecord.email,
          roles: ['super_user'],
          role: 'super_user',
          createdAt: new Date(),
          updatedAt: new Date(),
          promotedAt: new Date(),
          promotedBy: 'admin-script'
        });
        console.log(`✅ Created user document in Firestore`);
      } else {
        throw error;
      }
    }

    console.log(`\n🎉 Success! ${userRecord.email} (${uid}) is now a Super User`);
    console.log(`   Dashboard: https://bakedbot.ai/dashboard/ceo`);
    console.log(`   They should re-login to see changes.\n`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    console.error(error);
    process.exit(1);
  }
}

// Get UID from command line arguments
const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node scripts/promote-super-user-by-uid.mjs <uid>');
  console.error('Example: node scripts/promote-super-user-by-uid.mjs hEnDEzVXDxZdvRo63UZWVbbmItE3');
  process.exit(1);
}

promoteToSuperUser(uid);
