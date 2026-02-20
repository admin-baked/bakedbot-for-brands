/**
 * Fix user account in Firestore and Firebase Auth
 * Usage: node scripts/fix-user-account.mjs <uid> <email> <role> [displayName]
 * Example: node scripts/fix-user-account.mjs XHmqB7RYF9PgAb8QongbQAtFrby1 marcus@andrewsdevelopments.com brand "Marcus Andrews"
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function fixUserAccount(uid, email, role, displayName = null) {
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

    // Verify user exists in Firebase Auth
    console.log(`\n🔍 Verifying user in Firebase Auth...`);
    let userRecord;
    try {
      userRecord = await auth.getUser(uid);
      console.log(`✅ Found Firebase Auth user: ${userRecord.email || 'No email'}`);
    } catch (error) {
      console.error(`\n❌ User not found in Firebase Auth by UID: ${uid}`);
      console.error(`   Error: ${error.message}`);
      process.exit(1);
    }

    // Determine the display name
    const finalDisplayName = displayName ||
                             email.split('@')[0] ||
                             userRecord.displayName ||
                             'User';

    console.log(`\n📝 Will set the following values:`);
    console.log(`   UID: ${uid}`);
    console.log(`   Email: ${email}`);
    console.log(`   Display Name: ${finalDisplayName}`);
    console.log(`   Role: ${role}`);
    console.log(`   Approval Status: approved`);
    console.log(`   Status: active`);

    // Update Firestore user document
    console.log(`\n📝 Updating Firestore user document...`);
    const now = admin.firestore.FieldValue.serverTimestamp();

    try {
      await firestore.collection('users').doc(uid).set({
        uid,
        email,
        displayName: finalDisplayName,
        role,
        approvalStatus: 'approved',
        status: 'active',
        updatedAt: now,
        fixedAt: now,
        fixedBy: 'admin-script'
      }, { merge: true });

      console.log(`✅ Firestore user document updated successfully`);
    } catch (error) {
      console.error(`❌ Failed to update Firestore document`);
      console.error(`   Error: ${error.message}`);
      throw error;
    }

    // Set custom claims in Firebase Auth
    console.log(`\n🔐 Setting custom claims in Firebase Auth...`);
    try {
      await auth.setCustomUserClaims(uid, { role });
      console.log(`✅ Custom claims updated: { role: "${role}" }`);
    } catch (error) {
      console.error(`⚠️  Warning: Failed to set custom claims`);
      console.error(`   Error: ${error.message}`);
    }

    console.log(`\n🎉 Success! User account fixed for ${email} (${uid})`);
    console.log(`\n📋 Next steps:`);
    console.log(`   1. User should log out completely`);
    console.log(`   2. User should log back in`);
    console.log(`   3. User should now appear correctly in Super User > Users & Access`);
    console.log(`   4. If user is a brand, verify they can access /dashboard`);
    console.log();

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    console.error(error);
    process.exit(1);
  }
}

// Get arguments from command line
const uid = process.argv[2];
const email = process.argv[3];
const role = process.argv[4];
const displayName = process.argv[5] || null;

if (!uid || !email || !role) {
  console.error('Usage: node scripts/fix-user-account.mjs <uid> <email> <role> [displayName]');
  console.error('');
  console.error('Arguments:');
  console.error('  uid          - Firebase Auth UID');
  console.error('  email        - User email address');
  console.error('  role         - User role (e.g., brand, dispensary_admin, super_user)');
  console.error('  displayName  - Optional display name (defaults to email prefix)');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/fix-user-account.mjs XHmqB7RYF9PgAb8QongbQAtFrby1 marcus@andrewsdevelopments.com brand "Marcus Andrews"');
  console.error('');
  console.error('Valid roles:');
  console.error('  - super_user');
  console.error('  - brand');
  console.error('  - brand_admin');
  console.error('  - dispensary_admin');
  console.error('  - scout');
  console.error('  - budtender');
  process.exit(1);
}

fixUserAccount(uid, email, role, displayName);
