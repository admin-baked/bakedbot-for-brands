/**
 * Migration: Add 60-min "Onboarding" meeting type to Jack's executive profile.
 *
 * Usage:
 *   node scripts/add-jack-onboarding-meeting-type.mjs           # dry run
 *   node scripts/add-jack-onboarding-meeting-type.mjs --apply   # write to Firestore
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');
const envContents = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContents.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
}

const serviceAccountKey = JSON.parse(
    Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8'),
);

const { initializeApp, cert } = await import('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = await import('firebase-admin/firestore');

const app = initializeApp({ credential: cert(serviceAccountKey) }, 'jack-onboarding-migration');
const db = getFirestore(app);

const APPLY = process.argv.includes('--apply');

const ONBOARDING_TYPE = {
    id: '60min-onboarding',
    name: 'Onboarding',
    durationMinutes: 60,
    description: 'Full onboarding walkthrough — get your dispensary set up on BakedBot.',
    color: '#1d4ed8',
};

console.log('\n🌱 Jack Onboarding Meeting Type Migration');
console.log('==========================================');
console.log(`Mode: ${APPLY ? '✅ APPLY (writing to Firestore)' : '🔍 DRY RUN (add --apply to write)'}\n`);

const ref = db.collection('executive_profiles').doc('jack');
const snap = await ref.get();

if (!snap.exists) {
    console.error('❌ Jack profile not found in Firestore. Run seed-executive-profiles.mjs first.');
    process.exit(1);
}

const profile = snap.data();
const existingTypes = profile.meetingTypes ?? [];
const alreadyExists = existingTypes.some(t => t.id === ONBOARDING_TYPE.id);

if (alreadyExists) {
    console.log('⏭  Onboarding meeting type already exists — nothing to do.');
    process.exit(0);
}

console.log('📋 Will add meeting type:');
console.log(`   ID:       ${ONBOARDING_TYPE.id}`);
console.log(`   Name:     ${ONBOARDING_TYPE.name}`);
console.log(`   Duration: ${ONBOARDING_TYPE.durationMinutes} min`);
console.log(`   Desc:     ${ONBOARDING_TYPE.description}`);
console.log('');
console.log('📋 Existing types:');
for (const t of existingTypes) {
    console.log(`   • ${t.name} (${t.durationMinutes}min) [${t.id}]`);
}
console.log(`   + ${ONBOARDING_TYPE.name} (${ONBOARDING_TYPE.durationMinutes}min) ← NEW`);

if (APPLY) {
    await ref.update({
        meetingTypes: [...existingTypes, ONBOARDING_TYPE],
        updatedAt: Timestamp.now(),
    });
    console.log('\n✅ Onboarding meeting type added to Jack\'s profile!');
    console.log('   Booking URL: https://bakedbot.ai/book/jack');
} else {
    console.log('\n💡 Run with --apply to write to Firestore.');
}

process.exit(0);
