'use server';

/**
 * Academy Thumbnail Generation
 *
 * Uses Gemini Flash 2.5 Image to generate episode thumbnails on demand.
 * Thumbnails are cached in Firestore and served from Firebase Storage.
 * NOT called on page load - triggered manually from admin.
 */

import { getAdminFirestore, getAdminStorage } from '@/firebase/admin';
import { generateImageFromPrompt } from '@/ai/flows/generate-social-image';
import { ACADEMY_EPISODES, AGENT_TRACKS } from '@/lib/academy/curriculum';
import { logger } from '@/lib/logger';
import type { AgentTrack } from '@/types/academy';

const THUMBNAIL_COLLECTION = 'academy_thumbnails';
const STORAGE_PATH = 'academy/thumbnails';

/**
 * Track-specific prompt templates for Gemini image generation.
 * Focus on professional, modern aesthetics without cannabis consumption imagery.
 */
const TRACK_PROMPT_TEMPLATES: Record<string, (ep: { title: string; episodeNumber: number; description: string }) => string> = {
  general: (ep) =>
    `Professional online course thumbnail for Episode ${ep.episodeNumber}: "${ep.title}". ` +
    `Modern dark green and emerald theme, abstract tech/data motifs, cannabis leaf iconography (stylized, not realistic). ` +
    `Clean, premium, 16:9 aspect ratio. Style: modern SaaS marketing course. No text.`,
  smokey: (ep) =>
    `AI-powered product recommendation concept for Episode ${ep.episodeNumber}: "${ep.title}". ` +
    `Emerald green accent lighting, terpene molecule graphics, chemistry-meets-technology aesthetic. ` +
    `Dark background, modern, 16:9 aspect ratio. Style: tech education. No text.`,
  craig: (ep) =>
    `Multi-channel marketing automation concept for Episode ${ep.episodeNumber}: "${ep.title}". ` +
    `Blue and indigo accent lighting, SMS/email/social media iconography, campaign dashboard aesthetic. ` +
    `Dark background, modern, 16:9 aspect ratio. Style: marketing tech course. No text.`,
  pops: (ep) =>
    `Data analytics and business intelligence concept for Episode ${ep.episodeNumber}: "${ep.title}". ` +
    `Purple accent lighting, charts/graphs/data visualization motifs, insights dashboard aesthetic. ` +
    `Dark background, modern, 16:9 aspect ratio. Style: analytics course. No text.`,
  ezal: (ep) =>
    `Competitive intelligence and market monitoring concept for Episode ${ep.episodeNumber}: "${ep.title}". ` +
    `Amber and gold accent lighting, radar/surveillance motifs, market data aesthetic. ` +
    `Dark background, modern, 16:9 aspect ratio. Style: business intelligence course. No text.`,
  'money-mike': (ep) =>
    `Revenue optimization and dynamic pricing concept for Episode ${ep.episodeNumber}: "${ep.title}". ` +
    `Teal and emerald accent lighting, pricing charts, profit/margin visualization aesthetic. ` +
    `Dark background, modern, 16:9 aspect ratio. Style: finance tech course. No text.`,
  'mrs-parker': (ep) =>
    `Customer retention and loyalty concept for Episode ${ep.episodeNumber}: "${ep.title}". ` +
    `Pink and rose accent lighting, heart/connection motifs, customer journey aesthetic. ` +
    `Dark background, modern, 16:9 aspect ratio. Style: CRM course. No text.`,
  deebo: (ep) =>
    `Compliance and regulation concept for Episode ${ep.episodeNumber}: "${ep.title}". ` +
    `Red accent lighting, shield/lock/checkmark motifs, regulatory compliance aesthetic. ` +
    `Dark background, modern, 16:9 aspect ratio. Style: compliance course. No text.`,
};

/**
 * Generate a thumbnail for an academy episode using Gemini Flash 2.5 Image.
 * Caches result in Firestore and Firebase Storage.
 */
export async function generateEpisodeThumbnail(params: {
  episodeId: string;
  track: string;
  title: string;
  episodeNumber: number;
  description: string;
}): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    const db = getAdminFirestore();

    // Check if thumbnail already cached
    const cached = await db.collection(THUMBNAIL_COLLECTION).doc(params.episodeId).get();
    if (cached.exists) {
      const data = cached.data();
      if (data?.imageUrl) {
        return { success: true, imageUrl: data.imageUrl };
      }
    }

    // Build prompt from track template
    const templateFn = TRACK_PROMPT_TEMPLATES[params.track] || TRACK_PROMPT_TEMPLATES.general;
    const prompt = templateFn({
      title: params.title,
      episodeNumber: params.episodeNumber,
      description: params.description,
    });

    logger.info(`[Academy Thumbnails] Generating thumbnail for ${params.episodeId}`, { track: params.track });

    // Generate image via Gemini Flash 2.5 Image (free tier)
    const imageDataUri = await generateImageFromPrompt(prompt, { tier: 'free' });

    // Upload to Firebase Storage
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const storagePath = `${STORAGE_PATH}/${params.episodeId}.png`;

    // Convert data URI to buffer
    const base64Data = imageDataUri.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const file = bucket.file(storagePath);
    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/png',
        metadata: {
          episodeId: params.episodeId,
          track: params.track,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    // Make publicly accessible
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    // Cache in Firestore
    await db.collection(THUMBNAIL_COLLECTION).doc(params.episodeId).set({
      episodeId: params.episodeId,
      track: params.track,
      imageUrl: publicUrl,
      storagePath,
      generatedAt: new Date(),
    });

    logger.info(`[Academy Thumbnails] Generated thumbnail for ${params.episodeId}`, { url: publicUrl });
    return { success: true, imageUrl: publicUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Academy Thumbnails] Failed to generate thumbnail for ${params.episodeId}`, { error: message });
    return { success: false, error: message };
  }
}

/**
 * Get cached thumbnail URL for an episode, or null if not generated yet.
 */
export async function getEpisodeThumbnail(episodeId: string): Promise<string | null> {
  try {
    const db = getAdminFirestore();
    const doc = await db.collection(THUMBNAIL_COLLECTION).doc(episodeId).get();
    return doc.exists ? (doc.data()?.imageUrl ?? null) : null;
  } catch {
    return null;
  }
}

/**
 * Get all cached thumbnails as a map of episodeId -> imageUrl.
 */
export async function getAllCachedThumbnails(): Promise<Record<string, string>> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection(THUMBNAIL_COLLECTION).get();
    const thumbnails: Record<string, string> = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data?.imageUrl) {
        thumbnails[doc.id] = data.imageUrl;
      }
    });
    return thumbnails;
  } catch {
    return {};
  }
}

/**
 * Generate all missing thumbnails (admin action).
 * Iterates through episodes and generates thumbnails for any that don't have one cached.
 */
export async function generateAllMissingThumbnails(): Promise<{
  generated: number;
  skipped: number;
  errors: string[];
}> {
  const results = { generated: 0, skipped: 0, errors: [] as string[] };
  const existing = await getAllCachedThumbnails();

  for (const episode of ACADEMY_EPISODES) {
    if (existing[episode.id]) {
      results.skipped++;
      continue;
    }

    const result = await generateEpisodeThumbnail({
      episodeId: episode.id,
      track: episode.track ?? 'general',
      title: episode.title,
      episodeNumber: episode.episodeNumber ?? episode.number,
      description: episode.description,
    });

    if (result.success) {
      results.generated++;
    } else {
      results.errors.push(`${episode.id}: ${result.error}`);
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  logger.info('[Academy Thumbnails] Batch generation complete', results);
  return results;
}
