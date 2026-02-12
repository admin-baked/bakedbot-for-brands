'use server';

/**
 * Slide Visual Generation
 *
 * Uses Gemini Flash 2.5 Image to generate slide backgrounds and agent illustrations.
 * Backgrounds are cached in Firestore and served from Firebase Storage.
 * NOT called on page load — triggered manually from admin.
 */

import { getAdminFirestore, getAdminStorage } from '@/firebase/admin';
import { generateImageFromPrompt } from '@/ai/flows/generate-social-image';
import { logger } from '@/lib/logger';

const SLIDE_BG_COLLECTION = 'slide_backgrounds';
const AGENT_ILLUSTRATION_COLLECTION = 'agent_illustrations';
const STORAGE_BG_PATH = 'academy/slide-backgrounds';
const STORAGE_AGENT_PATH = 'academy/agent-illustrations';

/** Color hex to descriptive name for better Gemini prompts */
function colorName(hex: string): string {
  const map: Record<string, string> = {
    '#10b981': 'emerald green',
    '#3b82f6': 'electric blue',
    '#8b5cf6': 'vivid purple',
    '#f59e0b': 'warm amber',
    '#ec4899': 'vibrant pink',
    '#ef4444': 'bold red',
    '#0d9488': 'deep teal',
  };
  return map[hex] || 'emerald green';
}

/**
 * Prompt templates for each slide type background.
 * Dark theme, abstract, professional — designed to sit behind content with 80% overlay.
 */
const SLIDE_TYPE_PROMPTS: Record<string, (color: string) => string> = {
  title: (color) =>
    `Abstract professional presentation background. Dark charcoal base, subtle ${colorName(color)} accent lighting from edges, ` +
    `floating geometric shapes, soft bokeh orbs. Modern tech conference aesthetic, cinematic, premium. No text, no logos. 16:9.`,
  objectives: (color) =>
    `Abstract dark background for an education slide. Orderly glowing node network with thin connecting lines, ` +
    `subtle ${colorName(color)} accent highlights on key nodes. Structured, clean, data-science feel. No text. 16:9.`,
  content: (color) =>
    `Minimalist dark background for content presentation. Smooth matte dark surface with a gentle ${colorName(color)} ` +
    `gradient glow on the left edge, faint geometric circuit lines. Premium, unobtrusive. No text. 16:9.`,
  split: (color) =>
    `Dark background for a two-column comparison slide. Subtle center divider with ${colorName(color)} light gradient, ` +
    `abstract shapes on each side, depth effect. Professional, balanced. No text. 16:9.`,
  agent: (color) =>
    `Atmospheric dark scene for an AI agent character introduction. Dramatic ${colorName(color)} accent lighting, ` +
    `digital particles, holographic data streams, futuristic control room ambiance. No characters, no text. 16:9.`,
  comparison: (color) =>
    `Dark background for before/after comparison. Left side has warm red ambient glow, right side has cool green glow, ` +
    `smooth transition in center. Abstract, professional. No text. 16:9.`,
  quote: (color) =>
    `Elegant dark background for a quote slide. Soft ${colorName(color)} spotlight from above, subtle radial gradient, ` +
    `faint textured paper/fabric overlay. Sophisticated, minimal. No text. 16:9.`,
  stat: (color) =>
    `Dynamic dark background for a big statistic slide. Concentric ${colorName(color)} rings radiating from center, ` +
    `energy pulse effect, data visualization aesthetic. Impactful, modern. No text. 16:9.`,
  demo: (color) =>
    `Dark background for a demo instruction slide. ${colorName(color)} accented screen/display mockup shapes, ` +
    `subtle play button motif, code terminal aesthetic. Technical, clean. No text. 16:9.`,
  recap: (color) =>
    `Dark background for a recap/summary slide. ${colorName(color)} accented checklist motifs, ` +
    `subtle grid pattern, glowing checkmarks fading into background. Accomplished, clean. No text. 16:9.`,
  cta: (color) =>
    `Dramatic dark background for a call-to-action slide. Bold ${colorName(color)} gradient sweep from bottom-left, ` +
    `spotlight effect, lens flare, energy and momentum. Inspiring, premium. No text. 16:9.`,
};

