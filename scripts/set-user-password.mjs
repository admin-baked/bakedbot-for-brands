/**
 * Set a user's password directly via Firebase Admin SDK
 * Usage: node scripts/set-user-password.mjs <uid> <newPassword>
 * Example: node scripts/set-user-password.mjs KecWJXSFD6bLZPE8Rvh1lxTfeYW2 NewPassword123!
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function setUserPassword(uid, newPassword) {
  if (!admin.apps.length) {
    const serviceAccountPath = join(__dirname, '..', 'firebase-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'studio-567050101-bc6e8'
    });
  }

  const auth = admin.auth();

  const userRecord = await auth.getUser(uid);
  console.log(`Found user: ${userRecord.email} (${uid})`);

  await auth.updateUser(uid, { password: newPassword });
  console.log(`✅ Password updated successfully for ${userRecord.email}`);
  console.log(`   New password: ${newPassword}`);
}

const uid = process.argv[2];
const newPassword = process.argv[3];

if (!uid || !newPassword) {
  console.error('Usage: node scripts/set-user-password.mjs <uid> <newPassword>');
  process.exit(1);
}

setUserPassword(uid, newPassword).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
