#!/usr/bin/env node

/**
 * Generate onboarding videos via HeyGen API.
 *
 * Reads script markdown files, extracts narration text, and submits
 * video generation requests to HeyGen. Polls for completion and
 * outputs video URLs.
 *
 * Prerequisites:
 *   - HEYGEN_API_KEY env var (or .env file)
 *   - Avatar ID and Voice ID configured below or via CLI flags
 *
 * Usage:
 *   node scripts/heygen/generate-videos.mjs --all
 *   node scripts/heygen/generate-videos.mjs --script 01-brand-guide.md
 *   node scripts/heygen/generate-videos.mjs --all --dry-run
 *   node scripts/heygen/generate-videos.mjs --status <video_id>
 *   node scripts/heygen/generate-videos.mjs --list
 *
 * Environment:
 *   HEYGEN_API_KEY     - Required. Your HeyGen API key.
 *   HEYGEN_AVATAR_ID   - Avatar to use (default: built-in presenter).
 *   HEYGEN_VOICE_ID    - Voice clone ID (default: HeyGen stock voice).
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SCRIPTS_DIR = join(process.cwd(), 'dev', 'onboarding-video-scripts');
const OUTPUT_DIR = join(process.cwd(), 'tmp', 'heygen-output');
const API_BASE = 'https://api.heygen.com';

// Defaults — override via env vars or CLI flags
const DEFAULT_AVATAR_ID = process.env.HEYGEN_AVATAR_ID || 'YOUR_AVATAR_ID';
const DEFAULT_VOICE_ID = process.env.HEYGEN_VOICE_ID || 'YOUR_VOICE_ID';
const POLL_INTERVAL_MS = 15_000; // 15 seconds between status checks
const MAX_POLL_ATTEMPTS = 120;   // 30 minutes max wait

// ---------------------------------------------------------------------------
// Narration extraction (imported logic from extract-narration.mjs)
// ---------------------------------------------------------------------------

function extractNarration(markdownContent) {
  const lines = markdownContent.split('\n');
  const narrationLines = [];
  let inBRoll = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // B-ROLL/PRODUCTION detection must run before header stripping
    if (/^##?\s*(B-ROLL|PRODUCTION)/i.test(trimmed)) { inBRoll = true; continue; }
    if (inBRoll) {
      if (/^##?\s*(HOOK|WALK|CLOSE|ACT|INTRO)/i.test(trimmed)) { inBRoll = false; }
      else continue;
    }
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('---')) continue;
    if (trimmed.startsWith('>')) continue;
    if (trimmed.startsWith('|')) continue;
    if (trimmed.startsWith('```')) continue;
    if (trimmed.startsWith('[ACTION]')) continue;
    if (/^(Duration|OPEN ON|AUDIENCE|USE CASE):/i.test(trimmed)) continue;
    if (/^\(\d+:\d+\s*-\s*\d+:\d+\)$/.test(trimmed)) continue;
    if (/^###?\s*(Step \d|Act \d)/i.test(trimmed)) continue;

    let clean = trimmed;
    clean = clean.replace(/^["\u201C]|["\u201D]$/g, '');
    clean = clean.replace(/\*\*([^*]+)\*\*/g, '$1');
    clean = clean.replace(/\*([^*]+)\*/g, '$1');
    clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    if (clean.length < 10) continue;
    if (/^(For |Quick |Pro tip)/i.test(clean) && clean.length < 30) continue;

    narrationLines.push(clean);
  }

  return narrationLines.join(' ').replace(/\s+/g, ' ').trim();
}

function extractTitle(markdownContent) {
  const match = markdownContent.match(/^#\s+(?:Video \d+:\s*)?(.+)/m);
  return match ? match[1].trim() : 'Untitled';
}

// ---------------------------------------------------------------------------
// HeyGen API helpers
// ---------------------------------------------------------------------------

function getApiKey() {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) {
    // Try loading from .env
    const envPath = join(process.cwd(), '.env');
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf-8');
      const match = envContent.match(/^HEYGEN_API_KEY=(.+)$/m);
      if (match) return match[1].trim();
    }
    console.error('Error: HEYGEN_API_KEY not set. Set it as an env var or in .env');
    process.exit(1);
  }
  return key;
}

