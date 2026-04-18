#!/usr/bin/env node
/**
 * Standalone mood video pre-renderer — bypasses server-only Next.js modules.
 * Uses Remotion Lambda + Firebase Admin directly from .env.local credentials.
 *
 * Usage:
 *   node scripts/render-mood-videos-standalone.mjs --orgId org_thrive_syracuse
 *   node scripts/render-mood-videos-standalone.mjs --orgId org_thrive_syracuse --moods relaxed,energized
 *   node scripts/render-mood-videos-standalone.mjs --orgId org_thrive_syracuse --force
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Load .env.local manually ────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');
const envLines = readFileSync(envPath, 'utf8').split('\n');
for (const line of envLines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2];
}

// ─── Imports (after env is set) ───────────────────────────────────────────────
import admin from 'firebase-admin';
import { renderMediaOnLambda, getRenderProgress, presignUrl } from '@remotion/lambda/client';

// ─── Firebase Admin init ──────────────────────────────────────────────────────
const serviceAccountRaw = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8');
const serviceAccount = JSON.parse(serviceAccountRaw);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}
const db = admin.firestore();

// ─── Remotion config ──────────────────────────────────────────────────────────
const REMOTION_REGION = process.env.REMOTION_AWS_REGION || 'us-east-1';
const REMOTION_FUNCTION = process.env.REMOTION_AWS_FUNCTION_NAME;
const REMOTION_BUCKET = 'remotionlambda-useast1-5hg2s7ajg0';

// Set Remotion AWS credentials via env (it reads these)
process.env.REMOTION_AWS_ACCESS_KEY_ID = process.env.REMOTION_AWS_ACCESS_KEY_ID;
process.env.REMOTION_AWS_SECRET_ACCESS_KEY = process.env.REMOTION_AWS_SECRET_ACCESS_KEY;

if (!REMOTION_FUNCTION) {
    console.error('REMOTION_AWS_FUNCTION_NAME not set in .env.local');
    process.exit(1);
}

// ─── Mood definitions ─────────────────────────────────────────────────────────
const MOODS = {
    relaxed:   { headline: 'Slow It Down',          tagline: 'A mellow pair for a relaxed visit.' },
    energized: { headline: 'Day Starter',            tagline: 'A quick combo for energy and lift.' },
    sleep:     { headline: 'Lights Out',             tagline: 'A heavier evening pair for a slower landing.' },
    anxious:   { headline: 'Keep It Gentle',         tagline: 'A calmer pair for a softer entry point.' },
    social:    { headline: 'Pass The Good Vibes',    tagline: 'A lively pair built for a friendly hang.' },
    pain:      { headline: 'Ease Into It',           tagline: 'A supportive pair for a slower, steadier reset.' },
    new:       { headline: 'Start Smart',            tagline: 'A lighter pair for first-timers and low-pressure browsing.' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getOrgBrand(orgId) {
    const doc = await db.collection('tenants').doc(orgId).get();
    const data = doc.data();
    return {
        brandName: data?.brand?.name || 'BakedBot Club',
        logoUrl: data?.brand?.visualIdentity?.logo?.primary,
        primaryColor: data?.brand?.visualIdentity?.colors?.primary?.hex || '#18181b',
    };
}

async function pollRender(renderId, maxAttempts = 120) {
    for (let i = 0; i < maxAttempts; i++) {
        const status = await getRenderProgress({
            renderId,
            bucketName: REMOTION_BUCKET,
            region: REMOTION_REGION,
            functionName: REMOTION_FUNCTION,
        });
        const pct = Math.round(status.overallProgress * 100);
        process.stdout.write(`\r  Progress: ${pct}%  `);
        if (status.fatalErrorEncountered) {
            throw new Error(status.errors?.[0]?.message || 'Render failed');
        }
        if (status.done) {
            process.stdout.write('\n');
            return status.outputFile;
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error('Render timed out after 4 minutes');
}

async function toAccessibleUrl(rawUrl) {
    const s3Match = rawUrl.match(/s3\.[\w-]+\.amazonaws\.com\/([^/]+)\/(.+)/);
    if (!s3Match) return rawUrl;
    try {
        return await presignUrl({
            region: REMOTION_REGION,
            bucketName: s3Match[1],
            objectKey: s3Match[2],
            expiresInSeconds: 7 * 24 * 60 * 60,
        });
    } catch {
        return rawUrl;
    }
}

async function renderMood(orgId, moodId, brand, force) {
    const docRef = db.collection('tenants').doc(orgId).collection('mood_videos').doc(moodId);

    if (!force) {
        const existing = await docRef.get();
        if (existing.exists && existing.data()?.videoUrl) {
            console.log(`  ✓ ${moodId}: cached (skip)`);
            return { skipped: true };
        }
    }

    const mood = MOODS[moodId];
    console.log(`  → ${moodId}: rendering "${mood.headline}"...`);

    const { renderId } = await renderMediaOnLambda({
        region: REMOTION_REGION,
        functionName: REMOTION_FUNCTION,
        composition: 'BrandedSlideshow-16x9',
        serveUrl: 'bakedbot-creative',
        codec: 'h264',
        inputProps: {
            brandName: brand.brandName,
            headline: mood.headline.toUpperCase(),
            tagline: mood.tagline,
            primaryColor: brand.primaryColor,
            secondaryColor: '#27272a',
            accentColor: '#22c55e',
            logoUrl: brand.logoUrl,
            ctaText: 'Ask Your Budtender',
            clipUrls: [],
            sceneTitles: [],
            screenshotUrls: [],
            styleMode: 'stop-motion',
            kineticHeadline: 'INTRODUCING',
        },
        privacy: 'no-acl',
        concurrencyPerLambda: 1,
    });

    console.log(`  ⏳ ${moodId}: render started (${renderId})`);
    const outputFile = await pollRender(renderId);
    const videoUrl = await toAccessibleUrl(outputFile);

    await docRef.set({
        moodId,
        videoUrl,
        orgId,
        brandHash: brand.brandName + brand.primaryColor,
        renderedAt: new Date().toISOString(),
    });

    console.log(`  ✅ ${moodId}: ${videoUrl.substring(0, 80)}...`);
    return { skipped: false, videoUrl };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const orgIdIdx = args.indexOf('--orgId');
const orgId = orgIdIdx >= 0 ? args[orgIdIdx + 1] : undefined;
const force = args.includes('--force');
const moodsIdx = args.indexOf('--moods');
const moodFilter = moodsIdx >= 0 ? args[moodsIdx + 1].split(',') : Object.keys(MOODS);

if (!orgId) {
    console.error('Usage: node scripts/render-mood-videos-standalone.mjs --orgId <orgId> [--moods mood1,mood2] [--force]');
    process.exit(1);
}

console.log(`\nRendering mood videos for ${orgId}${force ? ' (force)' : ''}...`);
console.log(`Moods: ${moodFilter.join(', ')}\n`);

const brand = await getOrgBrand(orgId);
console.log(`Brand: ${brand.brandName} | Color: ${brand.primaryColor}\n`);

let rendered = 0, skipped = 0, errors = 0;
for (const moodId of moodFilter) {
    if (!MOODS[moodId]) { console.warn(`Unknown mood: ${moodId}`); continue; }
    try {
        const result = await renderMood(orgId, moodId, brand, force);
        if (result.skipped) skipped++; else rendered++;
    } catch (err) {
        errors++;
        console.error(`  ✗ ${moodId}: ${err.message}`);
    }
}

console.log(`\nDone. Rendered: ${rendered} | Skipped: ${skipped} | Errors: ${errors}`);
process.exit(errors > 0 ? 1 : 0);
