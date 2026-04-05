/**
 * Generate a 60-second sample marketing video for Thrive Syracuse
 *
 * Pipeline: Claude Haiku → 6 scene plans → Fal.ai Kling (parallel) → clip URLs
 *
 * Usage (requires API keys in env):
 *   node --env-file=.env.local scripts/generate-thrive-sample-video.mjs
 *
 * Or against production via curl (see bottom of this file for curl command).
 *
 * The full Remotion-wrapped version (with branded intro/outro) is available
 * via the Creative Center dashboard: /dashboard/creative → 🎥 Long tab.
 */

import Anthropic from '@anthropic-ai/sdk';

// ─── Config ────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const FAL_API_KEY = process.env.FAL_API_KEY;
const HAIKU_MODEL = process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL ?? 'claude-haiku-4-5-20251001';
const FAL_QUEUE_BASE = 'https://queue.fal.run';
const KLING_MODEL = 'fal-ai/kling-video/v2/master/text-to-video';

const SCENE_COUNT = 6;      // 6 scenes × 10s = 60s
const ASPECT_RATIO = '16:9';
const CLIP_DURATION = '10';

// Thrive Syracuse brand context
const BRAND = 'Thrive Syracuse — a premium cannabis dispensary in Syracuse, NY';

const USER_PROMPT =
  'Thrive Syracuse dispensary brand story — premium flower, welcoming staff, ' +
  'cozy interior, loyal customers, Syracuse community pride, Friday energy vibe';

// ─── Validate ──────────────────────────────────────────────────────────────

if (!ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set. Pull secrets or set manually.');
    console.error('   gcloud secrets versions access latest --secret=ANTHROPIC_API_KEY --project=studio-567050101-bc6e8');
    process.exit(1);
}
if (!FAL_API_KEY) {
    console.error('❌ FAL_API_KEY not set.');
    console.error('   gcloud secrets versions access latest --secret=FAL_API_KEY --project=studio-567050101-bc6e8');
    process.exit(1);
}

// ─── Step 1: Claude Haiku → Scene Plan ─────────────────────────────────────

const SCENE_SYSTEM_PROMPT = `You are a cannabis marketing video director. Break the user's concept into distinct cinematic scenes for a short-form video campaign.

Rules:
- Each scene must be visually distinct (different angle, subject, or mood)
- No medical claims, no minors, no prohibited content
- Prompts are for AI video generation — be vivid and visual, no text overlays
- Return ONLY a JSON array. No markdown, no explanation.

Format: [{"title":"2-4 word label","prompt":"detailed cinematic prompt for AI video, no text, no words"}]`;

console.log(`\n🎬 Thrive Syracuse — 60s Sample Video Generator`);
console.log(`   Prompt: "${USER_PROMPT}"`);
console.log(`   Scenes: ${SCENE_COUNT} × 10s = 60s`);
console.log(`   Aspect: ${ASPECT_RATIO}\n`);

console.log('🧠 Step 1: Planning scenes via Claude Haiku...');

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const sceneResponse = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 1500,
    system: SCENE_SYSTEM_PROMPT,
    messages: [{
        role: 'user',
        content: `Create ${SCENE_COUNT} scenes for: "${USER_PROMPT}". Brand context: ${BRAND}. Cannabis lifestyle marketing, cinematic, professional.`,
    }],
});

const rawJson = sceneResponse.content[0].type === 'text' ? sceneResponse.content[0].text : '';
const jsonMatch = rawJson.match(/\[[\s\S]*\]/);
let scenes = [];
try {
    scenes = JSON.parse(jsonMatch?.[0] ?? rawJson);
} catch {
    console.error('❌ Failed to parse scene JSON from Haiku:', rawJson.substring(0, 200));
    process.exit(1);
}

console.log(`✅ Haiku planned ${scenes.length} scenes:\n`);
scenes.forEach((s, i) => {
    console.log(`   Scene ${i + 1}: [${s.title}]`);
    console.log(`            ${s.prompt.substring(0, 100)}...`);
});

// ─── Step 2: Fal.ai Kling — Submit all clips in parallel ──────────────────

console.log(`\n🎥 Step 2: Submitting ${scenes.length} Kling v2 clips in parallel...`);

