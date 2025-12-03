/**
 * Quick script to set owner role custom claims for a user
 * Run with: node scripts/set-owner-claims.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials
admin.initializeApp({
  projectId: 'studio-567050101-bc6e8',
});

const USER_UID = 'GrRRe2YR4zY0MT0PEfMPrPCsR5A3';
const EMAIL = 'martez@bakedbot.ai';

async function setOwnerClaims() {
  try {
    console.log('\n🔧 Setting owner role for user:', EMAIL);
    console.log('UID:', USER_UID);

    // Get user to verify it exists
    const user = await admin.auth().getUser(USER_UID);
    console.log('✅ Found user:', user.email);

    // Set custom claims
    await admin.auth().setCustomUserClaims(USER_UID, {
      role: 'owner',
    });
    console.log('✅ Custom claims set: { role: "owner" }');

    // Update Firestore profile
    await admin.firestore().collection('users').doc(USER_UID).set({
      email: user.email,
      displayName: user.displayName || 'Martez - Platform Owner',
      role: 'owner',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('✅ Firestore profile updated');

    // Verify
    const updatedUser = await admin.auth().getUser(USER_UID);
    console.log('\n🔍 Verification:');
    console.log('Custom claims:', updatedUser.customClaims);

    console.log('\n✨ Success! Owner role assigned.\n');
    console.log('🔑 Next Steps:');
    console.log('1. Go to https://bakedbot.ai');
    console.log('2. Log out if already logged in');
    console.log('3. Log back in with:', EMAIL);
    console.log('4. Navigate to https://bakedbot.ai/dashboard/ceo');
    console.log('\n⚠️  Important: You must log out and log back in for the role to take effect.\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

setOwnerClaims();
