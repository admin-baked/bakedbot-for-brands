/**
 * Set Custom Claims for Thrive Syracuse User
 *
 * Sets Firebase custom claims for thrivesyracuse@bakedbot.ai
 * Run once to enable dashboard access on Optimize.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with service account (same pattern as src/firebase/admin.ts)
if (!admin.apps.length) {
  const serviceAccountPath = path.resolve(__dirname, '../service-account.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    console.log('✅ Using service account credentials from service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    console.error('❌ service-account.json not found at:', serviceAccountPath);
    console.error('Please ensure service-account.json exists in the project root.');
    process.exit(1);
  }
}

async function setThriveClaims() {
  const email = 'thrivesyracuse@bakedbot.ai';

  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log('Found user:', user.uid);

    // Set custom claims for Thrive Syracuse (Optimize pilot customer - dispensary)
    const customClaims = {
      role: 'dispensary_admin',
      orgId: 'org_thrive_syracuse',
      currentOrgId: 'org_thrive_syracuse',
      brandId: 'org_thrive_syracuse',
      planId: 'optimize',
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
