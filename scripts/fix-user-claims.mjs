#!/usr/bin/env node

/**
 * Fix Firebase Auth custom claims for an invited user who gets stuck on onboarding.
 *
 * Root cause: setCustomUserClaims may fail silently during acceptInvitationAction,
 * leaving the user with no role claim in their Firebase token → redirected to /onboarding.
 *
 * Usage:
 *   node scripts/fix-user-claims.mjs --email pospossemi@gmail.com --role dispensary_admin --orgId org_thrive_syracuse
 *
 * Options:
 *   --email   Firebase Auth email address (required)
 *   --role    Role to assign (required): dispensary_admin | brand_admin | dispensary_staff | etc.
 *   --orgId   Organization ID (required for org roles)
 *   --dry-run Just print what would happen, don't write
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env.local');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : null;
}

const email = getArg('email');
const role = getArg('role');
const orgId = getArg('orgId');
const dryRun = args.includes('--dry-run');

if (!email || !role) {
  console.error('Usage: node scripts/fix-user-claims.mjs --email <email> --role <role> --orgId <orgId> [--dry-run]');
  process.exit(1);
}

// Init Firebase Admin
function initFirebase() {
  if (getApps().length > 0) return;

  const keyB64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (keyB64) {
    const serviceAccount = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf8'));
    initializeApp({ credential: cert(serviceAccount) });
    return;
  }

  const keyPath = path.join(__dirname, '../service-account.json');
  if (fs.existsSync(keyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    initializeApp({ credential: cert(serviceAccount) });
    return;
  }

  throw new Error('No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_KEY in .env.local or place service-account.json in project root.');
}

const DISPENSARY_ROLES = ['dispensary_admin', 'dispensary_staff', 'dispensary', 'budtender'];
const BRAND_ROLES = ['brand_admin', 'brand_member', 'brand'];

function buildClaims(role, orgId) {
  const claims = { role, orgId, currentOrgId: orgId };

  if (DISPENSARY_ROLES.includes(role)) {
    claims.dispensaryId = orgId;
    claims.locationId = orgId;
  } else if (BRAND_ROLES.includes(role)) {
    claims.brandId = orgId;
  }

  return claims;
}

async function run() {
  initFirebase();

  const auth = getAuth();
  const firestore = getFirestore();

  console.log(`\n🔍 Looking up user: ${email}`);

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch (err) {
    console.error(`❌ User not found in Firebase Auth: ${email}`);
    console.error(err.message);
    process.exit(1);
  }

  const uid = userRecord.uid;
  console.log(`✅ Found user: uid=${uid}`);
  console.log(`   Current claims: ${JSON.stringify(userRecord.customClaims || {})}`);

  const claims = buildClaims(role, orgId);
  console.log(`\n📋 Claims to set:`);
  console.log(JSON.stringify(claims, null, 2));

  if (dryRun) {
    console.log('\n🔵 DRY RUN — no changes written.');
    return;
  }

  // 1. Set Firebase Auth custom claims
  await auth.setCustomUserClaims(uid, claims);
  console.log(`\n✅ Custom claims set in Firebase Auth`);

  // 2. Revoke existing tokens so next login gets fresh token with new claims
  await auth.revokeRefreshTokens(uid);
  console.log(`✅ Refresh tokens revoked — user must log in again`);

  // 3. Update Firestore users document to match
  const userRef = firestore.collection('users').doc(uid);
  const userDoc = await userRef.get();

  const firestoreUpdates = {
    role,
    orgId,
    currentOrgId: orgId,
    updatedAt: new Date(),
  };

  if (DISPENSARY_ROLES.includes(role)) {
    firestoreUpdates.dispensaryId = orgId;
    firestoreUpdates.locationId = orgId;
  } else if (BRAND_ROLES.includes(role)) {
    firestoreUpdates.brandId = orgId;
  }

  if (userDoc.exists) {
    await userRef.update(firestoreUpdates);
    console.log(`✅ Firestore users/${uid} updated`);
  } else {
    await userRef.set({
      uid,
      email,
      ...firestoreUpdates,
      createdAt: new Date(),
    }, { merge: true });
    console.log(`✅ Firestore users/${uid} created`);
  }

  console.log(`\n🎉 Done! ${email} now has role="${role}" for org "${orgId}".`);
  console.log(`   Tell the user to log out and log back in to pick up the new role.`);
}

run().catch(err => {
  console.error('\n❌ Script failed:', err.message);
  process.exit(1);
});