async function heygenFetch(path, options = {}) {
  const apiKey = getApiKey();
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HeyGen API ${res.status}: ${body}`);
  }

  return res.json();
}

/**
 * Screenshot URL map — each step can have a background image.
 * Place screenshots in scripts/heygen/screenshots/ or use public URLs.
 * When a URL is provided, the avatar renders as a small circle overlay (Loom-style).
 */
const STEP_SCREENSHOTS_DIR = join(process.cwd(), 'scripts', 'heygen', 'screenshots');

function getScreenshotUrl(stepId) {
  // Check for local screenshot file first
  const localPath = join(STEP_SCREENSHOTS_DIR, `${stepId}.png`);
  if (existsSync(localPath)) {
    // HeyGen needs a public URL — local files need to be uploaded first
    // For now, return null and fall back to color background
    console.log(`  ℹ️  Local screenshot found at ${localPath} — upload to S3 for background`);
    return null;
  }

  // Check for public URL in env (e.g., HEYGEN_BG_brand_guide=https://...)
  const envKey = `HEYGEN_BG_${stepId.replace(/-/g, '_')}`;
  return process.env[envKey] || null;
}

/**
 * Submit a video generation request.
 * Supports two layouts:
 *   - "circle" (default): Small circular avatar in bottom-right, background image/color behind
 *   - "fullscreen": Full-screen avatar with color background
 * Returns { video_id: string }
 */
async function createVideo({ title, narration, avatarId, voiceId, stepId, layout = 'circle' }) {
  const screenshotUrl = stepId ? getScreenshotUrl(stepId) : null;
  const useCircle = layout === 'circle';

  const character = {
    type: 'avatar',
    avatar_id: avatarId,
    avatar_style: useCircle ? 'circle' : 'normal',
    ...(useCircle && {
      scale: 0.25,
      position: { x: 0.8, y: 0.8 },
    }),
  };

  const background = screenshotUrl
    ? { type: 'image', url: screenshotUrl }
    : { type: 'color', value: '#1a1a2e' };

  const body = {
    video_inputs: [
      {
        character,
        voice: {
          type: 'text',
          input_text: narration,
          voice_id: voiceId,
          speed: 1.0,
        },
        background,
      },
    ],
    dimension: { width: 1920, height: 1080 },
    test: false,
    title,
  };

  const result = await heygenFetch('/v2/video/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return result.data;
}

/**
 * Check video generation status.
 * Returns { status: 'pending'|'processing'|'completed'|'failed', video_url?: string }
 */
async function getVideoStatus(videoId) {
  const result = await heygenFetch(`/v1/video_status.get?video_id=${videoId}`);
  return result.data;
}

/**
 * List recent videos from the account.
 */
async function listVideos(limit = 20) {
  const result = await heygenFetch(`/v1/video.list?limit=${limit}`);
  return result.data;
}

/**
 * Poll until video is completed or failed.
 */
async function pollUntilDone(videoId, label = '') {
  const prefix = label ? `[${label}] ` : '';
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const status = await getVideoStatus(videoId);

    if (status.status === 'completed') {
      console.log(`${prefix}✅ Complete: ${status.video_url}`);
      return status;
    }

    if (status.status === 'failed') {
      const errMsg = typeof status.error === 'object' ? JSON.stringify(status.error) : (status.error || 'Unknown error');
      console.error(`${prefix}❌ Failed: ${errMsg}`);
      return status;
    }

    const elapsed = ((attempt + 1) * POLL_INTERVAL_MS / 1000).toFixed(0);
    process.stdout.write(`\r${prefix}⏳ ${status.status} (${elapsed}s)...`);
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.error(`${prefix}⏰ Timed out after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 60000} minutes`);
  return { status: 'timeout', video_id: videoId };
}

// ---------------------------------------------------------------------------
// Script file helpers
// ---------------------------------------------------------------------------

function getScriptFiles(includeBonus = false) {
  const files = readdirSync(SCRIPTS_DIR)
    .filter(f => /^\d{2}-.+\.md$/.test(f))
    .filter(f => !f.startsWith('00-'))
    .filter(f => includeBonus || !f.startsWith('11-'))
    .sort();
  return files;
}

function readScript(filename) {
  const content = readFileSync(join(SCRIPTS_DIR, filename), 'utf-8');
  return {
    file: filename,
    stepId: filename.replace(/^\d+-/, '').replace(/\.md$/, ''),
    title: extractTitle(content),
    narration: extractNarration(content),
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function flag(name) { return args.includes(`--${name}`); }
function flagValue(name) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

async function main() {
  const avatarId = flagValue('avatar') || DEFAULT_AVATAR_ID;
  const voiceId = flagValue('voice') || DEFAULT_VOICE_ID;
  const dryRun = flag('dry-run');

  // --status <video_id>: check a single video status
  if (flag('status')) {
    const videoId = flagValue('status');
    if (!videoId) { console.error('Usage: --status <video_id>'); process.exit(1); }
    const status = await getVideoStatus(videoId);
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  // --list: show recent videos
  if (flag('list')) {
    const videos = await listVideos();
    console.log(JSON.stringify(videos, null, 2));
    return;
  }

  // --all or --script <filename>: generate videos
  let scripts = [];

  if (flag('all')) {
    scripts = getScriptFiles(flag('include-bonus')).map(readScript);
  } else {
    const scriptFile = flagValue('script');
    if (!scriptFile) {
      console.log(`