/** Prompt templates for agent character illustrations (4 agents without images) */
const AGENT_CHARACTER_PROMPTS: Record<string, string> = {
  craig:
    'Professional illustrated character for a marketing AI agent named Craig. African American man in modern ' +
    'business casual attire, confident stance, holding a tablet showing campaign analytics. Blue accent lighting, ' +
    'digital marketing icons floating nearby. Modern corporate illustration style, flat design with subtle gradients. ' +
    'Transparent background. No cannabis consumption imagery.',
  'money-mike':
    'Professional illustrated character for a revenue optimization AI agent named Money Mike. Sharp-dressed ' +
    'financial analyst with emerald/teal suit, standing next to holographic pricing charts and profit graphs. ' +
    'Teal accent lighting. Modern corporate illustration style, flat design with subtle gradients. ' +
    'Transparent background. No cannabis consumption imagery.',
  'mrs-parker':
    'Professional illustrated character for a customer retention AI agent named Mrs. Parker. Warm, elegant ' +
    'woman with sophisticated style, surrounded by floating heart and connection icons. Pink/rose accent lighting. ' +
    'Modern corporate illustration style, flat design with subtle gradients. ' +
    'Transparent background. No cannabis consumption imagery.',
  deebo:
    'Professional illustrated character for a compliance enforcement AI agent named Deebo. Imposing but ' +
    'professional figure in security-styled attire, digital shield emblems and checkmarks floating around. ' +
    'Red accent lighting. Modern corporate illustration style, flat design with subtle gradients. ' +
    'Transparent background. No cannabis consumption imagery.',
};

/** Prompt templates for agent scene backgrounds (all 7 agents) */
const AGENT_SCENE_PROMPTS: Record<string, string> = {
  smokey:
    'Scene background: AI-powered dispensary consultation room. Holographic terpene molecule diagrams ' +
    'floating in air, emerald green ambient lighting, modern apothecary aesthetic, product shelves with ' +
    'soft glow. Futuristic but warm. No people, no text. 16:9.',
  craig:
    'Scene background: Multi-screen marketing command center. Campaign dashboards on floating screens, ' +
    'SMS/email/social icons, blue accent lighting, data flows between screens. War room aesthetic. ' +
    'No people, no text. 16:9.',
  pops:
    'Scene background: Data analytics laboratory. Large holographic charts and graphs floating in space, ' +
    'purple accent lighting, inventory data visualizations, predictive analytics curves. ' +
    'No people, no text. 16:9.',
  ezal:
    'Scene background: Competitive intelligence surveillance room. Radar displays, market data feeds, ' +
    'amber/gold accent lighting, real-time price monitoring screens, binocular lens effect overlay. ' +
    'No people, no text. 16:9.',
  'money-mike':
    'Scene background: Revenue optimization trading floor. Dynamic pricing charts, profit/loss tickers, ' +
    'teal/emerald accent lighting, margin analysis dashboards, financial data streams. ' +
    'No people, no text. 16:9.',
  'mrs-parker':
    'Scene background: Customer relationship management hub. Connection network visualizations, ' +
    'pink/rose accent lighting, loyalty program metrics, customer journey maps glowing softly. ' +
    'No people, no text. 16:9.',
  deebo:
    'Scene background: Compliance command center. Shield and lock holograms, red accent lighting, ' +
    'regulatory document scanners, TCPA compliance dashboards, checkmark verification systems. ' +
    'No people, no text. 16:9.',
};

/**
 * Generate a slide background image using Gemini Flash 2.5 Image.
 */
export async function generateSlideBackground(params: {
  slideType: string;
  trackColor: string;
}): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const colorHex = params.trackColor.replace('#', '');
  const docId = `${params.slideType}_${colorHex}`;

  try {
    const db = getAdminFirestore();

    // Check cache
    const cached = await db.collection(SLIDE_BG_COLLECTION).doc(docId).get();
    if (cached.exists) {
      const data = cached.data();
      if (data?.imageUrl) {
        return { success: true, imageUrl: data.imageUrl };
      }
    }

    // Build prompt
    const templateFn = SLIDE_TYPE_PROMPTS[params.slideType];
    if (!templateFn) {
      return { success: false, error: `Unknown slide type: ${params.slideType}` };
    }
    const prompt = templateFn(params.trackColor);

    logger.info(`[SlideVisuals] Generating background for ${docId}`);

    // Generate
    const imageDataUri = await generateImageFromPrompt(prompt, { tier: 'free' });

    // Upload to Storage
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const storagePath = `${STORAGE_BG_PATH}/${docId}.png`;

    const base64Data = imageDataUri.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const file = bucket.file(storagePath);
    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/png',
        metadata: { slideType: params.slideType, trackColor: params.trackColor, generatedAt: new Date().toISOString() },
      },
    });

    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    // Cache
    await db.collection(SLIDE_BG_COLLECTION).doc(docId).set({
      slideType: params.slideType,
      trackColor: params.trackColor,
      imageUrl: publicUrl,
      storagePath,
      generatedAt: new Date(),
    });

    logger.info(`[SlideVisuals] Generated background: ${docId}`, { url: publicUrl });
    return { success: true, imageUrl: publicUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[SlideVisuals] Failed to generate background: ${docId}`, { error: message });
    return { success: false, error: message };
  }
}

/**
 * Generate an agent illustration (character or scene).
 */
export async function generateAgentIllustration(params: {
  agentId: string;
  type: 'character' | 'scene';
}): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const docId = `${params.agentId}_${params.type}`;

  try {
    const db = getAdminFirestore();

    // Check cache
    const cached = await db.collection(AGENT_ILLUSTRATION_COLLECTION).doc(docId).get();
    if (cached.exists) {
      const data = cached.data();
      if (data?.imageUrl) {
        return { success: true, imageUrl: data.imageUrl };
      }
    }

    // Get prompt
    const prompts = params.type === 'character' ? AGENT_CHARACTER_PROMPTS : AGENT_SCENE_PROMPTS;
    const prompt = prompts[params.agentId];
    if (!prompt) {
      return { success: false, error: `No ${params.type} prompt for agent: ${params.agentId}` };
    }

    logger.info(`[SlideVisuals] Generating ${params.type} illustration for ${params.agentId}`);

    const imageDataUri = await generateImageFromPrompt(prompt, { tier: 'free' });

    // Upload
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const storagePath = `${STORAGE_AGENT_PATH}/${docId}.png`;

    const base64Data = imageDataUri.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const file = bucket.file(storagePath);
    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/png',
        metadata: { agentId: params.agentId, type: params.type, generatedAt: new Date().toISOString() },
      },
    });

    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    // Cache
    await db.collection(AGENT_ILLUSTRATION_COLLECTION).doc(docId).set({
      agentId: params.agentId,
      type: params.type,
      imageUrl: publicUrl,
      storagePath,
      generatedAt: new Date(),
    });

    logger.info(`[SlideVisuals] Generated ${params.type} for ${params.agentId}`, { url: publicUrl });
    return { success: true, imageUrl: publicUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[SlideVisuals] Failed: ${docId}`, { error: message });
    return { success: false, error: message };
  }
}

