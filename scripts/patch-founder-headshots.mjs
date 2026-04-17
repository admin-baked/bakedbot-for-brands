/**
 * Patch Founder Headshots
 * Sets avatarUrl on executive_profiles and headshot on blog_authors
 * for Martez and Jack using the images in /public/images/.
 *
 * Usage: node scripts/patch-founder-headshots.mjs [--apply]
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
const { getFirestore, Timestamp } = await import('firebase-admin/firestore');

const app = initializeApp({ credential: cert(serviceAccountKey) }, 'patch-headshots');
const db = getFirestore(app);

const APPLY = process.argv.includes('--apply');
const BASE_URL = 'https://bakedbot.ai/images';

const FOUNDERS = [
    { slug: 'martez', name: 'Martez', image: 'martez.png' },
    { slug: 'jack',   name: 'Jack',   image: 'jack.png' },
];

console.log('\n📸 Founder Headshot Patcher');
console.log('============================');
console.log(`Mode: ${APPLY ? '✅ APPLY' : '🔍 DRY RUN (add --apply to write)'}\n`);

for (const founder of FOUNDERS) {
    const url = `${BASE_URL}/${founder.image}`;

    // 1. executive_profiles
    const execRef = db.collection('executive_profiles').doc(founder.slug);
    const execDoc = await execRef.get();
    console.log(`👤 ${founder.name} — executive_profiles/${founder.slug}`);
    console.log(`   avatarUrl: ${url}`);
    if (execDoc.exists) {
        if (APPLY) {
            await execRef.update({ avatarUrl: url, updatedAt: Timestamp.now() });
            console.log('   ✅ Updated');
        } else {
            console.log('   📝 Would update');
        }
    } else {
        console.log('   ⚠️  Doc not found — run seed-executive-profiles.mjs --apply first');
    }

    // 2. blog_authors
    const blogRef = db.collection('blog_authors').doc(founder.slug);
    const blogDoc = await blogRef.get();
    console.log(`\n✍️  ${founder.name} — blog_authors/${founder.slug}`);
    console.log(`   headshot: ${url}`);
    if (blogDoc.exists) {
        if (APPLY) {
            await blogRef.update({ headshot: url, updatedAt: Timestamp.now() });
            console.log('   ✅ Updated');
        } else {
            console.log('   📝 Would update');
        }
    } else {
        if (APPLY) {
            await blogRef.set({
                slug: founder.slug,
                name: founder.name,
                title: founder.slug === 'martez' ? 'CEO & Co-Founder' : 'Head of Revenue & Co-Founder',
                bio: '',
                headshot: url,
                socialLinks: {},
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            console.log('   ✅ Created');
        } else {
            console.log('   📝 Would create (doc does not exist yet)');
        }
    }
    console.log('');
}

if (!APPLY) console.log('💡 Run with --apply to write to Firestore.');
process.exit(0);