Usage:
  node scripts/heygen/generate-videos.mjs --all [--dry-run] [--include-bonus]
  node scripts/heygen/generate-videos.mjs --script <filename> [--dry-run]
  node scripts/heygen/generate-videos.mjs --status <video_id>
  node scripts/heygen/generate-videos.mjs --list

Options:
  --avatar <id>    Override avatar ID
  --voice <id>     Override voice ID
  --dry-run        Show what would be generated without calling the API
  --no-poll        Submit jobs but don't wait for completion
  --include-bonus  Include the bonus full-journey video (11-*)
  --fullscreen     Use full-screen avatar (default: circle bubble bottom-right)
`);
      process.exit(0);
    }
    scripts = [readScript(scriptFile)];
  }

  const layout = flag('fullscreen') ? 'fullscreen' : 'circle';

  console.log(`\n📹 Generating ${scripts.length} onboarding video(s)\n`);
  console.log(`  Avatar: ${avatarId}`);
  console.log(`  Voice:  ${voiceId}`);
  console.log(`  Layout: ${layout} (${layout === 'circle' ? 'small bubble bottom-right' : 'full-screen avatar'})`);
  console.log(`  Mode:   ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  const results = [];

  for (const script of scripts) {
    const charCount = script.narration.length;
    const estMinutes = (charCount / 900).toFixed(1); // ~150 words/min, ~6 chars/word
    console.log(`\n--- ${script.file} ---`);
    console.log(`  Title: ${script.title}`);
    console.log(`  Chars: ${charCount} (~${estMinutes} min)`);

    if (dryRun) {
      console.log(`  Narration preview: "${script.narration.slice(0, 120)}..."`);
      results.push({ ...script, charCount, estMinutes, status: 'dry-run' });
      continue;
    }

    try {
      const videoTitle = `BakedBot Onboarding: ${script.title}`;
      const { video_id } = await createVideo({
        title: videoTitle,
        narration: script.narration,
        avatarId,
        voiceId,
        stepId: script.stepId,
        layout,
      });

      console.log(`  Submitted: video_id=${video_id}`);
      results.push({ ...script, charCount, estMinutes, video_id, status: 'submitted' });

      if (!flag('no-poll')) {
        const final = await pollUntilDone(video_id, script.file);
        results[results.length - 1].status = final.status;
        results[results.length - 1].video_url = final.video_url;
      }
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
      results.push({ ...script, charCount, estMinutes, status: 'error', error: err.message });
    }
  }

  // Write results manifest
  const manifestPath = join(OUTPUT_DIR, `manifest-${Date.now()}.json`);
  try {
    if (!existsSync(OUTPUT_DIR)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    writeFileSync(manifestPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Manifest saved: ${manifestPath}`);
  } catch {
    // tmp dir might not exist, just print results
    console.log('\n📄 Results:');
    console.log(JSON.stringify(results, null, 2));
  }

  // Summary
  console.log('\n--- Summary ---');
  const completed = results.filter(r => r.status === 'completed');
  const failed = results.filter(r => r.status === 'failed' || r.status === 'error');
  const pending = results.filter(r => r.status === 'submitted' || r.status === 'pending' || r.status === 'processing');

  if (completed.length) console.log(`  ✅ Completed: ${completed.length}`);
  if (pending.length) console.log(`  ⏳ Pending: ${pending.length}`);
  if (failed.length) console.log(`  ❌ Failed: ${failed.length}`);
  if (dryRun) console.log(`  📋 Dry run: ${results.length} scripts ready`);

  const totalChars = results.reduce((s, r) => s + r.charCount, 0);
  const totalMinutes = results.reduce((s, r) => s + parseFloat(r.estMinutes || 0), 0);
  console.log(`  📊 Total: ${totalChars} chars, ~${totalMinutes.toFixed(1)} min of video`);
  console.log(`  💰 Est. cost: ~${Math.ceil(totalMinutes)} credits (1 credit/min standard avatar)\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
