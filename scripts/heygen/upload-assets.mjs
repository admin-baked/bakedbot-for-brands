#!/usr/bin/env node

/**
 * Upload HeyGen video assets (screenshots + generated videos) to Firebase Storage.
 * Returns public URLs suitable for:
 *   - HeyGen API background images
 *   - Embedding in onboarding coaching cards
 *
 * Usage:
 *   node scripts/heygen/upload-assets.mjs --screenshots   # Upload all screenshots
 *   node scripts/heygen/upload-assets.mjs --videos        # Upload downloaded videos
 *   node scripts/heygen/upload-assets.mjs --all           # Both
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const SCREENSHOTS_DIR = join(process.cwd(), 'scripts', 'heygen', 'screenshots');
const VIDEOS_DIR = join(process.cwd(), 'tmp', 'heygen-output');
const DOWNLOADS_DIR = 'C:/Users/admin/Downloads';
const BUCKET = 'bakedbot-global-assets';

// Video files we've generated (in Downloads)
const VIDEO_FILES = [
  '01-brand-guide-FINAL.mp4',
  '02-link-dispensary.mp4',
];

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

function initFirebase() {
  const saPath = join(process.cwd(), 'service-account.json');
  if (!existsSync(saPath)) {
    console.error('Error: service-account.json not found. Place it in the project root.');
    process.exit(1);
  }
  const sa = JSON.parse(readFileSync(saPath, 'utf-8'));
  initializeApp({ credential: cert(sa), storageBucket: BUCKET });
  return getStorage().bucket();
}

// ---------------------------------------------------------------------------
// Upload helpers
// ---------------------------------------------------------------------------

async function uploadFile(bucket, localPath, remotePath, contentType) {
  const file = bucket.file(remotePath);
  const data = readFileSync(localPath);

  await file.save(data, {
    metadata: { contentType, cacheControl: 'public, max-age=31536000' },
    public: true,
  });

  const url = `https://storage.googleapis.com/${BUCKET}/${remotePath}`;
  return url;
}

async function uploadScreenshots(bucket) {
  if (!existsSync(SCREENSHOTS_DIR)) {
    console.log('No screenshots directory found');
    return {};
  }

  const files = readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
  console.log(`\nUploading ${files.length} screenshots...`);
  const urls = {};

  for (const file of files) {
    const localPath = join(SCREENSHOTS_DIR, file);
    const remotePath = `onboarding/screenshots/${file}`;
    const url = await uploadFile(bucket, localPath, remotePath, 'image/png');
    const stepId = file.replace('.png', '');
    urls[stepId] = url;
    console.log(`  ✅ ${stepId} → ${url}`);
  }

  return urls;
}

async function uploadVideos(bucket) {
  console.log(`\nUploading ${VIDEO_FILES.length} videos...`);
  const urls = {};

  for (const file of VIDEO_FILES) {
    const localPath = join(DOWNLOADS_DIR, file);
    if (!existsSync(localPath)) {
      console.log(`  ⏭️  ${file} not found in Downloads, skipping`);
      continue;
    }

    // Clean filename: 01-brand-guide-FINAL.mp4 → 01-brand-guide.mp4
    const cleanName = file.replace('-FINAL', '').replace('-v2', '');
    const remotePath = `onboarding/videos/${cleanName}`;
    const url = await uploadFile(bucket, localPath, remotePath, 'video/mp4');
    const stepId = cleanName.replace(/^\d+-/, '').replace('.mp4', '');
    urls[stepId] = url;
    console.log(`  ✅ ${stepId} → ${url}`);
  }

  return urls;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const doScreenshots = args.includes('--screenshots') || args.includes('--all');
const doVideos = args.includes('--videos') || args.includes('--all');

if (!doScreenshots && !doVideos) {
  console.log('Usage: node scripts/heygen/upload-assets.mjs --screenshots | --videos | --all');
  process.exit(0);
}

const bucket = initFirebase();
const results = {};

if (doScreenshots) {
  results.screenshots = await uploadScreenshots(bucket);
}
if (doVideos) {
  results.videos = await uploadVideos(bucket);
}

console.log('\n--- Upload Complete ---');
console.log(JSON.stringify(results, null, 2));

// Output env vars for HeyGen background URLs
if (results.screenshots) {
  console.log('\n# Add to .env for HeyGen backgrounds:');
  for (const [stepId, url] of Object.entries(results.screenshots)) {
    console.log(`HEYGEN_BG_${stepId.replace(/-/g, '_')}=${url}`);
  }
}
