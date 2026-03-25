/**
 * Super Power: Generate Dispensary Owner Training PowerPoint + save to Drive
 * Usage: node --env-file=.env.local scripts/generate-training-deck.mjs
 *
 * Steps:
 *   1. Read dev/DISPENSARY_OWNER_TRAINING.md
 *   2. Call Z.ai GLM-5 to generate a structured DeckScript
 *   3. Render .pptx with pptxgenjs
 *   4. Upload to Firebase Storage (generated-decks/)
 *   5. Write Firestore drive_files doc for jack@bakedbot.ai (super user drive)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Config ─────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SA_KEY_B64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'bakedbot-global-assets';
const SUPER_USER_EMAIL = 'jack@bakedbot.ai';
const SUPER_USER_UID = process.env.SUPER_USER_UID || 'jack_bakedbot';

if (!ANTHROPIC_API_KEY) { console.error('❌ ANTHROPIC_API_KEY not set'); process.exit(1); }
if (!SA_KEY_B64) { console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY not set'); process.exit(1); }

// ─── Step 1: Read markdown ───────────────────────────────────────────────────

const mdPath = resolve(ROOT, 'dev', 'DISPENSARY_OWNER_TRAINING.md');
const mdContent = readFileSync(mdPath, 'utf-8');
console.log(`📄 Read training doc (${mdContent.length} chars)`);

// ─── Step 2: GLM-5 → DeckScript ─────────────────────────────────────────────

console.log('🧠 Generating deck script via Claude Haiku...');

const systemPrompt = `You are a professional cannabis industry presentation designer.
Generate a complete deck script as a JSON object matching this TypeScript type:
{
  deckTitle: string;
  subtitle?: string;
  slides: Array<{ title: string; bullets: string[]; speakerNotes?: string }>;
  disclaimer?: string;
}

RULES (MANDATORY — cannabis compliance):
- No medical or health benefit claims (e.g. "cures", "treats", "heals")
- Include "For adults 21+ only. Keep out of reach of children." disclaimer on last slide and in the disclaimer field
- 3–5 concise bullets per slide (fragment style, not full sentences)
- speakerNotes should be 1–2 sentences expanding on the slide bullets
- Return ONLY valid JSON, no markdown fences`;

const userMessage = `Brand: BakedBot AI
Purpose: training
Topic: Dispensary Owner Onboarding — How to use BakedBot AI platform features and agents to run your dispensary

Use this training document as the content source. Extract the key sections and convert them into a compelling 10-slide training deck:

${mdContent.substring(0, 6000)}

Slide structure guide:
Slide 1: Cover — "BakedBot AI: Dispensary Owner Training"
Slide 2: Meet Your AI Agent Team
Slide 3: Workspace — Inbox, Playbooks, Drive
Slide 4: Menu & Inventory Management
Slide 5: Customers & Loyalty Program
Slide 6: Digital Loyalty Card (PWA + Web Push)
Slide 7: Marketing — Craig, Creative Center, Campaigns
Slide 8: Intelligence & Analytics (Ezal + Pops)
Slide 9: Week in the Life — 7-Day Simulation
Slide 10: Getting Started Checklist`;

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const response = await client.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 4096,
  system: systemPrompt,
  messages: [{ role: 'user', content: userMessage }],
});
const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';
const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
const script = JSON.parse(cleaned);
console.log(`✅ Script generated: "${script.deckTitle}" — ${script.slides.length} slides`);

// ─── Step 3: pptxgenjs rendering ─────────────────────────────────────────────

console.log('🎨 Rendering .pptx...');

const PptxGenJS = (await import('pptxgenjs')).default;
const pptx = new PptxGenJS();

const primary = '1a1a2e';   // deep navy — BakedBot brand
const accent  = '16a34a';   // green
const white   = 'FFFFFF';
const light   = 'F4F4F5';
const bodyText = '27272a';

function hex(c) { return c.startsWith('#') ? c.slice(1) : c; }

// Cover slide
const cover = pptx.addSlide();
cover.background = { color: primary };
cover.addText(script.deckTitle, {
  x: 0.5, y: 1.2, w: 9, h: 1.8,
  fontSize: 36, bold: true, color: white, align: 'center',
});
if (script.subtitle) {
  cover.addText(script.subtitle, {
    x: 0.5, y: 3.1, w: 9, h: 0.8,
    fontSize: 18, color: accent, align: 'center',
  });
}
cover.addText('Powered by BakedBot AI', {
  x: 0.5, y: 4.6, w: 9, h: 0.4,
  fontSize: 12, color: accent, align: 'center',
});

// Content slides
for (const slide of script.slides) {
  const s = pptx.addSlide();
  s.background = { color: white };

  // Title bar
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 1.1,
    fill: { color: primary },
    line: { color: primary },
  });
  s.addText(slide.title, {
    x: 0.3, y: 0.1, w: 9.4, h: 0.9,
    fontSize: 22, bold: true, color: white,
  });

  // Bullets
  const bulletText = slide.bullets.map(b => ({ text: `• ${b}`, options: { bullet: false, breakLine: true } }));
  s.addText(bulletText, {
    x: 0.5, y: 1.3, w: 9, h: 3.2,
    fontSize: 16, color: bodyText, valign: 'top',
  });

  // Speaker notes
  if (slide.speakerNotes) {
    s.addNotes(slide.speakerNotes);
  }

  // Accent bar at bottom
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 4.9, w: 10, h: 0.1,
    fill: { color: accent },
    line: { color: accent },
  });
}

// Disclaimer slide
const disc = pptx.addSlide();
disc.background = { color: primary };
disc.addText('Important Notice', {
  x: 0.5, y: 1.0, w: 9, h: 1.0,
  fontSize: 28, bold: true, color: white, align: 'center',
});
disc.addText(script.disclaimer || 'For adults 21+ only. Keep out of reach of children. Cannabis products are regulated — follow all applicable state and local laws.', {
  x: 1.0, y: 2.2, w: 8, h: 2.0,
  fontSize: 16, color: light, align: 'center',
});

const buffer = await pptx.write({ outputType: 'nodebuffer' });
console.log(`✅ Rendered ${buffer.length} bytes`);

// ─── Step 4: Upload to Firebase Storage ─────────────────────────────────────

console.log('☁️  Uploading to Firebase Storage...');

const { initializeApp, getApps, cert } = await import('firebase-admin/app');
const { getStorage } = await import('firebase-admin/storage');
const { getFirestore, FieldValue } = await import('firebase-admin/firestore');

const sa = JSON.parse(Buffer.from(SA_KEY_B64, 'base64').toString());
if (!getApps().length) {
  initializeApp({ credential: cert(sa), storageBucket: BUCKET });
}

const storage = getStorage();
const bucket = storage.bucket(BUCKET);
const fileName = `generated-decks/bakedbot-ai-dispensary-owner-training-${Date.now()}.pptx`;

await bucket.file(fileName).save(Buffer.from(buffer), {
  contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  metadata: { metadata: { generatedBy: 'generate-training-deck-script', purpose: 'training' } },
});
await bucket.file(fileName).makePublic();

const downloadUrl = `https://storage.googleapis.com/${BUCKET}/${fileName}`;
console.log(`✅ Uploaded: ${downloadUrl}`);

// ─── Step 5: Save to Firestore drive_files ───────────────────────────────────

console.log('📁 Saving to Super User Drive...');

const db = getFirestore();
const now = Date.now();
const fileId = `deck_training_${now}`;
const displayName = 'Dispensary Owner Training — BakedBot AI.pptx';

await db.collection('drive_files').doc(fileId).set({
  id: fileId,
  name: displayName,
  mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  size: buffer.length,
  storagePath: fileName,
  downloadUrl,
  folderId: null,
  path: `/${displayName}`,
  ownerId: SUPER_USER_UID,
  ownerEmail: SUPER_USER_EMAIL,
  category: 'documents',
  tags: ['training', 'onboarding', 'dispensary', 'powerpoint'],
  metadata: { sourceDoc: 'dev/DISPENSARY_OWNER_TRAINING.md', generatedBy: 'generate-training-deck-script' },
  isShared: true,
  shareIds: ['super_user'],
  viewCount: 0,
  downloadCount: 0,
  createdAt: now,
  updatedAt: now,
});

console.log(`\n🎉 Done!`);
console.log(`📊 Slides: ${script.slides.length + 2} (incl. cover + disclaimer)`);
console.log(`📥 Download: ${downloadUrl}`);
console.log(`📁 Drive file ID: ${fileId}`);
console.log(`👤 Saved to: ${SUPER_USER_EMAIL} drive`);
