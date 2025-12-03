/**
 * Script to create or update a production admin user with owner role
 * This version uses Application Default Credentials from gcloud
 *
 * Usage:
 *   npx tsx scripts/setup-admin-gcloud.ts <email> [displayName]
 *
 * Example:
 *   npx tsx scripts/setup-admin-gcloud.ts martez@bakedbot.ai "Martez - Platform Owner"
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin with Application Default Credentials
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'studio-567050101-bc6e8',
  });
}

const auth = admin.auth();
const firestore = admin.firestore();

async function setupAdminUser(email: string, displayName?: string) {
  try {
    console.log(`\n🔧 Setting up admin user: ${email}\n`);

    let user: admin.auth.UserRecord;

    // Try to find existing user by email
    try {
      user = await auth.getUserByEmail(email);
      console.log(`✅ Found existing user with UID: ${user.uid}`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create new user
        console.log('📝 Creating new user...');
        user = await auth.createUser({
          email,
          displayName: displayName || 'Platform Admin',
          emailVerified: true,
        });
        console.log(`✅ Created new user with UID: ${user.uid}`);
      } else {
        throw error;
      }
    }

    // Set custom claims
    console.log('\n🔐 Setting custom claims...');
    await auth.setCustomUserClaims(user.uid, {
      role: 'owner',
    });
    console.log('✅ Custom claims set: { role: "owner" }');

    // Create/update user profile in Firestore
    console.log('\n💾 Updating Firestore user profile...');
    await firestore.collection('users').doc(user.uid).set({
      email: user.email,
      displayName: user.displayName || displayName || 'Platform Admin',
      role: 'owner',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('✅ Firestore profile updated');

    // Verify custom claims
    console.log('\n🔍 Verifying custom claims...');
    const updatedUser = await auth.getUser(user.uid);
    console.log('Custom claims:', updatedUser.customClaims);

    console.log('\n✨ Success! Admin user setup complete.\n');
    console.log('📋 User Details:');
    console.log(`   UID: ${user.uid}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Display Name: ${user.displayName}`);
    console.log(`   Role: owner`);

    console.log('\n🔑 Next Steps:');
    console.log('1. If this is a new user, set a password in Firebase Console:');
    console.log(`   https://console.firebase.google.com/project/studio-567050101-bc6e8/authentication/users`);
    console.log('2. Log in at https://bakedbot.ai');
    console.log('3. Navigate to https://bakedbot.ai/dashboard/ceo');
    console.log('\n⚠️  Note: The user must log out and log back in for custom claims to take effect.\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error setting up admin user:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Parse command line arguments
const email = process.argv[2];
const displayName = process.argv[3];

if (!email) {
  console.error('❌ Error: Email address is required\n');
  console.log('Usage: npx tsx scripts/setup-admin-gcloud.ts <email> [displayName]\n');
  console.log('Example:');
  console.log('  npx tsx scripts/setup-admin-gcloud.ts martez@bakedbot.ai "Martez - Platform Owner"\n');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ Error: Invalid email format\n');
  process.exit(1);
}

// Run the setup
setupAdminUser(email, displayName);
