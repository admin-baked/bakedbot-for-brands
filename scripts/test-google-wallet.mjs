/**
 * Super Power: Test Google Wallet credentials end-to-end
 * Usage: node --env-file=.env.local scripts/test-google-wallet.mjs
 */

import { GoogleAuth } from 'google-auth-library';

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID;
const SA_EMAIL = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
const SA_KEY_B64 = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY;

if (!ISSUER_ID || !SA_EMAIL || !SA_KEY_B64) {
  console.error('❌ Missing env vars. Ensure GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL, GOOGLE_WALLET_SERVICE_ACCOUNT_KEY are set.');
  process.exit(1);
}

console.log(`🔑 Issuer ID:  ${ISSUER_ID}`);
console.log(`👤 SA Email:   ${SA_EMAIL}`);

const key = JSON.parse(Buffer.from(SA_KEY_B64, 'base64').toString('utf-8'));

const auth = new GoogleAuth({
  credentials: key,
  scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
});

const client = await auth.getClient();
const tokenResponse = await client.getAccessToken();

if (!tokenResponse.token) {
  console.error('❌ Failed to get access token — service account not authorized in Pay & Wallet Console yet.');
  process.exit(1);
}

console.log('✅ Access token obtained');

// Try listing loyalty classes for this issuer
const classId = `${ISSUER_ID}.loyalty_org_thrive_syracuse`;
const res = await fetch(
  `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${encodeURIComponent(classId)}`,
  { headers: { Authorization: `Bearer ${tokenResponse.token}` } }
);

if (res.status === 401 || res.status === 403) {
  console.error(`❌ ${res.status} — service account not yet authorized in Pay & Wallet Console.`);
  console.error('   Go to: Google Wallet Console → Users → Service Accounts → Add');
  console.error(`   Add: ${SA_EMAIL}`);
  process.exit(1);
}

if (res.status === 404) {
  console.log(`⚠️  Loyalty class not found yet (${classId}) — will be auto-created on first pass request. Auth is working!`);
} else if (res.ok) {
  const data = await res.json();
  console.log(`✅ Loyalty class found: ${data.id} (status: ${data.reviewStatus})`);
} else {
  const text = await res.text();
  console.error(`❌ Unexpected response ${res.status}: ${text}`);
  process.exit(1);
}

console.log('\n🎉 Google Wallet integration is ready!');
