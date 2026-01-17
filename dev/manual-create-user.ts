
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const email = 'ecstaticedibles@bakedbot.ai';
  const name = "Melanie's Ecstatic Edibles";
  const orgName = "Melanie's Ecstatic Edibles";

  console.log(`Manually creating user: ${email}...`);

  // Initialize Firebase Admin locally
  const serviceAccountPath = path.resolve(__dirname, '../service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error(`Service account not found at ${serviceAccountPath}`);
    return;
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  const firestore = admin.firestore();
  const auth = admin.auth();

  try {
    let uid = '';

    // 1. Create or Get Auth User
    try {
      const userRecord = await auth.getUserByEmail(email);
      console.log(`Auth user already exists: ${userRecord.uid}`);
      uid = userRecord.uid;
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        console.log('Creating new Auth user...');
        const newUser = await auth.createUser({
          email,
          displayName: name,
          emailVerified: true,
          password: 'password123!' // Temporary password
        });
        uid = newUser.uid;
        console.log(`Created Auth user: ${uid}`);
      } else {
        throw e;
      }
    }

    // 2. Create User Document
    const userRef = firestore.collection('users').doc(uid);
    await userRef.set({
      email,
      displayName: name,
      photoURL: null,
      role: 'brand',
      orgType: 'brand',
      orgName,
      approvalStatus: 'pending',
      lifecycleStage: 'customer',
      plan: 'claim_pro',
      mrr: 99,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null
    }, { merge: true });
    console.log('User Firestore document created (Status: Pending).');

    // 3. Create CRM Brand Document
    const brandRef = firestore.collection('crm_brands').doc();
    await brandRef.set({
      id: brandRef.id,
      name: orgName,
      slug: 'melanies-ecstatic-edibles',
      email,
      claimStatus: 'claimed',
      claimedBy: uid,
      claimedAt: new Date(),
      isNational: false,
      states: [],
      source: 'claim',
      updatedAt: new Date(),
      discoveredAt: new Date()
    });
    console.log(`CRM Brand document created: ${brandRef.id}`);

    // 4. Link User to Brand
    await userRef.update({
      orgId: brandRef.id
    });
    console.log('Linked User to Brand.');

    console.log('\nSUCCESS! User created.');
    console.log(`Login: ${email}`);
    console.log('Password: password123!');
    console.log('Status: PENDING APPROVAL (Go to CEO Dashboard -> Users to approve)');

  } catch (error: any) {
    console.error('Error creating user:', error);
  }
}

main();
