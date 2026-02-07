/**
 * Set Custom Claims for Jerome (Boosted Maps SEO) - Thrive Syracuse
 *
 * Sets Firebase custom claims for jeromie@boostedmapsseo.com
 * Same permissions as thrivesyracuse@bakedbot.ai
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with service account
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

async function setJeromeClaims() {
  const email = 'jeromie@boostedmapsseo.com';

  try {
    console.log(`\n🔍 Looking up user: ${email}`);

    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log('✅ Found user:', user.uid);
    console.log('   Display Name:', user.displayName || '(not set)');

    // Set custom claims for Jerome - Thrive Syracuse (Empire tier pilot customer - dispensary)
    const customClaims = {
      role: 'dispensary_admin',
      locationId: 'org_thrive_syracuse',
      orgId: 'org_thrive_syracuse',
      planId: 'empire',
      email: email,
    };

    console.log('\n📝 Setting custom claims...');
    await admin.auth().setCustomUserClaims(user.uid, customClaims);

    console.log('✅ Custom claims set successfully!');
    console.log('Claims:', JSON.stringify(customClaims, null, 2));
    console.log('\n🔄 User must sign out and sign back in for claims to take effect.');

    // Verify
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('\n📋 Verified custom claims:');
    console.log(JSON.stringify(updatedUser.customClaims, null, 2));

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error('\n❌ User not found:', email);
      console.log('\n💡 This user needs to create an account first.');
      console.log('   They can sign up at: https://bakedbot.ai/brand-login');
    } else {
      console.error('\n❌ Error:', error.message);
    }
    process.exit(1);
  }
}

setJeromeClaims()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
