import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY env var not set');
  process.exit(1);
}

const serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'studio-567050101-bc6e8'
});

const db = admin.firestore();

try {
  const query = await db.collection('invitations')
    .where('email', '==', 'm3@bakedbot.ai')
    .get();
  
  if (query.empty) {
    console.log('❌ No invitations found for m3@bakedbot.ai');
  } else {
    console.log(`✅ Found ${query.size} invitation(s):`);
    query.forEach(doc => {
      const data = doc.data();
      console.log('\n📧 Invitation Details:');
      console.log('  ID:', doc.id);
      console.log('  Status:', data.status);
      console.log('  Created:', data.createdAt?.toDate?.() || data.createdAt);
      console.log('  Expires:', data.expiresAt?.toDate?.() || data.expiresAt);
      console.log('  Invited By:', data.invitedBy);
      console.log('  Role:', data.role);
      console.log('  Org:', data.targetOrgId);
    });
  }
  process.exit(0);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
