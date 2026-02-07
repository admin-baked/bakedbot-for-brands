/**
 * Verify and set custom claims for Thrive Syracuse user
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

async function verifyThriveUser() {
  const email = 'thrivesyracuse@bakedbot.ai';

  try {
    console.log(`\n🔍 Looking up user: ${email}`);

    // Get user by email
    const user = await admin.auth().getUserByEmail(email);

    console.log('\n✅ User found!');
    console.log('UID:', user.uid);
    console.log('Email:', user.email);
    console.log('Display Name:', user.displayName || '(not set)');

    // Get current custom claims
    console.log('\n📋 Current Custom Claims:');
    console.log(JSON.stringify(user.customClaims, null, 2));

    // Expected claims for Thrive Syracuse
    const expectedClaims = {
      role: 'dispensary',
      orgId: 'org_thrive_syracuse',
      planId: 'empire',
      brandId: 'org_thrive_syracuse',
    };

    console.log('\n📝 Expected Claims:');
    console.log(JSON.stringify(expectedClaims, null, 2));

    // Check if claims match
    const currentClaims = user.customClaims || {};
    const claimsMatch =
      currentClaims.role === expectedClaims.role &&
      currentClaims.orgId === expectedClaims.orgId &&
      currentClaims.planId === expectedClaims.planId;

    if (claimsMatch) {
      console.log('\n✅ Claims are correct!');
      return;
    }

    // Set claims
    console.log('\n🔧 Setting custom claims...');
    await admin.auth().setCustomUserClaims(user.uid, expectedClaims);

    console.log('✅ Claims updated successfully!');
    console.log('\n⚠️  User must sign out and sign back in for claims to take effect.');
    console.log('   Or wait for token refresh (up to 1 hour).');

    // Verify claims were set
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('\n✅ Verified Claims:');
    console.log(JSON.stringify(updatedUser.customClaims, null, 2));

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    if (error.code === 'auth/user-not-found') {
      console.log('\n💡 User not found. They may need to create an account first.');
    }
  }
}

// Run the verification
verifyThriveUser()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
