/**
 * TTS Service
 *
 * Text-to-Speech using OpenAI with brand-specific voices.
 */

// Types
export * from './types';

// OpenAI TTS
export {
  generateSpeech,
  isOpenAITTSAvailable,
  clearTTSCache,
  getTTSCacheStats,
} from './openai-tts';

// Text processing
export { processTextForTTS } from './text-processor';

// Brand voices
export {
  getBrandVoiceConfig,
  saveBrandVoiceConfig,
  clearBrandVoiceCache,
  getVoiceForTone,
  SMOKEY_DEFAULT_VOICE,
  DEFAULT_BRAND_VOICE,
} from './brand-voices';
