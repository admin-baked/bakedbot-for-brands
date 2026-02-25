/**
 * Seed Executive Profiles
 * Creates Firestore docs for Martez (CEO) and Jack (Head of Revenue).
 *
 * Usage: node scripts/seed-executive-profiles.mjs [--apply]
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
const envPath = resolve(__dirname, '../.env.local');
const envContents = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContents.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
        env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
}

const serviceAccountKey = JSON.parse(
    Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8'),
);

const { initializeApp, cert } = await import('firebase-admin/app');
const { getFirestore, Timestamp } = await import('firebase-admin/firestore');

const app = initializeApp({ credential: cert(serviceAccountKey) }, 'seed-exec-profiles');
const db = getFirestore(app);

const APPLY = process.argv.includes('--apply');

const PROFILES = [
    {
        profileSlug: 'martez',
        displayName: 'Martez',
        title: 'CEO & Founder',
        bio: 'Founder and CEO of BakedBot AI — building the agentic commerce OS for the cannabis industry.',
        emailAddress: 'martez@bakedbot.ai',
        avatarUrl: '',
        themeColor: '#16a34a',
        availability: {
            timezone: 'America/New_York',
            bufferMinutes: 15,
            windows: [
                { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // Mon
                { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }, // Tue
                { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' }, // Wed
                { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' }, // Thu
                { dayOfWeek: 5, startTime: '09:00', endTime: '15:00' }, // Fri
            ],
        },
        meetingTypes: [
            {
                id: '15min',
                name: 'Quick Connect',
                durationMinutes: 15,
                description: 'A fast intro or check-in.',
                color: '#d1fae5',
            },
            {
                id: '30min',
                name: 'Discovery Call',
                durationMinutes: 30,
                description: 'Learn how BakedBot can power your dispensary.',
                color: '#6ee7b7',
            },
            {
                id: '60min',
                name: 'Deep Dive',
                durationMinutes: 60,
                description: 'Strategic partnership or investor conversation.',
                color: '#16a34a',
            },
        ],
    },
    {
        profileSlug: 'jack',
        displayName: 'Greg "Jack" Allen',
        title: 'Head of Revenue',
        bio: 'Head of Revenue at BakedBot AI. Helping dispensaries grow with AI-powered marketing, loyalty, and intelligence.',
        emailAddress: 'jack@bakedbot.ai',
        avatarUrl: '',
        themeColor: '#2563eb',
        availability: {
            timezone: 'America/New_York',
            bufferMinutes: 15,
            windows: [
                { dayOfWeek: 1, startTime: '08:00', endTime: '18:00' }, // Mon
                { dayOfWeek: 2, startTime: '08:00', endTime: '18:00' }, // Tue
                { dayOfWeek: 3, startTime: '08:00', endTime: '18:00' }, // Wed
                { dayOfWeek: 4, startTime: '08:00', endTime: '18:00' }, // Thu
                { dayOfWeek: 5, startTime: '08:00', endTime: '16:00' }, // Fri
            ],
        },
        meetingTypes: [
            {
                id: '15min',
                name: 'Quick Connect',
                durationMinutes: 15,
                description: 'A fast intro or check-in.',
                color: '#dbeafe',
            },
            {
                id: '30min',
                name: 'Sales Discovery',
                durationMinutes: 30,
                description: 'Explore BakedBot for your dispensary.',
                color: '#93c5fd',
            },
            {
                id: '60min',
                name: 'Demo & Proposal',
                durationMinutes: 60,
                description: 'Full product demo + custom pricing.',
                color: '#2563eb',
            },
        ],
    },
];

console.log('\n🌱 Executive Profile Seeder');
console.log('============================');
console.log(`Mode: ${APPLY ? '✅ APPLY (writing to Firestore)' : '🔍 DRY RUN (add --apply to write)'}\n`);

for (const profile of PROFILES) {
    const ref = db.collection('executive_profiles').doc(profile.profileSlug);
    const existing = await ref.get();

    if (existing.exists) {
        console.log(`⏭  ${profile.profileSlug} — already exists, skipping`);
        continue;
    }

    const doc = {
        ...profile,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };

    console.log(`📋 ${profile.profileSlug} — ${profile.displayName} (${profile.title})`);
    console.log(`   Email: ${profile.emailAddress}`);
    console.log(`   Booking URL: https://bakedbot.ai/book/${profile.profileSlug}`);
    console.log(`   Availability: Mon-Fri ${profile.availability.windows[0].startTime}–${profile.availability.windows[0].endTime} ET`);
    console.log(`   Meeting types: ${profile.meetingTypes.map(m => `${m.name} (${m.durationMinutes}min)`).join(', ')}`);

    if (APPLY) {
        await ref.set(doc);
        console.log(`   ✅ Created!\n`);
    } else {
        console.log(`   📝 Would create (dry run)\n`);
    }
}

console.log('\n📋 Firestore indexes needed for meeting_bookings:');
console.log('   • (profileSlug, startAt, status) — for upcoming meetings');
console.log('   • (status, prepBriefGenerated, startAt) — for prep cron');
console.log('   • (status, followUpSentAt, endAt) — for followup cron');
console.log('   • (dailyRoomName) — for Daily.co webhook lookup');

console.log('\n🔧 Cloud Scheduler jobs to create:');
console.log('   gcloud scheduler jobs create http meeting-prep-cron \\');
console.log('     --schedule="*/15 * * * *" --uri="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/meeting-prep" \\');
console.log('     --message-body="{}" --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" --location=us-central1');
console.log('');
console.log('   gcloud scheduler jobs create http meeting-followup-cron \\');
console.log('     --schedule="*/15 * * * *" --uri="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/meeting-followup" \\');
console.log('     --message-body="{}" --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" --location=us-central1');

console.log('\n🎥 Daily.co Setup:');
console.log('   1. Sign up at daily.co');
console.log('   2. Add DAILY_API_KEY to GCP Secret Manager');
console.log('   3. Register webhook: https://bakedbot.ai/api/calendar/webhooks/daily');
console.log('      Events: meeting.ended, transcription.stopped');

if (!APPLY) {
    console.log('\n💡 Run with --apply to write to Firestore.');
}

process.exit(0);
