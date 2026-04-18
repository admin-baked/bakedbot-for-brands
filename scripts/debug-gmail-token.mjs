#!/usr/bin/env node
/**
 * Diagnose Gmail token state for CEO account.
 * Looks up martez@bakedbot.ai UID, checks token, validates scopes.
 */
import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const key = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(key)) });
const db = admin.firestore();

// Look up UID for martez@bakedbot.ai
const CEO_EMAIL = 'martez@bakedbot.ai';
let ceoUid;
try {
  const userRecord = await admin.auth().getUserByEmail(CEO_EMAIL);
  ceoUid = userRecord.uid;
  console.log(`✅ Firebase UID for ${CEO_EMAIL}: ${ceoUid}`);
} catch (e) {
  console.error(`❌ Could not find Firebase user for ${CEO_EMAIL}:`, e.message);
  process.exit(1);
}

// Find all Gmail tokens — search all users for any gmail integration
console.log('\n--- Searching all users for Gmail tokens ---');
const snap = await db.collectionGroup('integrations').get();
const gmailDocs = snap.docs.filter(d => d.id === 'gmail');
console.log(`Found ${gmailDocs.length} Gmail token doc(s):`);
for (const d of gmailDocs) {
  const uid = d.ref.path.split('/')[1];
  const data = d.data();
  const scopes = data.scopes || [];
  const connectedAt = data.connectedAt?.toDate?.()?.toISOString?.() ?? String(data.connectedAt);
  const hasRefresh = Boolean(data.refreshTokenEncrypted);
  const hasReadScope = scopes.some(s => s.includes('gmail.readonly') || s.includes('mail.google.com'));
  const isCeo = uid === ceoUid;
  console.log(`\n  UID: ${uid} ${isCeo ? '← CEO' : ''}`);
  console.log(`    connectedAt:    ${connectedAt}`);
  console.log(`    refresh token:  ${hasRefresh ? '✅ present' : '❌ MISSING'}`);
  console.log(`    gmail.readonly: ${hasReadScope ? '✅ yes' : '⚠️  NO'}`);
  console.log(`    scopes:         ${scopes.join(', ') || '(none)'}`);
}

// Specific check for CEO UID
const ceoDoc = await db.collection('users').doc(ceoUid).collection('integrations').doc('gmail').get();
if (!ceoDoc.exists) {
  console.log(`\n❌ NO token stored for CEO UID (${ceoUid})`);
  console.log('   Token may be stored under a different UID — see results above');
  console.log(`\n   Fix: Go to /dashboard/settings?tab=integrations while logged in as ${CEO_EMAIL} and click Connect Gmail`);
} else {
  const d = ceoDoc.data();
  const scopes = d.scopes || [];
  const hasRead = scopes.some(s => s.includes('gmail.readonly') || s.includes('mail.google.com'));
  console.log(`\n✅ Token found for CEO UID`);
  if (!hasRead) {
    console.log('⚠️  gmail.readonly scope MISSING — searches will fail with "Login Required"');
    console.log('   Fix: Disconnect and reconnect Gmail to re-request correct scopes');
  } else {
    console.log('✅ gmail.readonly scope present — should work');
  }
}

process.exit(0);
