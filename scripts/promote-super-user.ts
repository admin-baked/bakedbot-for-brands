/**
 * Script to promote a user to Super User
 * Usage: npx ts-node scripts/promote-super-user.ts <email>
 * Example: npx ts-node scripts/promote-super-user.ts rishabh@bakedbot.ai
 */

import { getAdminAuth } from '@/firebase/admin';
import { getAdminFirestore } from '@/firebase/admin';

async function promoteToSuperUser(email: string) {
  try {
    console.log(`\n🔍 Looking up user: ${email}`);

    const auth = getAdminAuth();
    const firestore = getAdminFirestore();

    // Find user by email
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`✅ Found user: ${userRecord.uid}`);
    } catch (error: any) {
      console.error(`❌ User not found: ${email}`);
      console.error(`   Make sure the user has signed up first.`);
      process.exit(1);
    }

    // Set custom claims
    console.log(`\n🔐 Setting custom claims...`);
    await auth.setCustomUserClaims(userRecord.uid, { role: 'super_user' });
    console.log(`✅ Custom claims updated: { role: "super_user" }`);

    // Update Firestore
    console.log(`\n📝 Updating Firestore...`);
    await firestore.collection('users').doc(userRecord.uid).update({
      roles: ['super_user'],
      updatedAt: new Date(),
    });
    console.log(`✅ Firestore updated with role: super_user`);

    console.log(`\n🎉 Success! ${email} is now a Super User`);
    console.log(`   They may need to re-login to see the changes.`);
    console.log(`   Dashboard: https://bakedbot.ai/dashboard/ceo\n`);

    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ Error:`, error.message);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];
if (!email) {
  console.error('Usage: npx ts-node scripts/promote-super-user.ts <email>');
  console.error('Example: npx ts-node scripts/promote-super-user.ts rishabh@bakedbot.ai');
  process.exit(1);
}

promoteToSuperUser(email);
