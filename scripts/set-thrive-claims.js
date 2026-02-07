/**
 * Set Custom Claims for Thrive Syracuse User
 *
 * Sets Firebase custom claims for thrivesyracuse@bakedbot.ai
 * Run once to enable dashboard access
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

async function setThriveClaims() {
  const email = 'thrivesyracuse@bakedbot.ai';

  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log('Found user:', user.uid);

    // Set custom claims for Thrive Syracuse (Empire tier pilot customer)
    const customClaims = {
      role: 'brand_admin',
      brandId: 'org_thrive_syracuse',
      orgId: 'org_thrive_syracuse',
      planId: 'empire',
      email: email,
    };

    await admin.auth().setCustomUserClaims(user.uid, customClaims);

    console.log('✅ Custom claims set successfully!');
    console.log('Claims:', customClaims);
    console.log('\n🔄 User must sign out and sign back in for claims to take effect.');

    // Verify
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('\n📋 Current custom claims:', updatedUser.customClaims);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setThriveClaims()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