async function submitKlingClip(scene, index) {
    const body = JSON.stringify({
        prompt: scene.prompt,
        duration: CLIP_DURATION,
        aspect_ratio: ASPECT_RATIO,
    });

    const res = await fetch(`${FAL_QUEUE_BASE}/${KLING_MODEL}`, {
        method: 'POST',
        headers: {
            'Authorization': `Key ${FAL_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body,
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`[Scene ${index + 1}] Fal submit failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    console.log(`   ↗ Scene ${index + 1} queued: ${data.request_id}`);
    return { requestId: data.request_id, scene };
}

const submissions = await Promise.all(scenes.map(submitKlingClip));

// ─── Step 3: Poll all clips until complete ─────────────────────────────────

console.log(`\n⏳ Step 3: Polling ${submissions.length} clips (up to 6 min each)...\n`);

async function pollClip(requestId, sceneIndex) {
    const statusUrl = `${FAL_QUEUE_BASE}/${KLING_MODEL}/requests/${requestId}/status`;
    const resultUrl = `${FAL_QUEUE_BASE}/${KLING_MODEL}/requests/${requestId}`;
    const maxAttempts = 72; // 6 min
    const interval = 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(r => setTimeout(r, interval));

        const statusRes = await fetch(statusUrl, {
            headers: { 'Authorization': `Key ${FAL_API_KEY}` },
        });
        const status = await statusRes.json();

        if (status.status === 'COMPLETED') {
            const resultRes = await fetch(resultUrl, {
                headers: { 'Authorization': `Key ${FAL_API_KEY}` },
            });
            const result = await resultRes.json();
            const videoUrl = result.video?.url ?? result.videos?.[0]?.url;
            if (!videoUrl) throw new Error(`[Scene ${sceneIndex + 1}] No video URL in result`);
            console.log(`   ✅ Scene ${sceneIndex + 1} ready (${attempt * 5 + 5}s)`);
            return videoUrl;
        }

        if (status.status === 'FAILED') {
            throw new Error(`[Scene ${sceneIndex + 1}] Kling job failed: ${status.error ?? 'unknown'}`);
        }

        if (attempt % 6 === 0) {
            process.stdout.write(`   ⏳ Scene ${sceneIndex + 1}: ${status.status} (${(attempt * 5)}s)...\n`);
        }
    }

    throw new Error(`[Scene ${sceneIndex + 1}] Polling timeout after 6 min`);
}

const clipResults = await Promise.all(
    submissions.map(({ requestId, scene }, i) =>
        pollClip(requestId, i).then(url => ({ url, sceneTitle: scene.title, prompt: scene.prompt }))
    )
);

// ─── Output ────────────────────────────────────────────────────────────────

console.log(`\n🎉 All ${clipResults.length} clips ready!\n`);
console.log('─'.repeat(70));
clipResults.forEach((clip, i) => {
    console.log(`\nScene ${i + 1}: ${clip.sceneTitle}`);
    console.log(`  URL:    ${clip.url}`);
    console.log(`  Prompt: ${clip.prompt.substring(0, 80)}...`);
});
console.log('\n' + '─'.repeat(70));

console.log(`
📋 Next Steps:
   1. Preview clips above in browser
   2. For full branded video (intro + outro + Thrive title card):
      → Go to bakedbot.ai/dashboard/creative → 🎥 Long tab
      → Paste prompt: "${USER_PROMPT}"
      → Select 60s, 16:9 → Generate
   3. Save this JSON for Remotion manual render:
`);

console.log(JSON.stringify(clipResults.map(c => ({ url: c.url, sceneTitle: c.sceneTitle })), null, 2));

/*
 * ─── PRODUCTION CURL ALTERNATIVE ───────────────────────────────────────────
 *
 * If you have a session cookie from bakedbot.ai, you can trigger the full
 * chain endpoint (includes Remotion-wrapped output):
 *
 * curl -X POST https://bakedbot.ai/api/ai/video/chain \
 *   -H "Content-Type: application/json" \
 *   -H "Cookie: __session=<your-session-cookie>" \
 *   -d '{
 *     "orgId": "org_thrive_syracuse",
 *     "prompt": "Thrive Syracuse dispensary brand story — premium flower, welcoming staff, cozy interior, loyal customers, Syracuse community pride, Friday energy vibe",
 *     "aspectRatio": "16:9",
 *     "styleMode": "stop-motion",
 *     "screenshotUrls": [],
 *     "kineticHeadline": "WELCOME TO THRIVE",
 *     "targetDuration": "60"
 *   }' \
 *   --max-time 600
 */
