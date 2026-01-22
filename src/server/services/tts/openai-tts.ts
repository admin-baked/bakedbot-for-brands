/**
 * OpenAI TTS Client
 *
 * Text-to-Speech generation using OpenAI's TTS API.
 * Includes caching and brand voice support.
 */

import { logger } from '@/lib/logger';
import {
  TTSRequest,
  TTSResponse,
  OpenAIVoice,
  AudioFormat,
  TTSModel,
  TTSCacheEntry,
} from './types';
import { processTextForTTS } from './text-processor';
import { getBrandVoiceConfig } from './brand-voices';
import * as crypto from 'crypto';

// ============================================================================
// OPENAI CLIENT
// ============================================================================

let openaiInstance: any = null;

async function getOpenAIClient() {
  if (openaiInstance) return openaiInstance;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required for TTS');
  }

  // Dynamic import to avoid bundling issues
  const OpenAI = (await import('openai')).default;
  openaiInstance = new OpenAI({ apiKey });

  return openaiInstance;
}

/**
 * Check if OpenAI TTS is available.
 */
export function isOpenAITTSAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// ============================================================================
// CACHING
// ============================================================================

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const audioCache = new Map<string, TTSCacheEntry>();

function getCacheKey(text: string, voice: string, speed: number, format: string): string {
  const hash = crypto.createHash('md5').update(`${text}|${voice}|${speed}|${format}`).digest('hex');
  return `tts_${hash}`;
}

function getCachedAudio(key: string): TTSCacheEntry | null {
  const entry = audioCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry;
  }
  if (entry) {
    audioCache.delete(key); // Clean up expired
  }
  return null;
}

function setCachedAudio(key: string, entry: Omit<TTSCacheEntry, 'createdAt' | 'expiresAt'>) {
  const now = Date.now();
  audioCache.set(key, {
    ...entry,
    createdAt: now,
    expiresAt: now + CACHE_TTL_MS,
  });
}

// ============================================================================
// AUDIO STORAGE
// ============================================================================

/**
 * Store audio buffer and return a URL.
 * In production, this should upload to Firebase Storage or similar.
 */
async function storeAudioBuffer(
  buffer: Buffer,
  filename: string,
  _contentType: string
): Promise<string> {
  // For now, store in-memory and return a data URL for small files
  // In production, upload to Firebase Storage
  try {
    const { getStorage } = await import('firebase-admin/storage');
    const bucket = getStorage().bucket();
    const file = bucket.file(`tts/${filename}`);

    await file.save(buffer, {
      contentType: _contentType,
      metadata: {
        cacheControl: 'public, max-age=86400', // 24 hours
      },
    });

    // Make the file publicly accessible
    await file.makePublic();

    // Return the public URL
    return `https://storage.googleapis.com/${bucket.name}/tts/${filename}`;
  } catch (e) {
    logger.warn(`[TTS] Firebase Storage unavailable, using data URL: ${e}`);
    // Fallback to base64 data URL (not recommended for production)
    const base64 = buffer.toString('base64');
    return `data:audio/mp3;base64,${base64}`;
  }
}

// ============================================================================
// MAIN TTS FUNCTION
// ============================================================================

/**
 * Generate speech from text using OpenAI TTS.
 *
 * @example
 * ```typescript
 * const result = await generateSpeech({
 *   text: 'Welcome to our dispensary!',
 *   brandId: 'brand-123',
 *   voice: 'nova',
 * });
 *
 * console.log(result.audioUrl);
 * ```
 */
export async function generateSpeech(request: TTSRequest): Promise<TTSResponse> {
  const {
    text,
    brandId,
    voice: requestedVoice,
    speed: requestedSpeed,
    format = 'mp3',
    useHD = true,
    skipProcessing = false,
  } = request;

  // Get brand voice config if available
  let brandConfig = null;
  if (brandId) {
    try {
      brandConfig = await getBrandVoiceConfig(brandId);
    } catch (e) {
      logger.debug(`[TTS] No brand voice config for ${brandId}`);
    }
  }

  // Determine voice and speed
  const voice: OpenAIVoice = requestedVoice || brandConfig?.defaultVoice || 'nova';
  const speed = requestedSpeed || brandConfig?.speed || 1.0;
  const model: TTSModel = useHD ? 'tts-1-hd' : 'tts-1';

  // Process text for TTS
  const processedResult = skipProcessing
    ? { original: text, processed: text, transformations: [], estimatedDuration: estimateDuration(text, speed) }
    : await processTextForTTS(text, brandConfig || undefined);

  const processedText = processedResult.processed;

  // Check cache
  const cacheKey = getCacheKey(processedText, voice, speed, format);
  const cached = getCachedAudio(cacheKey);

  if (cached) {
    logger.info(`[TTS] Cache hit for ${cacheKey.slice(0, 16)}...`);
    return {
      audioUrl: cached.audioUrl,
      duration: cached.duration,
      format: cached.format,
      cached: true,
      metadata: {
        voice: cached.voice,
        model,
        textLength: text.length,
        processedTextLength: processedText.length,
        processedAt: new Date().toISOString(),
      },
    };
  }

  // Generate audio
  logger.info(`[TTS] Generating speech: "${text.slice(0, 50)}..." (voice: ${voice}, model: ${model})`);

  const openai = await getOpenAIClient();

  const response = await openai.audio.speech.create({
    model,
    voice,
    input: processedText,
    speed,
    response_format: format,
  });

  // Convert response to buffer
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Store audio and get URL
  const filename = `${cacheKey}.${format}`;
  const audioUrl = await storeAudioBuffer(buffer, filename, `audio/${format}`);

  // Cache the result
  const duration = processedResult.estimatedDuration;
  setCachedAudio(cacheKey, {
    audioUrl,
    duration,
    format,
    voice,
  });

  logger.info(`[TTS] Generated ${buffer.length} bytes of audio (${duration.toFixed(1)}s)`);

  return {
    audioUrl,
    duration,
    format,
    cached: false,
    metadata: {
      voice,
      model,
      textLength: text.length,
      processedTextLength: processedText.length,
      processedAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Estimate speaking duration for text.
 * Average speaking rate is ~150 words per minute.
 */
function estimateDuration(text: string, speed: number): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  const baseMinutes = words / 150;
  return (baseMinutes * 60) / speed;
}

/**
 * Clear the TTS cache (useful for testing).
 */
export function clearTTSCache(): void {
  audioCache.clear();
  logger.info('[TTS] Cache cleared');
}

/**
 * Get cache statistics.
 */
export function getTTSCacheStats(): { size: number; entries: number } {
  let totalSize = 0;
  for (const entry of audioCache.values()) {
    // Estimate size from duration (rough approximation)
    totalSize += entry.duration * 16000; // ~16KB per second for mp3
  }

  return {
    size: totalSize,
    entries: audioCache.size,
  };
}
