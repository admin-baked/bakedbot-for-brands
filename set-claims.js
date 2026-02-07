const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'studio-567050101-bc6e8'
});

const email = 'thrivesyracuse@bakedbot.ai';
const claims = {
  role: 'dispensary_admin',
  locationId: 'org_thrive_syracuse',
  orgId: 'org_thrive_syracuse',
  planId: 'empire'
};

admin.auth().getUserByEmail(email)
  .then(user => {
    console.log('Found user:', user.uid);
    return admin.auth().setCustomUserClaims(user.uid, claims);
  })
  .then(() => {
    console.log('✅ Custom claims set successfully!');
    console.log('Claims:', claims);
    console.log('\n🔄 User must sign out and sign back in for claims to take effect.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
