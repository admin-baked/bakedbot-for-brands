// Quick diagnostic: check what's in Firestore for CEO Gmail token
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const saPath = path.join(__dirname, '..', 'service-account.json');
const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'));

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

const CEO_UID = 'GrRRe2YR4zY0MT0PEfMPrPCsR5A3';

async function main() {
  console.log(`Checking Gmail token for UID: ${CEO_UID}`);

  const doc = await db
    .collection('users')
    .doc(CEO_UID)
    .collection('integrations')
    .doc('gmail')
    .get();

  if (!doc.exists) {
    console.log('❌ No Gmail token document found in Firestore.');
    console.log('   Path: users/' + CEO_UID + '/integrations/gmail');
    process.exit(0);
  }

  const data = doc.data();
  console.log('\n✅ Gmail token document found:');
  console.log('  status:', data.status);
  console.log('  connectedAt:', data.connectedAt?.toDate?.() ?? data.connectedAt);
  console.log('  updatedAt:', data.updatedAt?.toDate?.() ?? data.updatedAt);
  console.log('  expiresAt:', data.expiresAt ?? '(none)');
  console.log('  expiryDate:', data.expiryDate ? new Date(data.expiryDate).toISOString() : '(none)');
  console.log('  scopes:', data.scopes);
  console.log('  hasRefreshToken:', Boolean(data.refreshTokenEncrypted));
  console.log('  hasAccessToken:', Boolean(data.accessTokenEncrypted));
  console.log('  refreshToken length:', data.refreshTokenEncrypted?.length ?? 0);

  // Try decrypt if TOKEN_ENCRYPTION_KEY is available
  const encKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (encKey && data.refreshTokenEncrypted) {
    try {
      const { createDecipheriv, createHash } = await import('node:crypto');
      const rawBuffer = Buffer.from(encKey.trim(), 'utf8');
      const key = rawBuffer.length === 32
        ? rawBuffer
        : createHash('sha256').update(encKey.trim(), 'utf8').digest();

      const textParts = data.refreshTokenEncrypted.split(':');
      const ivHex = textParts.shift();
      const iv = Buffer.from(ivHex, 'hex');
      const encryptedText = Buffer.from(textParts.join(':'), 'hex');

      const decipher = createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      const refreshToken = decrypted.toString();

      console.log('\n🔑 Decrypt succeeded!');
      console.log('  Refresh token starts with:', refreshToken.substring(0, 20) + '...');
      console.log('  Refresh token length:', refreshToken.length);
    } catch (e) {
      console.log('\n❌ Decrypt FAILED:', e.message);
      console.log('   This is likely why Gmail keeps failing — wrong TOKEN_ENCRYPTION_KEY or corrupted token.');
    }
  } else if (!encKey) {
    console.log('\n⚠️  TOKEN_ENCRYPTION_KEY not set in env — cannot test decrypt');
    console.log('   Run: TOKEN_ENCRYPTION_KEY=<your-key> node scripts/check-gmail-token.mjs');
  }

  process.exit(0);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
