const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'studio-567050101-bc6e8'
});

const email = 'thrivesyracuse@bakedbot.ai';

admin.auth().getUserByEmail(email)
  .then(user => {
    console.log('\n📋 User ID:', user.uid);
    console.log('📋 Email:', user.email);
    console.log('📋 Custom Claims:', JSON.stringify(user.customClaims, null, 2));
    
    if (!user.customClaims || Object.keys(user.customClaims).length === 0) {
      console.log('\n❌ NO CUSTOM CLAIMS SET!');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
