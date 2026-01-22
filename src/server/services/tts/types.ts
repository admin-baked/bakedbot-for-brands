/**
 * TTS Service Types
 *
 * Types for OpenAI Text-to-Speech integration with brand-specific voices.
 */

// ============================================================================
// OPENAI TTS TYPES
// ============================================================================

/** Available OpenAI TTS voices */
export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/** Audio output formats */
export type AudioFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';

/** TTS model selection */
export type TTSModel = 'tts-1' | 'tts-1-hd';

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface TTSRequest {
  /** Text to convert to speech */
  text: string;
  /** Brand ID for voice customization */
  brandId?: string;
  /** Override voice selection */
  voice?: OpenAIVoice;
  /** Speech speed (0.25 to 4.0, default 1.0) */
  speed?: number;
  /** Audio format (default: mp3) */
  format?: AudioFormat;
  /** Use HD model (default: true for quality) */
  useHD?: boolean;
  /** Skip text processing (use raw text) */
  skipProcessing?: boolean;
}

export interface TTSResponse {
  /** URL to the generated audio file */
  audioUrl: string;
  /** Estimated duration in seconds */
  duration: number;
  /** Audio format */
  format: AudioFormat;
  /** Whether this was served from cache */
  cached: boolean;
  /** Metadata about the generation */
  metadata: {
    voice: OpenAIVoice;
    model: TTSModel;
    textLength: number;
    processedTextLength: number;
    processedAt: string;
  };
}

// ============================================================================
// BRAND VOICE CONFIGURATION
// ============================================================================

export interface BrandVoiceConfig {
  /** Brand ID */
  brandId: string;
  /** Default voice for this brand */
  defaultVoice: OpenAIVoice;
  /** Speech speed (0.25 to 4.0) */
  speed: number;
  /** Custom instructions for text processing */
  customInstructions?: string;
  /** Brand-specific vocabulary for correct pronunciation */
  vocabulary?: Array<{
    word: string;
    pronunciation?: string; // e.g., "Stiiizy" -> "Steezy"
  }>;
  /** Tone guidance */
  tone?: 'professional' | 'friendly' | 'casual' | 'educational';
}

// ============================================================================
// TEXT PROCESSING TYPES
// ============================================================================

export interface ProcessedText {
  /** Original input text */
  original: string;
  /** Processed text optimized for TTS */
  processed: string;
  /** Transformations applied */
  transformations: string[];
  /** Estimated speaking duration in seconds */
  estimatedDuration: number;
}

// ============================================================================
// CACHE TYPES
// ============================================================================

export interface TTSCacheEntry {
  audioUrl: string;
  duration: number;
  format: AudioFormat;
  voice: OpenAIVoice;
  createdAt: number;
  expiresAt: number;
}
