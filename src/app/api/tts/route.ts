/**
 * TTS API Route
 *
 * POST /api/tts - Generate speech from text
 *
 * SECURITY: Requires authenticated user to prevent API abuse
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withAuth } from '@/server/middleware/with-protection';
import {
  generateSpeech,
  isOpenAITTSAvailable,
  TTSRequest,
  OpenAIVoice,
  AudioFormat,
} from '@/server/services/tts';

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

interface TTSAPIRequest {
  text: string;
  brandId?: string;
  voice?: OpenAIVoice;
  speed?: number;
  format?: AudioFormat;
  useHD?: boolean;
}

function validateRequest(body: unknown): TTSAPIRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const { text, brandId, voice, speed, format, useHD } = body as Record<string, unknown>;

  if (!text || typeof text !== 'string') {
    throw new Error('text is required and must be a string');
  }

  if (text.length > 4096) {
    throw new Error('text must be 4096 characters or less');
  }

  if (text.length < 1) {
    throw new Error('text must not be empty');
  }

  // Validate voice
  const validVoices: OpenAIVoice[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  if (voice && !validVoices.includes(voice as OpenAIVoice)) {
    throw new Error(`voice must be one of: ${validVoices.join(', ')}`);
  }

  // Validate speed
  if (speed !== undefined) {
    const speedNum = Number(speed);
    if (isNaN(speedNum) || speedNum < 0.25 || speedNum > 4.0) {
      throw new Error('speed must be between 0.25 and 4.0');
    }
  }

  // Validate format
  const validFormats: AudioFormat[] = ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'];
  if (format && !validFormats.includes(format as AudioFormat)) {
    throw new Error(`format must be one of: ${validFormats.join(', ')}`);
  }

  return {
    text,
    brandId: typeof brandId === 'string' ? brandId : undefined,
    voice: voice as OpenAIVoice | undefined,
    speed: typeof speed === 'number' ? speed : undefined,
    format: format as AudioFormat | undefined,
    useHD: typeof useHD === 'boolean' ? useHD : undefined,
  };
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST /api/tts - Generate speech from text
 *
 * SECURITY: Protected by withAuth - requires valid session cookie
 * This prevents unauthorized API abuse and cost attacks
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    // Check if TTS is available
    if (!isOpenAITTSAvailable()) {
      return NextResponse.json(
        { error: 'TTS service is not configured' },
        { status: 503 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validatedRequest = validateRequest(body);

    logger.info(`[TTS API] Generating speech for ${validatedRequest.text.length} chars`);

    // Generate speech
    const ttsRequest: TTSRequest = {
      text: validatedRequest.text,
      brandId: validatedRequest.brandId,
      voice: validatedRequest.voice,
      speed: validatedRequest.speed,
      format: validatedRequest.format,
      useHD: validatedRequest.useHD,
    };

    const result = await generateSpeech(ttsRequest);

    return NextResponse.json({
      success: true,
      audioUrl: result.audioUrl,
      duration: result.duration,
      format: result.format,
      cached: result.cached,
      metadata: result.metadata,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[TTS API] Error: ${message}`);

    // Determine status code
    const statusCode = message.includes('required') || message.includes('must be')
      ? 400
      : 500;

    return NextResponse.json(
      { error: message },
      { status: statusCode }
    );
  }
});

// Health check
export async function GET() {
  const available = isOpenAITTSAvailable();

  return NextResponse.json({
    service: 'tts',
    available,
    voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
    maxTextLength: 4096,
  });
}
