/**
 * Brand Voice Configuration
 *
 * Manages brand-specific voice settings for TTS.
 */

import { BrandVoiceConfig, OpenAIVoice } from './types';
import { logger } from '@/lib/logger';

// ============================================================================
// DEFAULT VOICE CONFIGURATIONS
// ============================================================================

/**
 * Default voice for Smokey (budtender persona).
 */
export const SMOKEY_DEFAULT_VOICE: OpenAIVoice = 'nova';

/**
 * Voice recommendations by tone.
 */
export const VOICE_BY_TONE: Record<string, OpenAIVoice> = {
  professional: 'onyx',
  friendly: 'nova',
  casual: 'alloy',
  educational: 'shimmer',
};

/**
 * Default brand voice config when none is set.
 */
export const DEFAULT_BRAND_VOICE: Omit<BrandVoiceConfig, 'brandId'> = {
  defaultVoice: 'nova',
  speed: 1.0,
  tone: 'friendly',
  vocabulary: [
    // Common cannabis pronunciation fixes
    { word: 'Stiiizy', pronunciation: 'Steezy' },
    { word: 'Jeeter', pronunciation: 'Jeeter' },
    { word: 'Wana', pronunciation: 'Wanna' },
    { word: 'WYLD', pronunciation: 'Wild' },
  ],
};

// ============================================================================
// BRAND VOICE STORAGE
// ============================================================================

// In-memory cache (in production, this would come from Firestore)
const brandVoiceCache = new Map<string, BrandVoiceConfig>();

/**
 * Get brand voice configuration.
 */
export async function getBrandVoiceConfig(
  brandId: string
): Promise<BrandVoiceConfig | null> {
  // Check cache first
  if (brandVoiceCache.has(brandId)) {
    return brandVoiceCache.get(brandId)!;
  }

  // Try to load from Firestore
  try {
    const { createServerClient } = await import('@/server/server-client');
    const { firestore } = await createServerClient();
    const doc = await firestore
      .collection('tenants')
      .doc(brandId)
      .collection('settings')
      .doc('voice')
      .get();

    if (doc.exists) {
      const data = doc.data() as Partial<BrandVoiceConfig>;
      const config: BrandVoiceConfig = {
        brandId,
        defaultVoice: data.defaultVoice || DEFAULT_BRAND_VOICE.defaultVoice,
        speed: data.speed || DEFAULT_BRAND_VOICE.speed,
        customInstructions: data.customInstructions,
        vocabulary: [
          ...(DEFAULT_BRAND_VOICE.vocabulary || []),
          ...(data.vocabulary || []),
        ],
        tone: data.tone || DEFAULT_BRAND_VOICE.tone,
      };

      brandVoiceCache.set(brandId, config);
      return config;
    }
  } catch (e) {
    logger.debug(`[TTS:BrandVoice] Could not load config for ${brandId}: ${e}`);
  }

  // Return default config
  const defaultConfig: BrandVoiceConfig = {
    brandId,
    ...DEFAULT_BRAND_VOICE,
  };

  brandVoiceCache.set(brandId, defaultConfig);
  return defaultConfig;
}

/**
 * Save brand voice configuration.
 */
export async function saveBrandVoiceConfig(
  config: BrandVoiceConfig
): Promise<void> {
  try {
    const { createServerClient } = await import('@/server/server-client');
    const { firestore } = await createServerClient();
    await firestore
      .collection('tenants')
      .doc(config.brandId)
      .collection('settings')
      .doc('voice')
      .set(config, { merge: true });

    // Update cache
    brandVoiceCache.set(config.brandId, config);

    logger.info(`[TTS:BrandVoice] Saved config for ${config.brandId}`);
  } catch (e) {
    logger.error(`[TTS:BrandVoice] Failed to save config: ${e}`);
    throw e;
  }
}

/**
 * Clear brand voice cache (useful for testing).
 */
export function clearBrandVoiceCache(): void {
  brandVoiceCache.clear();
}

/**
 * Get recommended voice for a tone.
 */
export function getVoiceForTone(
  tone: BrandVoiceConfig['tone']
): OpenAIVoice {
  return VOICE_BY_TONE[tone || 'friendly'] || 'nova';
}