/** Get all cached slide backgrounds as a map of docId → imageUrl */
export async function getAllCachedSlideBackgrounds(): Promise<Record<string, string>> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection(SLIDE_BG_COLLECTION).get();
    const result: Record<string, string> = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data?.imageUrl) result[doc.id] = data.imageUrl;
    });
    return result;
  } catch {
    return {};
  }
}

/** Get all cached agent illustrations as a map of docId → imageUrl */
export async function getAllCachedAgentIllustrations(): Promise<Record<string, string>> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection(AGENT_ILLUSTRATION_COLLECTION).get();
    const result: Record<string, string> = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data?.imageUrl) result[doc.id] = data.imageUrl;
    });
    return result;
  } catch {
    return {};
  }
}

/** All slide types that have prompts */
const ALL_SLIDE_TYPES = Object.keys(SLIDE_TYPE_PROMPTS);

/** All unique track colors used across episodes */
const UNIQUE_TRACK_COLORS = [
  '#10b981', // smokey, money-mike, general
  '#3b82f6', // craig
  '#8b5cf6', // pops
  '#f59e0b', // ezal
  '#ec4899', // mrs-parker
  '#ef4444', // deebo
];

/** All agents that need character illustrations */
const AGENTS_NEEDING_CHARACTERS = Object.keys(AGENT_CHARACTER_PROMPTS);

/** All agents that need scene illustrations */
const AGENTS_NEEDING_SCENES = Object.keys(AGENT_SCENE_PROMPTS);

/**
 * Generate all missing slide backgrounds and agent illustrations.
 */
export async function generateAllMissingSlideVisuals(): Promise<{
  backgroundsGenerated: number;
  backgroundsSkipped: number;
  agentsGenerated: number;
  agentsSkipped: number;
  errors: string[];
}> {
  const results = {
    backgroundsGenerated: 0,
    backgroundsSkipped: 0,
    agentsGenerated: 0,
    agentsSkipped: 0,
    errors: [] as string[],
  };

  const existingBgs = await getAllCachedSlideBackgrounds();
  const existingAgents = await getAllCachedAgentIllustrations();

  // Generate slide backgrounds
  for (const slideType of ALL_SLIDE_TYPES) {
    for (const color of UNIQUE_TRACK_COLORS) {
      const key = `${slideType}_${color.replace('#', '')}`;
      if (existingBgs[key]) {
        results.backgroundsSkipped++;
        continue;
      }

      const result = await generateSlideBackground({ slideType, trackColor: color });
      if (result.success) {
        results.backgroundsGenerated++;
      } else {
        results.errors.push(`bg:${key}: ${result.error}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Generate agent character illustrations
  for (const agentId of AGENTS_NEEDING_CHARACTERS) {
    const key = `${agentId}_character`;
    if (existingAgents[key]) {
      results.agentsSkipped++;
      continue;
    }

    const result = await generateAgentIllustration({ agentId, type: 'character' });
    if (result.success) {
      results.agentsGenerated++;
    } else {
      results.errors.push(`agent:${key}: ${result.error}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Generate agent scene illustrations
  for (const agentId of AGENTS_NEEDING_SCENES) {
    const key = `${agentId}_scene`;
    if (existingAgents[key]) {
      results.agentsSkipped++;
      continue;
    }

    const result = await generateAgentIllustration({ agentId, type: 'scene' });
    if (result.success) {
      results.agentsGenerated++;
    } else {
      results.errors.push(`agent:${key}: ${result.error}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  logger.info('[SlideVisuals] Batch generation complete', results);
  return results;
}
